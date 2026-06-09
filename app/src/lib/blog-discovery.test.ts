import { describe, expect, it } from 'vitest';
import type { BlogPost } from './blog-content';
import {
  BLOG_PAGE_SIZE,
  CATEGORY_INDEX_THRESHOLD,
  buildTaxonomy,
  findTaxonomy,
  getRelatedPosts,
  indexableCategories,
  paginate,
  taxonomySlug
} from './blog-discovery';

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

describe('taxonomySlug', () => {
  it('lowercases, hyphenates spaces, strips to [a-z0-9-], collapses + trims hyphens', () => {
    expect(taxonomySlug('Montessori Method')).toBe('montessori-method');
    expect(taxonomySlug('  Cosmic   Curriculum!! ')).toBe('cosmic-curriculum');
    expect(taxonomySlug('ADHD & Neurodiversity')).toBe('adhd-neurodiversity');
    expect(taxonomySlug('--Edge--')).toBe('edge');
  });

  it('NFKD-folds accents and fullwidth so they slugify to base Latin', () => {
    expect(taxonomySlug('Café Montessori')).toBe('cafe-montessori'); // é → e
    expect(taxonomySlug('Crème')).toBe('creme');
    expect(taxonomySlug('Ｐｌａｙ')).toBe('play'); // fullwidth → ASCII
  });

  it('returns empty for unusable / non-string / non-Latin-only input', () => {
    expect(taxonomySlug('')).toBe('');
    expect(taxonomySlug('!!!')).toBe('');
    expect(taxonomySlug('日本語')).toBe(''); // no Latin-alphanumeric after folding → dropped
    expect(taxonomySlug('🌱')).toBe('');
    expect(taxonomySlug(undefined)).toBe('');
    expect(taxonomySlug(123 as unknown)).toBe('');
  });
});

describe('buildTaxonomy', () => {
  it('groups variant spellings under one slug, counts members, sorts by count then slug', () => {
    const posts = [
      makePost({ slug: 'a', categories: ['Montessori', 'Gardening'] }),
      makePost({ slug: 'b', categories: ['montessori'] }), // variant → same slug
      makePost({ slug: 'c', categories: ['Gardening'] })
    ];
    const groups = buildTaxonomy(posts, 'categories');
    expect(groups.map(g => g.slug)).toEqual(['gardening', 'montessori']); // both count 2 → slug ASC
    const montessori = groups.find(g => g.slug === 'montessori')!;
    expect(montessori.count).toBe(2);
    expect(montessori.posts.map(p => p.slug)).toEqual(['a', 'b']); // input order preserved
  });

  it('collision rule: display = most frequent raw label, ties alphabetical', () => {
    const posts = [
      makePost({ slug: 'a', categories: ['Montessori'] }),
      makePost({ slug: 'b', categories: ['montessori'] }),
      makePost({ slug: 'c', categories: ['Montessori'] }) // "Montessori" x2 > "montessori" x1
    ];
    expect(buildTaxonomy(posts, 'categories')[0].display).toBe('Montessori');
  });

  it('counts a post once per slug even if it lists two variants of the same slug', () => {
    const posts = [makePost({ slug: 'a', tags: ['Play', 'play', 'PLAY'] })];
    const groups = buildTaxonomy(posts, 'tags');
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
  });

  it('ignores non-array / empty / unusable taxonomy values', () => {
    const posts = [
      makePost({ slug: 'a' }),
      makePost({ slug: 'b', categories: [] }),
      makePost({ slug: 'c', categories: ['!!!', ''] })
    ];
    expect(buildTaxonomy(posts, 'categories')).toEqual([]);
  });
});

describe('indexableCategories (R1-F31 ≥2 threshold)', () => {
  it('keeps only categories with at least the threshold members', () => {
    expect(CATEGORY_INDEX_THRESHOLD).toBe(2);
    const posts = [
      makePost({ slug: 'a', categories: ['Shared', 'Lonely'] }),
      makePost({ slug: 'b', categories: ['Shared'] })
    ];
    const indexable = indexableCategories(posts);
    expect(indexable.map(c => c.slug)).toEqual(['shared']); // "lonely" has 1 member → excluded
  });
});

describe('findTaxonomy', () => {
  const posts = [
    makePost({ slug: 'a', categories: ['Cosmic Curriculum'] }),
    makePost({ slug: 'b', categories: ['Cosmic Curriculum'] })
  ];
  it('resolves a group by (canonicalized) slug', () => {
    const found = findTaxonomy(posts, 'categories', 'Cosmic Curriculum'); // raw label canonicalizes
    expect(found?.slug).toBe('cosmic-curriculum');
    expect(found?.count).toBe(2);
  });
  it('returns null on a miss or unusable slug', () => {
    expect(findTaxonomy(posts, 'categories', 'nope')).toBeNull();
    expect(findTaxonomy(posts, 'categories', '!!!')).toBeNull();
  });
});

describe('paginate (R3-F19 / R4-F10)', () => {
  const make = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

  it('the 6-post corpus is a single page with the default size ≥10 — no prev/next', () => {
    expect(BLOG_PAGE_SIZE).toBeGreaterThanOrEqual(10);
    const p = paginate(make(6), 1);
    expect(p.items).toHaveLength(6);
    expect(p.totalPages).toBe(1);
    expect(p.hasPrev).toBe(false);
    expect(p.hasNext).toBe(false);
    expect(p.isValidPage).toBe(true);
  });

  it('splits into pages and reports prev/next at the boundaries', () => {
    const p1 = paginate(make(25), 1, 10);
    expect(p1.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p1.totalPages).toBe(3);
    expect(p1.hasPrev).toBe(false);
    expect(p1.hasNext).toBe(true);

    const p3 = paginate(make(25), 3, 10);
    expect(p3.items).toEqual([21, 22, 23, 24, 25]);
    expect(p3.hasPrev).toBe(true);
    expect(p3.hasNext).toBe(false);
  });

  it('flags an out-of-range or malformed page as invalid (route → 404) but still renders a clamped page', () => {
    expect(paginate(make(25), 4, 10).isValidPage).toBe(false); // > totalPages
    expect(paginate(make(25), 0, 10).isValidPage).toBe(false); // < 1
    expect(paginate(make(25), 1.5, 10).isValidPage).toBe(false); // non-integer
    expect(paginate(make(25), 4, 10).page).toBe(3); // clamped into range for rendering
  });

  it('treats an empty list as one empty page', () => {
    const p = paginate<number>([], 1);
    expect(p.items).toEqual([]);
    expect(p.totalPages).toBe(1);
    expect(p.isValidPage).toBe(true);
  });
});

describe('getRelatedPosts', () => {
  const target = makePost({ slug: 'target', categories: ['Montessori'], tags: ['play'] });
  const all = [
    target,
    makePost({ slug: 'two-overlap', categories: ['Montessori'], tags: ['play'] }), // shared 2
    makePost({ slug: 'one-overlap', categories: ['Montessori'] }), // shared 1
    makePost({ slug: 'no-overlap', categories: ['Gardening'] }) // shared 0 → excluded
  ];

  it('ranks by shared taxonomy count, excludes self and zero-overlap, honors limit', () => {
    const related = getRelatedPosts(target, all, 3).map(p => p.slug);
    expect(related).toEqual(['two-overlap', 'one-overlap']); // no-overlap dropped, self excluded
  });

  it('breaks ties by input (recency) order', () => {
    const tgt = makePost({ slug: 'target', categories: ['X'] });
    const newer = makePost({ slug: 'newer', categories: ['X'] });
    const older = makePost({ slug: 'older', categories: ['X'] });
    // `all` is recency-sorted (newer before older); both share 1 → tie broken by input order.
    const related = getRelatedPosts(tgt, [tgt, newer, older]);
    expect(related.map(p => p.slug)).toEqual(['newer', 'older']);
  });

  it('a post with no taxonomy of its own has no related posts', () => {
    expect(getRelatedPosts(makePost({ slug: 't' }), all)).toEqual([]);
  });

  it('counts DISTINCT shared keys — duplicate/variant labels do not inflate the overlap score', () => {
    const tgt = makePost({ slug: 'tgt', categories: ['Montessori'], tags: ['play'] });
    const distinctTwo = makePost({
      slug: 'distinct-two',
      categories: ['Montessori'],
      tags: ['play']
    }); // 2 distinct
    const dupOne = makePost({
      slug: 'dup-one',
      categories: ['Montessori', 'montessori', 'MONTESSORI']
    }); // still 1
    // distinctTwo (shared 2) must outrank dupOne (shared 1) despite dupOne's three raw entries.
    const related = getRelatedPosts(tgt, [tgt, distinctTwo, dupOne]).map(p => p.slug);
    expect(related).toEqual(['distinct-two', 'dup-one']);
  });
});
