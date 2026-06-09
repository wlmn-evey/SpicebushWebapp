import { describe, expect, it } from 'vitest';
import {
  blogPageHref,
  categoryHref,
  isCanonicalTaxonomyParam,
  parseBlogPageParam,
  tagHref
} from './blog-routes';

describe('blogPageHref', () => {
  it('collapses page 1 (and anything <2) to /blog, never /blog/page/1 (R3-F19)', () => {
    expect(blogPageHref(1)).toBe('/blog');
    expect(blogPageHref(0)).toBe('/blog');
    expect(blogPageHref(-3)).toBe('/blog');
    expect(blogPageHref(1.5)).toBe('/blog');
  });

  it('builds /blog/page/[n] for n>=2', () => {
    expect(blogPageHref(2)).toBe('/blog/page/2');
    expect(blogPageHref(10)).toBe('/blog/page/10');
  });
});

describe('parseBlogPageParam (R3-F19)', () => {
  it("redirects '1' to /blog (page 1 is the index, never a self-canonical duplicate)", () => {
    expect(parseBlogPageParam('1')).toEqual({ kind: 'redirect' });
  });

  it('accepts a clean integer >=2 as a page to render', () => {
    expect(parseBlogPageParam('2')).toEqual({ kind: 'page', n: 2 });
    expect(parseBlogPageParam('42')).toEqual({ kind: 'page', n: 42 });
  });

  it('rejects non-integer, out-of-domain, and leading-zero forms as invalid (404)', () => {
    for (const bad of ['0', '-1', '1.5', '02', '2a', 'abc', '', ' 2', '2 ', undefined]) {
      expect(parseBlogPageParam(bad), `"${bad}"`).toEqual({ kind: 'invalid' });
    }
  });
});

describe('categoryHref / tagHref', () => {
  it('slugify the label into the canonical path segment', () => {
    expect(categoryHref('Cosmic Curriculum')).toBe('/blog/category/cosmic-curriculum');
    expect(categoryHref('Special Needs')).toBe('/blog/category/special-needs');
    expect(tagHref('ADHD')).toBe('/blog/tag/adhd');
    expect(tagHref('positive behavior support')).toBe('/blog/tag/positive-behavior-support');
  });
});

describe('isCanonicalTaxonomyParam', () => {
  it('accepts an already-canonical slug (what categoryHref/tagHref emit)', () => {
    expect(isCanonicalTaxonomyParam('education')).toBe(true);
    expect(isCanonicalTaxonomyParam('cosmic-curriculum')).toBe(true);
    expect(isCanonicalTaxonomyParam('special-needs')).toBe(true);
  });

  it('rejects every non-canonical form (so only ONE indexable URL per taxonomy renders)', () => {
    // Capitalization, spaces, hyphen noise, empty, and injection-shaped params all 404.
    for (const bad of [
      'Education', // capital
      'Cosmic Curriculum', // space
      'play--time', // double hyphen
      '-edge-', // leading/trailing hyphen
      'café', // un-folded accent
      '', // empty
      '../admin', // traversal-shaped
      undefined
    ]) {
      expect(isCanonicalTaxonomyParam(bad), `"${bad}"`).toBe(false);
    }
  });

  it('round-trips: every href the app emits has a canonical param', () => {
    for (const label of ['Education', 'Cosmic Curriculum', 'ADHD', 'Special Needs', 'Nature']) {
      const slug = categoryHref(label).split('/').pop()!;
      expect(isCanonicalTaxonomyParam(slug), label).toBe(true);
    }
  });
});
