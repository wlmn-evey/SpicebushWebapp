/**
 * Blog content library — the single home for all blog-specific read-path logic,
 * validation, rendering, and sitemap string-building.
 *
 * Living under `src/lib/**` means this file is auto-coverage-measured (vitest
 * `include: ['src/lib/**\/*.ts']`). The thin endpoint/sitemap shells defer their
 * logic here so the shared admin endpoint is not gated for blog-only branches.
 */
import { Marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { db } from '@lib/db';
import { queryRows } from '@lib/db/client';
import type { ContentEntry } from '@lib/db/types';

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  body: string;
  image?: string;
  imageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  status: string;
};

// Length caps — authoritative numbers per docs/specs/blog.md Data Model.
const TITLE_MAX = 300;
const SLUG_MAX = 100;
const EXCERPT_MAX = 1000;
const BODY_MAX = 200000;

const DEFAULT_AUTHOR = 'Spicebush Team';

// Slug charset + length, shared by the read-path trust boundary and the write-path validator.
const SLUG_REGEX = /^[a-z0-9-_]{1,100}$/;

// Legacy date-prefix namespace (`YYYY-MM-DD-…`), reserved for the redirect fallback.
const DATE_PREFIX_REGEX = /^\d{4}-\d{2}-\d{2}-(.+)$/;

// Featured-image URL scheme: HTTPS absolute OR a single-slash site-relative path that is
// NOT `//` or `/\` (backslash-aware — browsers parse `/\evil.com` as `//evil.com`). R2-F1/F7/R3-F2.
const IMAGE_SCHEME_REGEX = /^(\/(?![/\\])|https:\/\/)/;

// Publish date format (YYYY-MM-DD).
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// imageAlt quality floors (R1-F37): not filename-like, not a single generic word.
const FILENAME_LIKE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const GENERIC_WORD_REGEX = /^(image|photo|picture)$/i;
const IMAGE_ALT_MIN = 6;

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const emptyToUndefined = (value: string): string | undefined =>
  value.length > 0 ? value : undefined;

/**
 * Shared field mapper — builds a `BlogPost` from a stored `ContentEntry` WITHOUT the
 * date/excerpt completeness gate. Returns `null` only when the row is structurally
 * untrustworthy (slug fails the charset/length shape or title is absent).
 *
 * Data-key invariant (AMENDMENT 1): `body` is read from `entry.body`; `title` and every
 * other field are read from `entry.data.*` (`toContentEntry` merges the title column into
 * `entry.data.title`). There is no top-level `entry.date`/`entry.author`.
 *
 * `status` defaults to `'published'` — the published read path only ever sees published
 * rows. `getManagedBlogPosts` overwrites `status` from the SQL column afterward.
 *
 * The two read paths differ only in their completeness requirement, layered on top:
 *   - `normalizeBlogEntry` (public): also drops rows missing date or excerpt.
 *   - `getManagedBlogPosts` (admin): keeps bare drafts so an author always sees their save.
 */
function mapEntryToBlogPost(entry: ContentEntry): BlogPost | null {
  const slug = typeof entry.slug === 'string' ? entry.slug : '';
  if (!SLUG_REGEX.test(slug)) return null;

  const data = (entry.data ?? {}) as Record<string, unknown>;

  const title = asTrimmedString(data.title);
  if (!title) return null;

  const date = asTrimmedString(data.date);
  const excerpt = asTrimmedString(data.excerpt);
  const body = typeof entry.body === 'string' ? entry.body : '';
  const author = asTrimmedString(data.author) || DEFAULT_AUTHOR;

  // Null/strip a featured image failing the backslash-aware scheme — treat as absent.
  const rawImage = asTrimmedString(data.image);
  const image = rawImage && IMAGE_SCHEME_REGEX.test(rawImage) ? rawImage : undefined;

  return {
    slug,
    title,
    date,
    author,
    excerpt,
    body,
    image,
    imageAlt: emptyToUndefined(asTrimmedString(data.imageAlt)),
    seoTitle: emptyToUndefined(asTrimmedString(data.seoTitle)),
    seoDescription: emptyToUndefined(asTrimmedString(data.seoDescription)),
    status: 'published'
  };
}

/**
 * Public read-path trust boundary — the single tolerant mapper from a stored `ContentEntry`
 * to a renderable `BlogPost`. Returns `null` to skip a row that cannot be trusted/rendered:
 * a bad slug, or a row missing the title/date/excerpt the public index and post page require.
 */
export function normalizeBlogEntry(entry: ContentEntry): BlogPost | null {
  const post = mapEntryToBlogPost(entry);
  if (!post) return null;
  // Public surfaces require a date and excerpt; a bare draft is not renderable here.
  if (!post.date || !post.excerpt) return null;
  return post;
}

/**
 * The ONLY ordering implementation (R1-F9): date DESC, slug DESC tiebreak, undated-last (R3-F18).
 */
export function compareBlogPosts(a: BlogPost, b: BlogPost): number {
  const aDated = a.date.length > 0;
  const bDated = b.date.length > 0;
  if (aDated !== bDated) return aDated ? -1 : 1; // undated sorts last

  if (a.date !== b.date) return a.date < b.date ? 1 : -1; // date DESC
  if (a.slug !== b.slug) return a.slug < b.slug ? 1 : -1; // slug DESC
  return 0;
}

/**
 * Public index read path: published rows only (filtered in SQL), normalized + sorted.
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  // >~50 posts → switch to a no-body list projection (R1-F53)
  const entries = await db.content.getCollection('blog');
  return entries
    .map(normalizeBlogEntry)
    .filter((post): post is BlogPost => post !== null)
    .sort(compareBlogPosts);
}

/**
 * Public post read path: a single published post (drafts are `null` via SQL), normalized.
 */
export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const entry = await db.content.getEntry('blog', slug);
  return entry ? normalizeBlogEntry(entry) : null;
}

/**
 * Admin list read path: ALL `type='blog'` rows with NO status filter (R1-F9) — drafts and
 * stray-status rows included. Uncached (queries directly) so the author always sees their save.
 */
export async function getManagedBlogPosts(): Promise<BlogPost[]> {
  const rows = await queryRows<{
    id: string;
    slug: string;
    title: string | null;
    status: string;
    data: Record<string, unknown> | null;
  }>("SELECT id, slug, title, status, data FROM content WHERE type = 'blog'", []);

  return rows
    .map(row => {
      const data = { ...(row.data ?? {}) };
      // Merge the title column into data.title (mirrors toContentEntry).
      if (typeof row.title === 'string' && row.title.length > 0) {
        data.title = row.title;
      }
      const entry: ContentEntry = {
        id: row.id,
        slug: row.slug,
        collection: 'blog',
        data,
        body: typeof data.body === 'string' ? data.body : ''
      };
      // Relaxed mapping (NOT normalizeBlogEntry): the admin list must show bare drafts —
      // a title-only draft is a valid save (validateBlogData exempts drafts from
      // date/excerpt), so requiring date+excerpt here would hide the author's own row.
      const post = mapEntryToBlogPost(entry);
      if (!post) return null;
      // Admin list shows the real status from the SQL column, not the published default.
      post.status = row.status;
      return post;
    })
    .filter((post): post is BlogPost => post !== null)
    .sort(compareBlogPosts);
}

/**
 * Date-prefix 301 fallback (R2-F37). Returns the stripped slug when `slug` is date-prefixed
 * (`YYYY-MM-DD-…`) AND the stripped target resolves to a PUBLISHED post; `null` otherwise
 * (no prefix, miss, or stripped target is a draft). Unit-pinned so a refactor cannot leak
 * draft existence via 301.
 */
export async function resolveLegacyBlogRedirect(slug: string): Promise<string | null> {
  const match = DATE_PREFIX_REGEX.exec(slug);
  if (!match) return null;
  const stripped = match[1];
  const post = await getPublishedPost(stripped);
  return post ? stripped : null;
}

/**
 * Write-path normalizer (called by the endpoint BEFORE validation). Returns a new object.
 */
export function normalizeBlogData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data };

  // Trim short string fields.
  for (const key of ['date', 'author', 'image', 'imageAlt', 'seoTitle', 'seoDescription']) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = (normalized[key] as string).trim();
    }
  }

  // Backstop the `_raw` path that skipped the parser trim (R2-F8).
  if (typeof normalized.body === 'string') {
    normalized.body = normalized.body.trim();
  }
  if (typeof normalized.excerpt === 'string') {
    normalized.excerpt = normalized.excerpt.trim();
  }

  // Delete optional keys whose trimmed value is '' (R2-F20).
  for (const key of ['image', 'imageAlt', 'seoTitle', 'seoDescription', 'date']) {
    if (normalized[key] === '') {
      delete normalized[key];
    }
  }

  // Default author when missing/empty.
  if (typeof normalized.author !== 'string' || normalized.author.trim().length === 0) {
    normalized.author = DEFAULT_AUTHOR;
  }

  // Leave categories / tags untouched (R1-F12).
  return normalized;
}

const isValidImageAlt = (alt: string): boolean =>
  alt.length >= IMAGE_ALT_MIN && !FILENAME_LIKE_REGEX.test(alt) && !GENERIC_WORD_REGEX.test(alt);

/**
 * Collect every image token's alt text from a markdown body (R2-F26). Image tokens are
 * nested inside paragraph/list/table tokens, so reuse marked's full traversal via walkTokens.
 */
const collectBodyImageAlts = (markdown: string): string[] => {
  const alts: string[] = [];
  const collector = new Marked({ gfm: true, async: false });
  collector.use({
    walkTokens(token) {
      if (token.type === 'image') {
        alts.push(typeof token.text === 'string' ? token.text : '');
      }
    }
  });
  collector.parse(markdown);
  return alts;
};

/**
 * Write-path validator. Returns a plain-language error string, or `null` if valid.
 * Order matters — the explicit-status check is FIRST.
 *
 * `data.slug` arrives via an augmented copy (`{ ...data, slug }`) so this function is testable
 * in isolation; the endpoint NEVER persists `slug` into the JSONB `data` column.
 */
export function validateBlogData(
  data: Record<string, unknown>,
  title: string | null,
  rawStatus: string | undefined
): string | null {
  // 1. Explicit-status check FIRST, against the RAW pre-default value (R2-F2).
  const statusValue = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (statusValue !== 'draft' && statusValue !== 'published') {
    return 'Status must be Draft or Published';
  }
  const isPublishing = statusValue === 'published';

  // 2. Slug shape + date-prefix rejection (R2-F19).
  const slug = typeof data.slug === 'string' ? data.slug : '';
  if (!SLUG_REGEX.test(slug)) {
    return 'Address must be 1–100 characters of lowercase letters, numbers, hyphen, or underscore';
  }
  if (/^\d{4}-\d{2}-\d{2}-/.test(slug)) {
    return 'Address must not start with a date (YYYY-MM-DD-) — that format is reserved';
  }

  // 3. Length caps (R1-F6).
  const titleValue = typeof title === 'string' ? title.trim() : '';
  if (!titleValue) {
    return 'Title is required';
  }
  if (titleValue.length > TITLE_MAX) {
    return `Title must be ${TITLE_MAX} characters or fewer`;
  }
  if (slug.length > SLUG_MAX) {
    return `Address must be ${SLUG_MAX} characters or fewer`;
  }
  const excerpt = typeof data.excerpt === 'string' ? data.excerpt : '';
  if (excerpt.length > EXCERPT_MAX) {
    return `Excerpt must be ${EXCERPT_MAX} characters or fewer`;
  }
  const body = typeof data.body === 'string' ? data.body : '';
  if (body.length > BODY_MAX) {
    return `Body must be ${BODY_MAX} characters or fewer`;
  }

  // 4. Featured-image URL scheme (backslash-aware) — R2-F1/R3-F2.
  const image = typeof data.image === 'string' ? data.image : '';
  if (image && !IMAGE_SCHEME_REGEX.test(image)) {
    return 'Featured image must be an HTTPS URL or a site-relative path';
  }

  // 5. imageAlt quality when both image and imageAlt are present (R1-F37).
  const imageAlt = typeof data.imageAlt === 'string' ? data.imageAlt : '';
  if (image && imageAlt && !isValidImageAlt(imageAlt)) {
    return 'Featured image alt text must be descriptive (at least 6 characters, not a filename or a single generic word)';
  }

  // Drafts are exempt from the publish requirements below.
  if (!isPublishing) {
    return null;
  }

  // 6. Publish requirements.
  if (!excerpt.trim()) {
    return 'Excerpt is required to publish';
  }
  if (!body.trim()) {
    return 'Body is required to publish';
  }
  const date = typeof data.date === 'string' ? data.date.trim() : '';
  if (!date || !DATE_FORMAT_REGEX.test(date) || Number.isNaN(Date.parse(date))) {
    return 'A valid publish date (YYYY-MM-DD) is required to publish';
  }
  if (image && !imageAlt) {
    return 'Featured image alt text is required to publish';
  }

  // 7. Body-image alt walk (publish-only) — every body image needs quality alt text (R2-F26).
  for (const alt of collectBodyImageAlts(body)) {
    if (!isValidImageAlt(alt.trim())) {
      return 'Every image in the post body must have descriptive alt text (at least 6 characters, not a filename or a single generic word)';
    }
  }

  return null;
}

/**
 * The ONLY place `set:html` content is produced. Pipeline: marked (walkTokens www-normalizer +
 * heading renderer override) → DOMPurify.sanitize(STRICT_CONFIG) → string.
 *
 * `previousDepth` (and the `Marked` instance) are created FRESH per call (R4-F22) — module-scope
 * state would let the admin list's second post continue the first post's heading clamp.
 */
export function renderPostBody(markdown: string): string {
  if (typeof markdown !== 'string' || markdown.length === 0) return '';

  let previousDepth = 1; // the page <h1> precedes the body
  const renderer = new Marked({ gfm: true, async: false });

  renderer.use({
    walkTokens(token) {
      // marked stores both link and image URLs on `token.href`.
      if (
        (token.type === 'link' || token.type === 'image') &&
        typeof token.href === 'string' &&
        token.href.startsWith('www.')
      ) {
        token.href = `https://${token.href}`;
      }
    },
    renderer: {
      heading({ tokens, depth }) {
        // Demote h1 → h2, then clamp heading-level skips. NO id emission (R4-F6).
        let level = depth === 1 ? 2 : depth;
        level = Math.min(level, previousDepth + 1);
        previousDepth = level;
        const text = this.parser.parseInline(tokens);
        return `<h${level}>${text}</h${level}>\n`;
      }
    }
  });

  const html = renderer.parse(markdown) as string;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'a',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'blockquote',
      'code',
      'pre',
      'img',
      'hr',
      'br',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'del'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'], // NO 'id'
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?![/\\]))/i
  });
}

/**
 * Escape `& < > " '` for XML safety (`&` first).
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the `<urlset>` sitemap document. Emits SLASHLESS URLs (R2-F5/F17): `{origin}/blog`
 * and `{origin}/blog/{slug}` — never `/blog/`. No `lastmod` (R1-F7). Every URL is XML-escaped.
 */
export function renderBlogSitemapXml(posts: BlogPost[], origin: string): string {
  const urls = [
    `  <url>\n    <loc>${escapeXml(`${origin}/blog`)}</loc>\n  </url>`,
    ...posts.map(
      post => `  <url>\n    <loc>${escapeXml(`${origin}/blog/${post.slug}`)}</loc>\n  </url>`
    )
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}
