/**
 * Public blog discovery helpers (Phase 3): taxonomy (categories/tags) aggregation + canonicalization,
 * pagination, and related posts. Pure functions over an already-published, already-sorted
 * `BlogPost[]` (the read path filters status and applies `compareBlogPosts` before calling here), so
 * this module never touches the DB and is fully unit-testable.
 *
 * Taxonomy is CANONICALIZED on read, never rejected (R1-F3): a free-text label is slugified for the
 * URL and grouped; the display label is chosen deterministically by a collision rule so variant
 * spellings collapse to one stable group. Category index pages are PATH segments
 * (`/blog/category/[slug]`), so the slug here is the route segment (R4-F15).
 */
import type { BlogPost } from './blog-content';

// A category needs ≥2 published members to be a real, indexable/sitemapped page (R1-F31); below the
// threshold it is thin content and the route renders `noindex`.
export const CATEGORY_INDEX_THRESHOLD = 2;

// Page size for the public index (R4-F10): ≥10 so the 6-post corpus never paginates — `/blog`
// (page 1) surfaces all six post cards and `blog.spec.ts` test 18's `>=6` count holds.
export const BLOG_PAGE_SIZE = 10;

export type Taxonomy = {
  /** Canonical URL slug (the `/blog/category/[slug]` route segment). */
  slug: string;
  /** Canonical display label (collision rule: most frequent raw label, ties alphabetical). */
  display: string;
  /** Published members, preserving the input order (already recency-sorted). */
  posts: BlogPost[];
  count: number;
};

/**
 * Canonical taxonomy slug from a free-text label: lowercase, spaces→hyphens, strip to `[a-z0-9-]`,
 * collapse and trim hyphens. Returns `''` for an unusable label (the caller drops it). Mirrors the
 * testimonials category-token rule so taxonomy slugs are consistent across the site.
 */
export function taxonomySlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build taxonomy groups for a field (`categories` | `tags`) over published posts. Each label is
 * slugified and posts sharing a slug are grouped; a post counts once per slug even if it lists two
 * variants that canonicalize the same. The display label is the most frequent raw label (ties broken
 * alphabetically) — a stable collision rule. Groups are sorted by descending member count then slug;
 * each group's members preserve the input order.
 */
export function buildTaxonomy(posts: BlogPost[], field: 'categories' | 'tags'): Taxonomy[] {
  const groups = new Map<string, { posts: BlogPost[]; labelCounts: Map<string, number> }>();

  for (const post of posts) {
    const values = post[field];
    if (!Array.isArray(values)) continue;
    const seenForPost = new Set<string>();
    for (const raw of values) {
      const slug = taxonomySlug(raw);
      if (!slug || seenForPost.has(slug)) continue;
      seenForPost.add(slug);
      let group = groups.get(slug);
      if (!group) {
        group = { posts: [], labelCounts: new Map() };
        groups.set(slug, group);
      }
      group.posts.push(post);
      const label = typeof raw === 'string' ? raw.trim() : '';
      if (label) group.labelCounts.set(label, (group.labelCounts.get(label) ?? 0) + 1);
    }
  }

  const result: Taxonomy[] = [];
  for (const [slug, { posts: members, labelCounts }] of groups) {
    let display = slug;
    let best = -1;
    for (const [label, count] of [...labelCounts].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (count > best) {
        best = count;
        display = label;
      }
    }
    result.push({ slug, display, posts: members, count: members.length });
  }

  return result.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/** Categories meeting the indexable threshold (≥2 members) — R1-F31, used for the sitemap/index set. */
export function indexableCategories(posts: BlogPost[]): Taxonomy[] {
  return buildTaxonomy(posts, 'categories').filter(c => c.count >= CATEGORY_INDEX_THRESHOLD);
}

/** Resolve one taxonomy group by slug for the category/tag route; `null` on miss. */
export function findTaxonomy(
  posts: BlogPost[],
  field: 'categories' | 'tags',
  slug: string
): Taxonomy | null {
  const target = taxonomySlug(slug);
  if (!target) return null;
  return buildTaxonomy(posts, field).find(t => t.slug === target) ?? null;
}

export type Pagination<T> = {
  /** The slice for the resolved page. */
  items: T[];
  /** 1-based, clamped to [1, totalPages]. */
  page: number;
  /** Always ≥1 (an empty list is one empty page). */
  totalPages: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** False when the REQUESTED page was out of range / malformed — the route should 404 (R3-F19). */
  isValidPage: boolean;
};

/**
 * Paginate a list. `requestedPage` is 1-based. An out-of-range or non-integer page is reported via
 * `isValidPage=false` (the route 404s) while still returning a clamped, renderable page. With the
 * 6-post corpus and the default size ≥10 there is exactly one page and no prev/next (R3-F19/R4-F10).
 */
export function paginate<T>(
  items: T[],
  requestedPage: number,
  pageSize: number = BLOG_PAGE_SIZE
): Pagination<T> {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : BLOG_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const isValidPage =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= totalPages;
  const page = isValidPage
    ? requestedPage
    : Math.min(Math.max(1, Number.isInteger(requestedPage) ? requestedPage : 1), totalPages);
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    totalPages,
    pageSize: size,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    isValidPage
  };
}

/**
 * Related posts: other published posts sharing the most categories/tags with `post` (excluding
 * itself), ranked by shared-taxonomy count then the input order (recency). Posts with zero overlap
 * are excluded; returns up to `limit`. A post with no taxonomy of its own has no related posts.
 */
export function getRelatedPosts(post: BlogPost, all: BlogPost[], limit = 3): BlogPost[] {
  const own = new Set<string>();
  for (const field of ['categories', 'tags'] as const) {
    const values = post[field];
    if (!Array.isArray(values)) continue;
    for (const raw of values) {
      const slug = taxonomySlug(raw);
      if (slug) own.add(`${field}:${slug}`);
    }
  }
  if (own.size === 0) return [];

  return all
    .filter(candidate => candidate.slug !== post.slug)
    .map((candidate, index) => {
      let shared = 0;
      for (const field of ['categories', 'tags'] as const) {
        const values = candidate[field];
        if (!Array.isArray(values)) continue;
        for (const raw of values) {
          const slug = taxonomySlug(raw);
          if (slug && own.has(`${field}:${slug}`)) shared += 1;
        }
      }
      return { post: candidate, shared, index };
    })
    .filter(entry => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(entry => entry.post);
}
