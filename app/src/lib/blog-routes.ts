/**
 * Pure URL/route helpers for the public blog discovery routes (Phase 3 PR2). These build and validate
 * the `/blog`, `/blog/page/[n]`, `/blog/category/[slug]`, `/blog/tag/[slug]` URL contracts. They are
 * view-less and fully unit-testable; the `.astro` routes call them to decide 200 / 301 / 404 and to
 * emit canonical-safe links. Taxonomy slugs go through `taxonomySlug` (blog-discovery) so links here
 * and groups there agree.
 */
import { taxonomySlug } from './blog-discovery';

/**
 * Href for blog index page `n`. Page 1 is `/blog` itself (NOT `/blog/page/1`, which 301s to `/blog`
 * — R3-F19), so the two never coexist as duplicate self-canonicals. `n <= 1` collapses to `/blog`.
 */
export function blogPageHref(n: number): string {
  return Number.isInteger(n) && n >= 2 ? `/blog/page/${n}` : '/blog';
}

export type BlogPageParam =
  | { kind: 'redirect' } // `/blog/page/1` → 301 `/blog`
  | { kind: 'page'; n: number } // a real n>=2 page to paginate
  | { kind: 'invalid' }; // 404 (non-integer, <1, leading zeros, etc.)

/**
 * Classify the `[n]` param of `/blog/page/[n]`. `'1'` redirects to `/blog` (R3-F19 — page 1 is the
 * index, never a self-canonical duplicate). A clean integer ≥2 is a page to render (whether it's in
 * range is `paginate`'s job). Everything else (non-numeric, `'0'`, `'-1'`, `'1.5'`, leading-zero
 * `'02'`) is invalid → the route 404s.
 */
export function parseBlogPageParam(raw: string | undefined): BlogPageParam {
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) return { kind: 'invalid' };
  const n = Number(raw);
  if (n === 1) return { kind: 'redirect' };
  return { kind: 'page', n };
}

/** Canonical href for a category index page from a free-text label. */
export function categoryHref(label: string): string {
  return `/blog/category/${taxonomySlug(label)}`;
}

/** Canonical href for a tag filter page from a free-text label. */
export function tagHref(label: string): string {
  return `/blog/tag/${taxonomySlug(label)}`;
}

/**
 * True only when `raw` is ALREADY the canonical taxonomy slug — i.e. the URL the route should serve.
 * `taxonomySlug` is idempotent (its output is lowercase `[a-z0-9-]`, collapsed and trimmed), so a
 * value equal to its own slug is canonical, and a non-canonical form (`Montessori`, `play--time`,
 * `-edge-`) is not. The category/tag routes 404 any non-canonical param, so there is exactly ONE
 * indexable URL per taxonomy and its self-referential canonical is always correct — no duplicate
 * content from capitalization or hyphen noise. Links built via `categoryHref`/`tagHref` always pass.
 */
export function isCanonicalTaxonomyParam(raw: string | undefined): boolean {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  return taxonomySlug(raw) === raw;
}
