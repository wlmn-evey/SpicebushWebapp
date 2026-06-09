/**
 * Single source of truth for the `/admin/blog` form field `name` strings (R1-F42).
 *
 * No runtime logic, no imports. Consumed by `blog.astro` (renders `name` attributes from it),
 * `blog-admin-client.ts` (resolves field references), and `content.blog.test.ts` (builds FormData).
 *
 * The `data.`-prefix and the literal `_raw` suffix on body/excerpt are load-bearing: the endpoint
 * routes `data.*` keys into the JSONB payload and the `_raw` suffix skips the parser's coercion+trim
 * (see `parseFormDataPayload` in `content.ts`). Changing a string here without changing the markup
 * and handler in lockstep silently breaks the save path.
 */
export const BLOG_FORM_FIELDS = {
  collection: 'collection',
  slug: 'slug',
  title: 'title',
  status: 'status',
  createOnly: 'createOnly',
  redirectTo: 'redirectTo',
  baseDataJson: 'baseDataJson',
  action: 'action',
  date: 'data.date',
  author: 'data.author',
  // Persisted UTC-Z scheduled instant (hidden input, filled by the client on submit from the
  // zone-less datetime-local pick below). `publishedAtLocal` is the visible wall-clock control and
  // is NOT a `data.` field, so it is never persisted directly.
  publishedAt: 'data.publishedAt',
  publishedAtLocal: 'publishedAtLocal',
  excerptRaw: 'data.excerpt_raw',
  bodyRaw: 'data.body_raw',
  image: 'data.image',
  imageAlt: 'data.imageAlt',
  seoTitle: 'data.seoTitle',
  seoDescription: 'data.seoDescription'
} as const;
