import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCollectionMock, getEntryMock, queryRowsMock } = vi.hoisted(() => ({
  getCollectionMock: vi.fn(),
  getEntryMock: vi.fn(),
  queryRowsMock: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: {
    content: {
      getCollection: getCollectionMock,
      getEntry: getEntryMock
    }
  }
}));

vi.mock('@lib/db/client', () => ({
  queryRows: queryRowsMock
}));

import type { ContentEntry } from '@lib/db/types';
import {
  blogPostToEditData,
  compareBlogPosts,
  computeReadingTime,
  escapeXml,
  getManagedBlogPosts,
  getPublishedPosts,
  normalizeBlogData,
  normalizeBlogEntry,
  renderBlogSitemapXml,
  renderPostBody,
  resolveLegacyBlogRedirect,
  validateBlogData,
  type BlogPost
} from './blog-content';

const makeEntry = (
  slug: string,
  data: Record<string, unknown>,
  body = 'Body text'
): ContentEntry => ({
  id: slug,
  slug,
  collection: 'blog',
  data,
  body
});

const completeData = {
  title: 'Garden Day',
  date: '2024-10-29',
  excerpt: 'A day in the garden',
  author: 'Ms. Rivera',
  image: 'https://cdn.example.com/garden.png',
  imageAlt: 'Children planting seedlings',
  seoTitle: 'Garden Day SEO',
  seoDescription: 'Garden Day description'
};

const makePost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
  slug: 'a-post',
  title: 'A Post',
  date: '2024-01-01',
  author: 'Spicebush Team',
  excerpt: 'An excerpt',
  body: 'Body',
  status: 'published',
  ...overrides
});

beforeEach(() => {
  getCollectionMock.mockReset();
  getEntryMock.mockReset();
  queryRowsMock.mockReset();
});

describe('normalizeBlogEntry', () => {
  it('maps a complete row to a BlogPost', () => {
    const post = normalizeBlogEntry(makeEntry('garden-day', completeData, 'Hello world'));
    expect(post).toEqual({
      slug: 'garden-day',
      title: 'Garden Day',
      date: '2024-10-29',
      author: 'Ms. Rivera',
      excerpt: 'A day in the garden',
      body: 'Hello world',
      image: 'https://cdn.example.com/garden.png',
      imageAlt: 'Children planting seedlings',
      seoTitle: 'Garden Day SEO',
      seoDescription: 'Garden Day description',
      status: 'published',
      readingTime: 1
    });
  });

  it('defaults author and leaves optionals undefined when missing', () => {
    const post = normalizeBlogEntry(
      makeEntry('minimal', { title: 'T', date: '2024-01-01', excerpt: 'E' })
    );
    expect(post?.author).toBe('Spicebush Team');
    expect(post?.image).toBeUndefined();
    expect(post?.imageAlt).toBeUndefined();
    expect(post?.seoTitle).toBeUndefined();
    expect(post?.seoDescription).toBeUndefined();
  });

  it('tolerates garbage data without throwing', () => {
    const post = normalizeBlogEntry({
      id: 'x',
      slug: 'x',
      collection: 'blog',
      data: { title: 123, date: {}, excerpt: [] } as unknown as Record<string, unknown>,
      body: 'b'
    });
    // Non-string title/date/excerpt coerce to '' and are treated as missing → skipped.
    expect(post).toBeNull();
  });

  it('reads title from data.title (title-column override already merged)', () => {
    const post = normalizeBlogEntry(
      makeEntry('p', { title: 'Title From Data', date: '2024-01-01', excerpt: 'E' })
    );
    expect(post?.title).toBe('Title From Data');
  });

  it('skips rows missing title, date, or excerpt', () => {
    expect(normalizeBlogEntry(makeEntry('p', { date: '2024-01-01', excerpt: 'E' }))).toBeNull();
    expect(normalizeBlogEntry(makeEntry('p', { title: 'T', excerpt: 'E' }))).toBeNull();
    expect(normalizeBlogEntry(makeEntry('p', { title: 'T', date: '2024-01-01' }))).toBeNull();
  });

  it('skips a row whose slug fails ^[a-z0-9-_]{1,100}$ (R1-F1)', () => {
    expect(
      normalizeBlogEntry(makeEntry('Bad Slug!', { title: 'T', date: '2024-01-01', excerpt: 'E' }))
    ).toBeNull();
    expect(
      normalizeBlogEntry(
        makeEntry('a'.repeat(101), { title: 'T', date: '2024-01-01', excerpt: 'E' })
      )
    ).toBeNull();
  });

  it("coerces '' optionals to undefined (R2-F20)", () => {
    const post = normalizeBlogEntry(
      makeEntry('p', {
        title: 'T',
        date: '2024-01-01',
        excerpt: 'E',
        image: '',
        imageAlt: '',
        seoTitle: '',
        seoDescription: ''
      })
    );
    expect(post?.image).toBeUndefined();
    expect(post?.imageAlt).toBeUndefined();
    expect(post?.seoTitle).toBeUndefined();
    expect(post?.seoDescription).toBeUndefined();
  });

  it('nulls data.image failing the backslash-aware scheme regex (R2-F7/F1/R3-F2)', () => {
    for (const bad of ['/\\evil.com/x.png', '//evil.com/x.png', 'http://insecure/x.png']) {
      const post = normalizeBlogEntry(
        makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E', image: bad })
      );
      expect(post?.image).toBeUndefined();
    }
  });

  it('keeps a valid https or single-slash site-relative image', () => {
    const https = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E', image: 'https://ok/x.png' })
    );
    expect(https?.image).toBe('https://ok/x.png');
    const relative = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E', image: '/img/x.png' })
    );
    expect(relative?.image).toBe('/img/x.png');
  });

  // #84 / R1-F15: categories & tags must be surfaced so the edit form can carry them through.
  it('surfaces data.categories / data.tags as string arrays', () => {
    const post = normalizeBlogEntry(
      makeEntry('p', {
        title: 'T',
        date: '2024-01-01',
        excerpt: 'E',
        categories: ['Montessori', 'Parenting'],
        tags: ['toddlers', 'play']
      })
    );
    expect(post?.categories).toEqual(['Montessori', 'Parenting']);
    expect(post?.tags).toEqual(['toddlers', 'play']);
  });

  it('leaves categories / tags undefined when absent, empty, or non-array', () => {
    const absent = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E' })
    );
    expect(absent?.categories).toBeUndefined();
    expect(absent?.tags).toBeUndefined();

    const empty = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E', categories: [], tags: [] })
    );
    expect(empty?.categories).toBeUndefined();
    expect(empty?.tags).toBeUndefined();

    const garbage = normalizeBlogEntry(
      makeEntry('p', {
        title: 'T',
        date: '2024-01-01',
        excerpt: 'E',
        categories: 'not-an-array',
        tags: [123, null]
      } as unknown as Record<string, unknown>)
    );
    expect(garbage?.categories).toBeUndefined();
    expect(garbage?.tags).toBeUndefined();
  });
});

// #84 / R1-F15: the edit form's baseDataJson MUST carry categories/tags (no form input exists),
// or the wholesale `data = EXCLUDED.data` upsert silently drops them on every edit.
describe('blogPostToEditData', () => {
  it('includes categories / tags when the post carries them', () => {
    const data = blogPostToEditData(
      makePost({ categories: ['Montessori', 'Parenting'], tags: ['toddlers'] })
    );
    expect(data.categories).toEqual(['Montessori', 'Parenting']);
    expect(data.tags).toEqual(['toddlers']);
  });

  it('omits categories / tags (undefined → dropped by JSON.stringify) when absent', () => {
    const data = blogPostToEditData(makePost());
    expect(data.categories).toBeUndefined();
    expect(data.tags).toBeUndefined();
    const roundTripped = JSON.parse(JSON.stringify(data));
    expect('categories' in roundTripped).toBe(false);
    expect('tags' in roundTripped).toBe(false);
  });

  it('round-trips categories/tags through JSON without loss', () => {
    const post = makePost({ categories: ['a', 'b', 'c'], tags: ['x'] });
    const roundTripped = JSON.parse(JSON.stringify(blogPostToEditData(post)));
    expect(roundTripped.categories).toEqual(['a', 'b', 'c']);
    expect(roundTripped.tags).toEqual(['x']);
  });
});

describe('computeReadingTime', () => {
  it('returns 0 for an empty, whitespace-only, or non-string body', () => {
    expect(computeReadingTime('')).toBe(0);
    expect(computeReadingTime('   \n  ')).toBe(0);
    expect(computeReadingTime(undefined)).toBe(0);
    expect(computeReadingTime(123 as unknown as string)).toBe(0);
  });

  it('rounds up to whole minutes at 200 wpm with a floor of 1', () => {
    expect(computeReadingTime('one two three')).toBe(1); // 3 words → 1 min
    expect(computeReadingTime(Array.from({ length: 200 }, () => 'w').join(' '))).toBe(1); // exactly 200 → 1
    expect(computeReadingTime(Array.from({ length: 201 }, () => 'w').join(' '))).toBe(2); // 201 → 2
    expect(computeReadingTime(Array.from({ length: 1000 }, () => 'w').join(' '))).toBe(5); // 1000 → 5
  });

  it('strips HTML tags so markup is not counted as words', () => {
    // 3 real words wrapped in tags → still 1 min, and the tags add no word count.
    expect(computeReadingTime('<p><strong>hello</strong> there <em>world</em></p>')).toBe(1);
  });
});

describe('reading time surfacing (R-readingTime)', () => {
  it('prefers a stored data.readingTime over recomputation', () => {
    const post = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E', readingTime: 7 }, 'short body')
    );
    expect(post?.readingTime).toBe(7);
  });

  it('computes readingTime from the body when none is stored', () => {
    const body = Array.from({ length: 400 }, () => 'word').join(' '); // 400 words → 2 min
    const post = normalizeBlogEntry(
      makeEntry('p', { title: 'T', date: '2024-01-01', excerpt: 'E' }, body)
    );
    expect(post?.readingTime).toBe(2);
  });

  it('normalizeBlogData stores a recomputed readingTime on save', () => {
    const out = normalizeBlogData({
      body: Array.from({ length: 600 }, () => 'word').join(' '), // 600 words → 3 min
      readingTime: 99 // stale incoming value is overwritten
    });
    expect(out.readingTime).toBe(3);
  });
});

describe('compareBlogPosts', () => {
  it('sorts date DESC, slug DESC tiebreak, undated last (R3-F18)', () => {
    const posts = [
      makePost({ slug: 'old', date: '2023-01-01' }),
      makePost({ slug: 'undated', date: '' }),
      makePost({ slug: 'new', date: '2025-01-01' }),
      makePost({ slug: 'mid-a', date: '2024-10-29' }),
      makePost({ slug: 'mid-b', date: '2024-10-29' })
    ];
    const sorted = [...posts].sort(compareBlogPosts).map(p => p.slug);
    // Same-date pair (mid-a, mid-b) deterministic by slug DESC → mid-b before mid-a.
    expect(sorted).toEqual(['new', 'mid-b', 'mid-a', 'old', 'undated']);
  });

  it('getPublishedPosts returns normalized + sorted output', async () => {
    getCollectionMock.mockResolvedValueOnce([
      makeEntry('first', { title: 'First', date: '2024-01-01', excerpt: 'E' }),
      makeEntry('second', { title: 'Second', date: '2025-01-01', excerpt: 'E' }),
      makeEntry('Bad Slug!', { title: 'Skip', date: '2024-01-01', excerpt: 'E' })
    ]);
    const posts = await getPublishedPosts();
    expect(posts.map(p => p.slug)).toEqual(['second', 'first']);
    expect(getCollectionMock).toHaveBeenCalledWith('blog');
  });
});

describe('renderPostBody — happy path + heading clamp', () => {
  it('renders headings, paragraphs, links, images, formatting, lists, blockquote, code, GFM table', () => {
    const md = [
      '## Heading',
      '',
      'A paragraph with **bold** and *italic* and a [link](https://e.com).',
      '',
      '![alt text here](https://e.com/i.png)',
      '',
      '- one',
      '- two',
      '',
      '> a quote',
      '',
      '`inline code`',
      '',
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |'
    ].join('\n');
    const html = renderPostBody(md);
    expect(html).toContain('<h2>Heading</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<a href="https://e.com">link</a>');
    expect(html).toContain('<img src="https://e.com/i.png" alt="alt text here">');
    expect(html).toContain('<ul>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<code>inline code</code>');
    expect(html).toContain('<table>');
  });

  it('demotes body h1 → h2', () => {
    expect(renderPostBody('# Title')).toContain('<h2>Title</h2>');
    expect(renderPostBody('# Title')).not.toContain('<h1>');
  });

  it('clamps heading skips: ## then #### → h2, h3; first ### → h2', () => {
    const html = renderPostBody('## A\n\n#### B');
    expect(html).toContain('<h2>A</h2>');
    expect(html).toContain('<h3>B</h3>');
    expect(html).not.toContain('<h4>');
    expect(renderPostBody('### First')).toContain('<h2>First</h2>');
  });

  it('emits NO ids on headings (R4-F6)', () => {
    expect(renderPostBody('## My Heading')).not.toContain('id=');
  });

  it('uses a per-call previousDepth — second call clamps from a fresh depth (R4-F22)', () => {
    const first = renderPostBody('## A\n\n### B');
    expect(first).toContain('<h2>A</h2>');
    expect(first).toContain('<h3>B</h3>');
    // A fresh call must clamp its first ### to h2, not continue the prior call's depth.
    const second = renderPostBody('### First');
    expect(second).toContain('<h2>First</h2>');
    expect(second).not.toContain('<h3>');
  });

  it('returns empty string for empty/undefined body', () => {
    expect(renderPostBody('')).toBe('');
    expect(renderPostBody(undefined as unknown as string)).toBe('');
  });
});

describe('renderPostBody — URI / XSS matrix', () => {
  it('strips dangerous and disallowed URI schemes', () => {
    // eslint-disable-next-line no-script-url -- intentional XSS test vector
    expect(renderPostBody('[x](javascript:alert(1))')).not.toContain('javascript:');
    expect(renderPostBody('[x](data:text/html,evil)')).not.toContain('data:');
    expect(renderPostBody('[x](//evil.com)')).not.toContain('//evil.com');
    // Backslash form: never becomes protocol-relative `//evil.com`. The backslash is
    // percent-encoded (`%5C`), yielding a harmless same-origin path — not an off-site link.
    expect(renderPostBody('[x](/\\evil.com/x)')).not.toContain('//evil.com');
    expect(renderPostBody('[x](/\\evil.com/x)')).not.toContain('href="/\\');
    expect(renderPostBody('![x](/\\evil.com/x.png)')).not.toContain('//evil.com');
    expect(renderPostBody('[x](http://insecure/p)')).not.toContain('http://insecure');
    expect(renderPostBody('![x](http://insecure/x.png)')).not.toContain('http://insecure');
    // relative non-slash path stripped
    expect(renderPostBody('![x](images/x.png)')).not.toContain('images/x.png');
    // fragment-only stripped (R4-F6)
    expect(renderPostBody('[anchor](#top)')).not.toContain('#top');
    // Positive companions: the safe shell survives (only the dangerous href is dropped),
    // so a mutation that nukes the whole link structure — not just the scheme — is also caught.
    // eslint-disable-next-line no-script-url -- intentional XSS test vector
    expect(renderPostBody('[x](javascript:alert(1))')).toContain('>x<');
    expect(renderPostBody('[anchor](#top)')).toContain('anchor');
  });

  it('normalizes www.-leading hrefs to https (walkTokens, R1-F19)', () => {
    expect(renderPostBody('[text](www.example.com)')).toContain('href="https://www.example.com"');
  });

  it('neutralizes raw inline HTML vectors directly (R4-F2)', () => {
    expect(renderPostBody('<img src=x onerror=alert(1)>')).not.toContain('onerror');
    expect(renderPostBody('<svg onload=alert(1)>')).not.toContain('onload');
    expect(renderPostBody('<svg onload=alert(1)></svg>')).not.toContain('<svg');
    expect(renderPostBody('<iframe src="https://e.com"></iframe>')).not.toContain('<iframe');
    expect(renderPostBody('<a href="jAvAsCrIpT:alert(1)">x</a>')).not.toMatch(/javascript:/i);
    // mXSS-style payload: the string `onerror=` survives only inertly inside a quoted `title`
    // attribute value. Parse the real DOM to prove no executable <img>/<noscript>/<script>
    // element exists and no element actually carries an onerror handler.
    const mxss = renderPostBody('<noscript><p title="</noscript><img src=x onerror=alert(1)>">');
    const doc = new DOMParser().parseFromString(mxss, 'text/html');
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('noscript')).toBeNull();
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('[onerror]')).toBeNull();
  });

  it('strips data-* and aria-* attributes (pins ALLOW_DATA_ATTR/ALLOW_ARIA_ATTR, R2-F3)', () => {
    // These flags default to true and are evaluated BEFORE the ALLOWED_ATTR allowlist, so
    // setting them false is the only thing keeping data-*/aria-* out — pin both directly.
    expect(renderPostBody('<p data-admin-alert>x</p>')).not.toContain('data-admin-alert');
    expect(renderPostBody('<a aria-hidden="true" href="https://e.com">x</a>')).not.toContain(
      'aria-hidden'
    );
  });

  it('retains NO author id on the public render (R4-F1)', () => {
    expect(renderPostBody('<h2 id="evil-clobber">x</h2>')).not.toContain('evil-clobber');
    expect(renderPostBody('<h2 id="evil-clobber">x</h2>')).not.toContain('id=');
    expect(renderPostBody('<a id="custom-id" href="https://e.com">x</a>')).not.toContain(
      'custom-id'
    );
  });
});

describe('normalizeBlogData', () => {
  it('coerces and trims short fields, defaults author', () => {
    const out = normalizeBlogData({
      date: ' 2024-01-01 ',
      author: '  ',
      image: ' https://e.com/x.png ',
      seoTitle: ' SEO '
    });
    expect(out.date).toBe('2024-01-01');
    expect(out.author).toBe('Spicebush Team');
    expect(out.image).toBe('https://e.com/x.png');
    expect(out.seoTitle).toBe('SEO');
  });

  it('trims body and excerpt (R2-F8 backstop)', () => {
    const out = normalizeBlogData({ body: '\n   Hello world\n  ', excerpt: '  hi  ' });
    expect(out.body).toBe('Hello world');
    expect(out.excerpt).toBe('hi');
  });

  it('deletes blank image/imageAlt/seoTitle/seoDescription/date keys (R2-F20)', () => {
    const out = normalizeBlogData({
      image: '',
      imageAlt: '   ',
      seoTitle: '',
      seoDescription: '',
      date: ''
    });
    expect('image' in out).toBe(false);
    expect('imageAlt' in out).toBe(false);
    expect('seoTitle' in out).toBe(false);
    expect('seoDescription' in out).toBe(false);
    expect('date' in out).toBe(false);
  });

  it('does not mutate the input', () => {
    const input = { author: '' };
    const out = normalizeBlogData(input);
    expect(input.author).toBe('');
    expect(out.author).toBe('Spicebush Team');
  });
});

describe('validateBlogData', () => {
  const validDraft = { slug: 'my-post', excerpt: 'x', body: 'y', date: '2024-01-01' };

  it('rejects missing/empty/whitespace-only rawStatus FIRST (R2-F2)', () => {
    expect(validateBlogData({ ...validDraft }, 'T', undefined)).toBe(
      'Status must be Draft or Published'
    );
    expect(validateBlogData({ ...validDraft }, 'T', '')).toBe('Status must be Draft or Published');
    expect(validateBlogData({ ...validDraft }, 'T', '   ')).toBe(
      'Status must be Draft or Published'
    );
  });

  it('rejects an invalid status value', () => {
    expect(validateBlogData({ ...validDraft }, 'T', 'archived')).toBe(
      'Status must be Draft or Published'
    );
  });

  it('rejects missing title', () => {
    expect(validateBlogData({ ...validDraft }, '', 'draft')).toBe('Title is required');
    expect(validateBlogData({ ...validDraft }, null, 'draft')).toBe('Title is required');
  });

  it('rejects a date-prefixed slug (R2-F19)', () => {
    const error = validateBlogData(
      { slug: '2026-08-01-fall-festival', title: 'x', excerpt: 'y', body: 'z', date: '2026-08-01' },
      'x',
      'published'
    );
    expect(error).toMatch(/date/i);
  });

  it('rejects a malformed slug', () => {
    expect(validateBlogData({ ...validDraft, slug: 'Bad Slug' }, 'T', 'draft')).toMatch(/Address/);
  });

  it('rejects over-cap title/slug/excerpt/body', () => {
    expect(validateBlogData({ ...validDraft }, 'a'.repeat(301), 'draft')).toMatch(/Title/);
    expect(validateBlogData({ ...validDraft, slug: 'a'.repeat(101) }, 'T', 'draft')).toMatch(
      /Address/
    );
    expect(validateBlogData({ ...validDraft, excerpt: 'a'.repeat(1001) }, 'T', 'draft')).toMatch(
      /Excerpt/
    );
    expect(validateBlogData({ ...validDraft, body: 'a'.repeat(200001) }, 'T', 'draft')).toMatch(
      /Body/
    );
  });

  it('rejects an image URL failing the scheme (R2-F1/R3-F2)', () => {
    for (const bad of [
      // eslint-disable-next-line no-script-url -- intentional XSS test vector
      'javascript:alert(1)',
      'data:image/svg+xml,evil',
      '//evil.com',
      'http://insecure',
      '/\\evil.com/x.png'
    ]) {
      expect(validateBlogData({ ...validDraft, image: bad }, 'T', 'draft')).toMatch(
        /Featured image/
      );
    }
  });

  it('rejects junk imageAlt quality (R1-F37)', () => {
    const base = { ...validDraft, image: 'https://e.com/x.png' };
    expect(validateBlogData({ ...base, imageAlt: 'Photo' }, 'T', 'draft')).toMatch(/alt/i);
    expect(validateBlogData({ ...base, imageAlt: 'IMG_1234.jpg' }, 'T', 'draft')).toMatch(/alt/i);
    expect(validateBlogData({ ...base, imageAlt: 'short' }, 'T', 'draft')).toMatch(/alt/i);
    expect(
      validateBlogData({ ...base, imageAlt: 'Children planting seedlings' }, 'T', 'draft')
    ).toBeNull();
  });

  it('requires excerpt/body/valid date when publishing', () => {
    expect(
      validateBlogData({ slug: 'p', body: 'y', date: '2024-01-01' }, 'T', 'published')
    ).toMatch(/Excerpt/);
    expect(
      validateBlogData({ slug: 'p', excerpt: 'x', date: '2024-01-01' }, 'T', 'published')
    ).toMatch(/Body/);
    expect(validateBlogData({ slug: 'p', excerpt: 'x', body: 'y' }, 'T', 'published')).toMatch(
      /date/i
    );
    expect(
      validateBlogData({ slug: 'p', excerpt: 'x', body: 'y', date: 'not-a-date' }, 'T', 'published')
    ).toMatch(/date/i);
    expect(
      validateBlogData({ slug: 'p', excerpt: 'x', body: 'y', date: '2024-13-40' }, 'T', 'published')
    ).toMatch(/date/i);
  });

  it('requires imageAlt when publishing with an image', () => {
    expect(
      validateBlogData(
        { slug: 'p', excerpt: 'x', body: 'y', date: '2024-01-01', image: 'https://e.com/x.png' },
        'T',
        'published'
      )
    ).toMatch(/alt/i);
  });

  it('rejects body images without quality alt at publish, accepts good alt (R2-F26)', () => {
    const base = { slug: 'p', excerpt: 'x', date: '2024-01-01' };
    expect(validateBlogData({ ...base, body: '![](x)' }, 'T', 'published')).toMatch(/body/i);
    expect(validateBlogData({ ...base, body: '![photo](x)' }, 'T', 'published')).toMatch(/body/i);
    expect(
      validateBlogData({ ...base, body: '![Children planting seedlings](x)' }, 'T', 'published')
    ).toBeNull();
  });

  it('exempts drafts from body-image alt rules', () => {
    expect(
      validateBlogData({ slug: 'p', excerpt: 'x', body: '![](x)', date: '' }, 'T', 'draft')
    ).toBeNull();
  });

  it('accepts blank-SEO and imageless publish (R2-F20)', () => {
    expect(
      validateBlogData({ slug: 'p', excerpt: 'x', body: 'y', date: '2024-01-01' }, 'T', 'published')
    ).toBeNull();
  });
});

describe('getManagedBlogPosts', () => {
  it('issues SQL with NO status filter and includes stray-status rows (R1-F9)', async () => {
    queryRowsMock.mockResolvedValueOnce([
      {
        id: '1',
        slug: 'published-post',
        title: 'Published',
        status: 'published',
        data: { date: '2024-01-01', excerpt: 'E' }
      },
      {
        id: '2',
        slug: 'draft-post',
        title: 'Draft',
        status: 'draft',
        data: { date: '2025-01-01', excerpt: 'E' }
      },
      {
        id: '3',
        slug: 'weird-post',
        title: 'Weird',
        status: 'archived',
        data: { date: '2023-01-01', excerpt: 'E' }
      }
    ]);

    const posts = await getManagedBlogPosts();
    const sqlArg = queryRowsMock.mock.calls[0][0] as string;
    expect(sqlArg).not.toContain("status = 'published'");
    expect(sqlArg).not.toMatch(/status\s*=/);
    expect(posts.map(p => p.status)).toEqual(['draft', 'published', 'archived']);
    // Ordering applied: date DESC → draft(2025), published(2024), weird(2023).
    expect(posts.map(p => p.slug)).toEqual(['draft-post', 'published-post', 'weird-post']);
  });

  it('surfaces a bare title-only draft the write path accepts (F1)', async () => {
    // validateBlogData exempts drafts from date/excerpt, so a title-only draft is a valid
    // save. The admin list must show it (author visibility) — unlike the public path, which
    // drops rows missing date/excerpt. It carries the undated-last position in the ordering.
    queryRowsMock.mockResolvedValueOnce([
      { id: '1', slug: 'bare-draft', title: 'Bare Draft', status: 'draft', data: {} },
      {
        id: '2',
        slug: 'published-post',
        title: 'Published',
        status: 'published',
        data: { date: '2024-01-01', excerpt: 'E' }
      }
    ]);

    const posts = await getManagedBlogPosts();
    expect(posts.map(p => p.slug)).toEqual(['published-post', 'bare-draft']); // undated last
    const bare = posts.find(p => p.slug === 'bare-draft');
    expect(bare).toBeDefined();
    expect(bare?.status).toBe('draft');
    expect(bare?.date).toBe('');
    expect(bare?.excerpt).toBe('');
  });

  it('still drops a row with no usable title (structural floor)', async () => {
    queryRowsMock.mockResolvedValueOnce([
      { id: '1', slug: 'no-title', title: null, status: 'draft', data: {} }
    ]);
    expect(await getManagedBlogPosts()).toEqual([]);
  });
});

describe('escapeXml + renderBlogSitemapXml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });

  it('renders exact slashless <loc> strings, no trailing-slash variant (R2-F17)', () => {
    const xml = renderBlogSitemapXml(
      [makePost({ slug: 'first' }), makePost({ slug: 'second' })],
      'https://spicebushmontessori.org'
    );
    expect(xml).toContain('<loc>https://spicebushmontessori.org/blog</loc>');
    expect(xml).toContain('<loc>https://spicebushmontessori.org/blog/first</loc>');
    expect(xml).toContain('<loc>https://spicebushmontessori.org/blog/second</loc>');
    expect(xml).not.toContain('<loc>https://spicebushmontessori.org/blog/</loc>');
    expect(xml).not.toContain('/blog/first/</loc>');
  });
});

describe('resolveLegacyBlogRedirect', () => {
  it('returns the stripped slug when the date-prefixed target is published', async () => {
    getEntryMock.mockResolvedValueOnce({
      id: 'clean',
      slug: 'clean',
      collection: 'blog',
      data: { title: 'T', date: '2024-05-20', excerpt: 'E' },
      body: 'b'
    });
    expect(await resolveLegacyBlogRedirect('2024-05-20-clean')).toBe('clean');
    expect(getEntryMock).toHaveBeenCalledWith('blog', 'clean');
  });

  it('returns null for a date-prefixed miss', async () => {
    getEntryMock.mockResolvedValueOnce(null);
    expect(await resolveLegacyBlogRedirect('2024-01-01-nonexistent')).toBeNull();
  });

  // At this layer a draft and a miss are indistinguishable: db.content.getEntry already
  // filters drafts in SQL, so both surface as `null`. This pins the null-passthrough contract
  // (no 301 emitted when getPublishedPost resolves to null); the draft-exclusion guarantee
  // itself is pinned by the SQL-string assertion in db/__tests__/content.test.ts (R1-F41).
  it('returns null when getPublishedPost resolves to null (miss or SQL-filtered draft)', async () => {
    getEntryMock.mockResolvedValueOnce(null);
    expect(await resolveLegacyBlogRedirect('2099-01-01-secret-draft')).toBeNull();
  });

  it('returns null for a non-date-prefixed slug without querying', async () => {
    expect(await resolveLegacyBlogRedirect('regular-slug')).toBeNull();
    expect(getEntryMock).not.toHaveBeenCalled();
  });
});
