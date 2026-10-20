import { describe, expect, it } from 'vitest';
import {
  IMAGE_SCHEME_REGEX,
  IMAGE_URL_PATTERN_ATTR,
  SLUG_PATTERN_ATTR,
  isSanitizerSafeHref,
  isValidImageAlt,
  normalizeEditorUrl,
  validateBlogFormSnapshot,
  type BlogFormSnapshot
} from './blog-editor-validation';
import { renderBodyHtml } from './blog-html';

// Built at runtime so the no-script-url lint rule doesn't flag the hostile fixture.
const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

/** Compile a `pattern` attribute exactly as browsers do: anchored, with the `v` flag. */
const compilePattern = (pattern: string): RegExp => new RegExp(`^(?:${pattern})$`, 'v');

describe('HTML pattern attributes compile under the v flag (browsers silently drop invalid ones)', () => {
  it('the old patterns were invalid under v — regression guard for the bug', () => {
    expect(() => compilePattern('[a-z0-9-_]+')).toThrow();
    expect(() => compilePattern(String.raw`(/(?![/\\]).*|https://.*)`)).toThrow();
  });

  it('SLUG_PATTERN_ATTR compiles and enforces the slug charset', () => {
    const re = compilePattern(SLUG_PATTERN_ATTR);
    for (const ok of ['hello-world', 'a_b-1', 'x']) expect(re.test(ok)).toBe(true);
    for (const bad of ['Hello', 'a b', 'a.b', 'a/b', '']) expect(re.test(bad)).toBe(false);
  });

  it('IMAGE_URL_PATTERN_ATTR compiles and agrees with the server IMAGE_SCHEME_REGEX', () => {
    const re = compilePattern(IMAGE_URL_PATTERN_ATTR);
    for (const value of [
      '/media/a.jpg',
      'https://cdn.example.com/a.jpg',
      '//evil.com/a.jpg',
      '/\\evil.com',
      'http://example.com/a.jpg',
      'media/a.jpg',
      SCRIPT_URL
    ]) {
      expect(re.test(value), value).toBe(IMAGE_SCHEME_REGEX.test(value));
    }
  });
});

describe('isValidImageAlt', () => {
  it('requires 6+ chars, not a filename, not a lone generic word', () => {
    expect(isValidImageAlt('Children planting seedlings')).toBe(true);
    expect(isValidImageAlt('short')).toBe(false);
    expect(isValidImageAlt('IMG_0042.jpg')).toBe(false);
    expect(isValidImageAlt('Picture')).toBe(false);
  });
});

describe('normalizeEditorUrl', () => {
  it('passes sanitizer-safe link addresses through unchanged, with no note', () => {
    for (const url of ['https://example.com', 'mailto:a@b.org', 'tel:+15555550100', '/about']) {
      expect(normalizeEditorUrl(url, 'link')).toEqual({ ok: true, url });
    }
  });

  it('upgrades http://, protocol-relative, and bare hosts to https:// with a visible note', () => {
    const cases: Array<[string, string]> = [
      ['http://example.com/page', 'https://example.com/page'],
      ['HTTP://Example.com', 'https://Example.com'],
      ['//example.com/x', 'https://example.com/x'],
      ['example.com', 'https://example.com'],
      ['www.example.org/path?q=1#top', 'https://www.example.org/path?q=1#top']
    ];
    for (const [input, expected] of cases) {
      const result = normalizeEditorUrl(`  ${input} `, 'link');
      expect(result.ok, input).toBe(true);
      if (result.ok) {
        expect(result.url).toBe(expected);
        expect(result.note).toContain(expected);
        // The upgraded address survives the real render-time sanitizer.
        expect(renderBodyHtml(`<p><a href="${result.url}">x</a></p>`)).toContain(
          `href="${result.url}"`
        );
      }
    }
  });

  it('rejects addresses the sanitizer would strip', () => {
    for (const url of [
      SCRIPT_URL,
      'data:text/html,x',
      'ftp://x.org',
      'page.html',
      'images/x.png',
      'photo.jpg',
      '/\\evil.com'
    ]) {
      const result = normalizeEditorUrl(url, 'link');
      expect(result.ok, url).toBe(false);
    }
    expect(normalizeEditorUrl('   ', 'link').ok).toBe(false);
  });

  it('images: only https or site-relative; mailto/tel are not images', () => {
    expect(normalizeEditorUrl('/media/a.jpg', 'image')).toEqual({ ok: true, url: '/media/a.jpg' });
    expect(normalizeEditorUrl('http://cdn.x.org/a.jpg', 'image')).toMatchObject({
      ok: true,
      url: 'https://cdn.x.org/a.jpg'
    });
    expect(normalizeEditorUrl('mailto:a@b.org', 'image').ok).toBe(false);
    expect(normalizeEditorUrl('data:image/png;base64,AAAA', 'image').ok).toBe(false);
  });

  it('isSanitizerSafeHref is the sanitizer rule itself', () => {
    expect(isSanitizerSafeHref('http://example.com')).toBe(false);
    expect(renderBodyHtml('<p><a href="http://example.com">x</a></p>')).not.toContain('href=');
  });
});

describe('validateBlogFormSnapshot', () => {
  const NOW = Date.parse('2026-10-20T12:00:00Z');
  const base: BlogFormSnapshot = {
    status: 'published',
    slug: null,
    image: '',
    imageAlt: '',
    body: '<p>Body</p>',
    publishedAt: ''
  };

  it('accepts a clean publish', () => {
    expect(validateBlogFormSnapshot(base, NOW)).toBeNull();
  });

  it('checks the slug only when editable', () => {
    expect(validateBlogFormSnapshot({ ...base, slug: 'Bad Slug' }, NOW)).toMatch(/Web address/);
    expect(validateBlogFormSnapshot({ ...base, slug: '2026-01-01-x' }, NOW)).toMatch(/date/);
    expect(validateBlogFormSnapshot({ ...base, slug: 'good-slug' }, NOW)).toBeNull();
  });

  it('featured image: scheme + description quality on any status; presence only when publishing', () => {
    expect(
      validateBlogFormSnapshot({ ...base, status: 'draft', image: 'http://x.org/a.jpg' }, NOW)
    ).toMatch(/Featured image address/);
    expect(
      validateBlogFormSnapshot(
        { ...base, status: 'draft', image: '/a.jpg', imageAlt: 'photo.png' },
        NOW
      )
    ).toMatch(/Featured image description/);
    expect(validateBlogFormSnapshot({ ...base, status: 'draft', image: '/a.jpg' }, NOW)).toBeNull();
    expect(validateBlogFormSnapshot({ ...base, image: '/a.jpg' }, NOW)).toMatch(
      /featured image description/
    );
  });

  it('body images: every <img> needs a quality alt when publishing (drafts exempt)', () => {
    const body = '<p>x</p><img src="/a.jpg" alt="Kids reading outside"><img src="/b.jpg">';
    expect(validateBlogFormSnapshot({ ...base, body }, NOW)).toMatch(/Every image/);
    expect(validateBlogFormSnapshot({ ...base, status: 'draft', body }, NOW)).toBeNull();
  });

  it('scheduled: a past go-live time is rejected, a future one passes', () => {
    const scheduled = { ...base, status: 'scheduled' };
    expect(
      validateBlogFormSnapshot({ ...scheduled, publishedAt: '2026-10-20T11:00:00.000Z' }, NOW)
    ).toMatch(/in the past/);
    expect(
      validateBlogFormSnapshot({ ...scheduled, publishedAt: '2026-10-21T11:00:00.000Z' }, NOW)
    ).toBeNull();
  });
});
