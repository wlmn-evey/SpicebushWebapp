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
import { collectHtmlImageAlts, renderBodyHtml } from './blog-html';
import { isFutureScheduledPublishAt, isScheduledPublishAtFormat } from './blog-publish-schedule';

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
  /** Precise scheduled-publish instant (ISO-8601 w/ zone) for `status='scheduled'` posts (R4-F1). */
  publishedAt?: string;
  categories?: string[];
  tags?: string[];
  readingTime?: number;
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

// Faithfully surface a stored JSONB string array (categories/tags) WITHOUT mutation, so an
// edit round-trips it unchanged (#84 / R1-F15). Non-arrays and empty arrays become `undefined`;
// canonicalization of taxonomy values is deferred to Phase 3, not done here.
const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length > 0 ? items : undefined;
};

/**
 * Resolve a post's display byline (R4-F9). When a structured author reference is present
 * (`author_type` + `author_ref`) AND it resolves against the provided `registry` (staff /
 * virtual authors from `settings.blog_authors`), the registry's display name wins. Otherwise the
 * byline falls back to the legacy `data.author` string (default `'Spicebush Team'`).
 *
 * The 6 live posts carry only `data.author` (no `author_type`/`author_ref`), so they ALWAYS take
 * the fallback and their bylines are preserved byte-for-byte — locked by the 6-byline regression
 * test. `registry` is optional; with none provided every post takes the fallback, which is the
 * PR1 read-path behavior until the author registry is wired in (later Phase-2/3 PR). The fallback
 * must NEVER short-circuit to the default where a real `data.author` exists, or every legacy
 * byline would be silently rewritten to 'Spicebush Team'.
 */
export function resolveAuthorByline(
  data: Record<string, unknown>,
  registry?: ReadonlyMap<string, string>
): string {
  const authorType = asTrimmedString(data.author_type);
  const authorRef = asTrimmedString(data.author_ref);
  if (authorType && authorRef && registry) {
    const resolved = registry.get(authorRef);
    if (resolved && resolved.trim().length > 0) return resolved.trim();
  }
  return asTrimmedString(data.author) || DEFAULT_AUTHOR;
}

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
  const author = resolveAuthorByline(data);

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
    status: 'published',
    publishedAt: emptyToUndefined(asTrimmedString(data.publishedAt)),
    categories: asStringArray(data.categories),
    tags: asStringArray(data.tags),
    // Prefer the value stored on save; fall back to computing from the body so the 6 legacy posts
    // (saved before reading time existed) still display it without a re-save.
    readingTime:
      typeof data.readingTime === 'number' && data.readingTime > 0
        ? data.readingTime
        : computeReadingTime(body)
  };
}

/**
 * Reconstruct the `baseDataJson` payload for an edit form from a managed `BlogPost`.
 *
 * The admin upsert writes `data = EXCLUDED.data` wholesale (no JSONB merge), so any persisted
 * `data.*` field the edit form does not resubmit is silently dropped on edit. `categories`/`tags`
 * have no form input yet, so they MUST be carried here or editing any post wipes them (#84 /
 * R1-F15). `undefined` values are omitted by `JSON.stringify`, matching the prior inline behavior.
 *
 * NOTE: any FUTURE persisted `data.*` key that the edit form does not surface as its own input
 * must be added here too, or it will be lost on the next edit.
 */
export function blogPostToEditData(post: BlogPost): Record<string, unknown> {
  return {
    title: post.title,
    date: post.date,
    author: post.author,
    excerpt: post.excerpt,
    body: post.body,
    image: post.image,
    imageAlt: post.imageAlt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
    // Carry the scheduled-publish instant through an edit — it has no form input of its own yet,
    // and the upsert writes `data` wholesale, so omitting it here would wipe it on the next save.
    publishedAt: post.publishedAt,
    categories: post.categories,
    tags: post.tags
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
 * The ONLY ordering implementation (R1-F9): date DESC, then `publishedAt` DESC, slug DESC
 * tiebreak, undated-last (R3-F18). The `publishedAt` tiebreak (R1-F17) orders two posts sharing a
 * calendar `date` by their precise scheduled-publish instant before falling back to the slug —
 * legacy posts carry no `publishedAt` (both `''`), so this step is a no-op for them and the
 * existing date/slug ordering is unchanged.
 */
export function compareBlogPosts(a: BlogPost, b: BlogPost): number {
  const aDated = a.date.length > 0;
  const bDated = b.date.length > 0;
  if (aDated !== bDated) return aDated ? -1 : 1; // undated sorts last

  if (a.date !== b.date) return a.date < b.date ? 1 : -1; // date DESC

  const aAt = a.publishedAt ?? '';
  const bAt = b.publishedAt ?? '';
  if (aAt !== bAt) return aAt < bAt ? 1 : -1; // publishedAt DESC (R1-F17)

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

const WORDS_PER_MINUTE = 200;

/**
 * Estimate reading time in whole minutes. Strips HTML tags first — the body is markdown today and
 * TipTap HTML after the Phase-1 conversion, so tag text must not be counted as words — then counts
 * whitespace-delimited tokens at {@link WORDS_PER_MINUTE}. Returns 0 for an empty body, else ≥ 1.
 */
export function computeReadingTime(body: unknown): number {
  if (typeof body !== 'string') return 0;
  const text = body.replace(/<[^>]+>/g, ' ').trim();
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.split(/\s+/).length / WORDS_PER_MINUTE));
}

/**
 * Write-path normalizer (called by the endpoint BEFORE validation). Returns a new object.
 */
export function normalizeBlogData(
  data: Record<string, unknown>,
  rawStatus?: string
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data };

  // Trim short string fields.
  for (const key of [
    'date',
    'author',
    'image',
    'imageAlt',
    'seoTitle',
    'seoDescription',
    'publishedAt'
  ]) {
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
  for (const key of ['image', 'imageAlt', 'seoTitle', 'seoDescription', 'date', 'publishedAt']) {
    if (normalized[key] === '') {
      delete normalized[key];
    }
  }

  // `publishedAt` is meaningful ONLY for a scheduled save. Drop it for any other status so a
  // scheduled→published/draft/archived edit cannot leave a stale future instant behind — that
  // would mis-order the post on the public index, where `compareBlogPosts` uses `publishedAt` DESC
  // as the same-`date` tiebreak (server-authoritative, independent of the client clearing it).
  if (typeof rawStatus !== 'string' || rawStatus.trim().toLowerCase() !== 'scheduled') {
    delete normalized.publishedAt;
  }

  // Default author when missing/empty.
  if (typeof normalized.author !== 'string' || normalized.author.trim().length === 0) {
    normalized.author = DEFAULT_AUTHOR;
  }

  // Reading time is derived: recompute on every save from the trimmed body (markdown today,
  // TipTap HTML after the Phase-1 conversion). 0 for an empty/missing body.
  normalized.readingTime = computeReadingTime(normalized.body);

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
  rawStatus: string | undefined,
  now: number = Date.now()
): string | null {
  // 1. Explicit-status check FIRST, against the RAW pre-default value (R2-F2). Four-state
  // whitelist (R2-F11): draft | published | scheduled | archived. The DB CHECK constraint
  // (PR4) is defense-in-depth behind this gate.
  const statusValue = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (
    statusValue !== 'draft' &&
    statusValue !== 'published' &&
    statusValue !== 'scheduled' &&
    statusValue !== 'archived'
  ) {
    return 'Status must be Draft, Published, Scheduled, or Archived';
  }
  // A scheduled post passes the FULL publish gate at save time (R1-F1): it goes live unattended,
  // so it must be publish-ready NOW. `archived` is non-publishing — exempt like a draft (and an
  // archived post round-trips back to draft via this same path, R4-F12).
  const isPublishing = statusValue === 'published' || statusValue === 'scheduled';
  const isScheduled = statusValue === 'scheduled';

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

  // Scheduled posts additionally need a precise, future publish timestamp sharing the cron's exact
  // format contract (R4-F1) — so a save that succeeds is exactly the set the cron will fire, and a
  // post that saves can never sit un-firing forever. Plain-language guidance nudges the
  // "Save as Draft instead" fallback (R3-F16) when the post is not yet schedule-ready.
  if (isScheduled) {
    const publishedAt = typeof data.publishedAt === 'string' ? data.publishedAt.trim() : '';
    if (!publishedAt) {
      return 'A scheduled post needs a publish date and time — pick when it should go live, or save it as a draft instead';
    }
    if (!isScheduledPublishAtFormat(publishedAt)) {
      return 'Scheduled publish time must be a valid date and time with a time zone (for example 2026-06-15T09:00:00Z)';
    }
    if (!isFutureScheduledPublishAt(publishedAt, now)) {
      return 'Scheduled publish time must be in the future — pick a later time, or save it as a draft instead';
    }
  }

  if (image && !imageAlt) {
    return 'Featured image alt text is required to publish';
  }

  // 7. Body-image alt walk (publish-only) — every body image needs quality alt text (R2-F26/R2-F4).
  // Legacy markdown bodies carry markdown image tokens; TipTap/AI HTML bodies carry <img> tags. BOTH
  // walks run during the markdown→HTML transition; each no-ops on the representation it does not own,
  // so a missing/empty alt is caught whichever way the image was authored. `null` (no alt attr) maps
  // to '' so it fails isValidImageAlt just like an empty alt.
  const bodyImageAlts = [
    ...collectBodyImageAlts(body),
    ...collectHtmlImageAlts(body).map(image => image.alt ?? '')
  ];
  for (const alt of bodyImageAlts) {
    if (!isValidImageAlt(alt.trim())) {
      return 'Every image in the post body must have descriptive alt text (at least 6 characters, not a filename or a single generic word)';
    }
  }

  return null;
}

/**
 * Detect a stored body that is already TipTap/sanitized HTML (vs legacy markdown): an HTML body
 * begins with a known block tag, markdown begins with prose/markdown syntax. Used ONLY for the
 * markdown→HTML transition so `renderPostBody` serves both representations safely; once all bodies
 * are HTML (after the conversion is ratified) this branch and `marked` are removed from the render
 * path — see docs/runbooks/blog-html-conversion.md.
 */
const isStoredHtml = (body: string): boolean =>
  /^\s*<(?:h[2-6]|p|ul|ol|blockquote|pre|table|figure|div|img|hr|u|s|strong|em|b|i|a)\b/i.test(
    body
  );

/**
 * The ONLY place `set:html` content is produced. Transitional during the Blog V2 cutover: HTML
 * bodies (TipTap / AI / converted) render through the V2 sanitizer (`renderBodyHtml`), while legacy
 * markdown bodies keep the `marked` → `DOMPurify(STRICT_CONFIG)` pipeline (walkTokens www-normalizer
 * + heading renderer override) until they are converted. `renderBodyHtml` is the steady-state path.
 *
 * `previousDepth` (and the `Marked` instance) are created FRESH per call (R4-F22) — module-scope
 * state would let the admin list's second post continue the first post's heading clamp.
 */
export function renderPostBody(body: string): string {
  if (typeof body !== 'string' || body.length === 0) return '';
  return isStoredHtml(body) ? renderBodyHtml(body) : renderMarkdownToHtml(body);
}

/**
 * Render a legacy MARKDOWN body to sanitized HTML via the V1 pipeline (marked → `DOMPurify`
 * STRICT_CONFIG). Exposed so the one-time conversion can FORCE the markdown path regardless of the
 * body's leading character; removed from the steady-state render path once conversion is ratified.
 */
export function renderMarkdownToHtml(markdown: string): string {
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

/**
 * RFC-822 date for an RSS `<pubDate>` from a `YYYY-MM-DD` post date. Posts have no time component, so
 * we pin noon UTC (matching the imported rows' `{date}T12:00:00Z`); `toUTCString()` emits the exact
 * RFC-822/1123 shape RSS wants (`Mon, 20 May 2024 12:00:00 GMT`). Returns `''` for an unparseable date
 * so the caller can omit `<pubDate>` rather than emit `Invalid Date`.
 */
export function toRfc822Date(date: string | undefined): string {
  if (typeof date !== 'string' || !DATE_FORMAT_REGEX.test(date)) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toUTCString();
}

/**
 * Build the blog RSS 2.0 feed. Channel + `atom:self` self-link (R1-F30), one `<item>` per published
 * post (the caller passes already-filtered, already-sorted posts) with title, link, a permalink
 * `<guid>`, the excerpt as `<description>`, and an RFC-822 `<pubDate>`. Every text value is XML-escaped.
 * `<lastBuildDate>` is derived from the newest post (posts are date-DESC) so the document is
 * deterministic and unit-testable — no `Date.now()`.
 */
export function renderBlogRssXml(posts: BlogPost[], origin: string): string {
  const feedUrl = `${origin}/blog/rss.xml`;
  const blogUrl = `${origin}/blog`;
  const title = 'Spicebush Montessori Blog';
  const description = 'News, reflections, and updates from the Spicebush Montessori community.';

  const newestPubDate = posts.map(p => toRfc822Date(p.date)).find(d => d.length > 0);

  const items = posts.map(post => {
    const link = `${origin}/blog/${post.slug}`;
    const pubDate = toRfc822Date(post.date);
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : '',
      pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
      '    </item>'
    ]
      .filter(line => line.length > 0)
      .join('\n');
  });

  const channelHead = [
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(blogUrl)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    '    <language>en-us</language>',
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    newestPubDate ? `    <lastBuildDate>${newestPubDate}</lastBuildDate>` : ''
  ].filter(line => line.length > 0);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    ...channelHead,
    ...items,
    '  </channel>',
    '</rss>'
  ].join('\n');
}
