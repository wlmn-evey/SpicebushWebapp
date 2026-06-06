# Blog System Specification

## Overview

The blog is a DB-backed content system that lets non-technical school owners author, draft, and
publish posts from the admin panel at `/admin/blog` with no deploys. Posts are stored as rows in the
generic `content` table (`type = 'blog'`), authored in Markdown, and rendered to sanitized HTML at
request time. The public surface is a blog index at `/blog` and individual post pages at
`/blog/[slug]`.

The blog rides the existing generic content pipeline end to end — the same `content` table, DB
facade, cache layer, admin form-POST endpoint, and media upload system used by other CMS
collections. No new database table, no new admin API endpoint, and no rich-text editor are
introduced. Blog-specific logic is concentrated in `app/src/lib/blog-content.ts`.

This is the lean V1 ("MVP") scope. See [Deferred Features](#deferred-features) for what is
intentionally out and why.

## Authoring Model

- Posts are authored in **Markdown** in a plain `<textarea>` (not a WYSIWYG / rich-text editor).
- Markdown is stored raw in the DB and rendered to sanitized HTML on every read (sanitize-at-render,
  never sanitize-at-write — the stored body is always treated as untrusted on the next render).
- Each post has a **status** of `published` or `draft`. Drafts are excluded from every public read
  by the SQL `status = 'published'` filter and are visible only in the admin list.
- Owners publish, edit, unpublish (flip to draft), and delete posts from `/admin/blog` with no
  deploy. New post URLs go live immediately; the index and edits to already-published posts
  propagate within the 5-minute cache TTL (see [Caching](#caching)).

## Data Model

The blog reuses the existing `content` table unchanged (see `docs/specs/data-model.md` →
`content`). No DDL migration is required. The `'cms_blog'` collection alias remains in the DB read
allowlist but is unused; all blog rows use `type = 'blog'`.

### Row shape for a blog post

| Column / JSONB key | Value |
|---|---|
| `type` | `'blog'` |
| `slug` | URL slug, matches `^[a-z0-9-_]{1,100}$`; must NOT match `^\d{4}-\d{2}-\d{2}-` (that prefix shape is reserved for the legacy-redirect namespace); immutable after creation in the admin UI |
| `title` (column) | Post title, ≤ 300 chars. Overrides `data.title` on read (via `toContentEntry`) |
| `status` | `'published'` or `'draft'` — the entire draft/published representation. Blog POSTs must carry an **explicit** status; a missing/empty value is a 400, never a silent publish |
| `data.date` | `'YYYY-MM-DD'` string — display and sort date |
| `data.author` | string, default `'Spicebush Team'` |
| `data.excerpt` | string, ≤ 1,000 chars, trimmed |
| `data.body` | raw **Markdown** string, ≤ 200,000 chars (~200 KB), trimmed of leading/trailing whitespace; never HTML |
| `data.image` | optional featured-image URL; must be site-relative or HTTPS absolute, matching `^(\/(?![/\\])\|https:\/\/)` |
| `data.imageAlt` | alt text; required when `image` is set and status is `published`; must be ≥ 6 chars, not filename-like, not a generic word |
| `data.seoTitle` | optional per-post `<title>` / OG override |
| `data.seoDescription` | optional per-post meta-description / OG override |
| `data.categories`, `data.tags` | legacy import keys, carried **opaquely** by the generic `baseDataJson` edit passthrough; no blog code reads, validates, or reshapes them |
| `author_email` | set automatically to the admin's session email on save; `NULL` on the imported legacy rows (rollback discriminator) |
| `created_at` / `updated_at` | imported rows use `{date}T12:00:00Z`; auto-managed otherwise |

### Empty-string semantics

The blog form always submits the optional `data.*` fields, so a blank input arrives as `''` (which
`??` does not catch). Three layers normalize this:

1. **Write normalize** (`normalizeBlogData`) deletes optional keys (`image`, `imageAlt`, `seoTitle`,
   `seoDescription`, `date`) whose trimmed value is `''`.
2. **Write validate** (`validateBlogData`) treats "set" as **non-empty after trim**.
3. **Read map** (`normalizeBlogEntry`) coerces `''` optional fields to `undefined`.

The public post page additionally uses `||` (not `??`) for its SEO meta fallbacks so `''` falls
through to the base value.

### Ordering

A single comparator, `compareBlogPosts(a, b)` in `blog-content.ts`, defines order everywhere:
`data.date` DESC (ISO strings sort lexicographically), tiebreak **slug DESC**; an undated row sorts
after any dated row (an undated row cannot publish, so this only affects the admin draft list). Both
the public index (`getPublishedPosts`) and the admin list (`getManagedBlogPosts`) sort in JS with
this comparator — there is no SQL `ORDER BY` divergence and no dependency on `created_at` (which the
`ContentEntry` shape does not expose).

### Date format

`data.date` is `'YYYY-MM-DD'` (the Markdown frontmatter shape). Imported rows set
`created_at`/`updated_at` to `{date}T12:00:00Z`. The display formatter renders with
`{ timeZone: 'UTC' }`.

### Migrations

- **No DDL migration.**
- **One data migration**, `app/db/migrations/015_import_legacy_blog_posts.sql` — the one-time legacy
  import (see [Legacy Import](#legacy-import)). It is wrapped in `BEGIN; … COMMIT;` and is
  idempotent (`DELETE` of seed rows + `INSERT … ON CONFLICT DO NOTHING`).

## Legacy Import

The blog was DB-backed from the initial commit until the 301 redirects landed (2026-02-08); the
documented `npm run db:seed` (`app/scripts/insert-critical-data.js`) upserts the 6 Markdown posts as
seed-created rows with **date-prefixed slugs** (filename minus `.md`) and
`author_email = 'seed@spicebushmontessori.org'`. Production therefore contains 6 published,
seed-created blog rows.

Migration 015 **reconciles then imports**, all in one transaction:

1. **Reconcile** — `DELETE` the seed-pipeline rows (targets only `author_email =
   'seed@spicebushmontessori.org'` AND date-prefixed slugs).
2. **Import** — six `INSERT … ON CONFLICT (type, slug) DO NOTHING`, using the **clean** slugs (file
   name with the date prefix stripped, or the explicit frontmatter `slug`), `author_email = NULL`,
   and `created_at`/`updated_at` of `{date}T12:00:00Z`.

In the same change, `'blog'` is removed from `CONTENT_COLLECTIONS` in
`app/scripts/insert-critical-data.js` so future `db:seed` runs never re-create the date-prefixed
duplicates. Blog content is owned by the DB / admin panel and is excluded from seeding.

The legacy Markdown source (`app/src/content/blog/*.md`) and the `blogCollection` definition in
`app/src/content/config.ts` are removed only after the public pages are launched and verified; the
content remains recoverable via git history.

## Public Routes

| Route | Description |
|-------|-------------|
| `/blog` | Blog index — vertical list of published posts (featured image, title link, date, author, excerpt). Friendly branded empty state at HTTP 200 when no posts. File: `app/src/pages/blog.astro` |
| `/blog/[slug]` | Individual post page — SSR, sanitized body. File: `app/src/pages/blog/[slug].astro` |
| `/resources/blog` | 301 redirect to `/blog`. File: `app/src/pages/resources/blog.astro` |
| `/resources/blog/[slug]` | Trivial 301 redirect to `/blog/[slug]`. File: `app/src/pages/resources/blog/[slug].astro` |

### Post page behavior

- **Slug hygiene** — if `Astro.params.slug` fails `^[a-z0-9-_]{1,100}$`, return `404` before
  querying.
- **Legacy date-prefix fallback** — on a miss, `resolveLegacyBlogRedirect(slug)` returns the
  stripped slug, and the page `301`s to `/blog/{strippedSlug}` only when the stripped slug resolves
  to a **published** post (no loops, no draft leakage, no redirect-to-404). The write path can never
  mint slugs in this namespace.
- **Missing or draft** → `404` (drafts are indistinguishable from missing by design).
- The post renders `<article>` with a single `<h1>` title, a `<time datetime>` + author byline, an
  optional featured `<img>`, then `<div class="blog-body" set:html={renderPostBody(post.body)} />` —
  the only `set:html` in the feature.

The Footer link to `/blog` (`app/src/components/Footer.astro:141`) is unchanged — making `/blog`
real fixes the previously-broken link that 301'd to `/contact`.

## Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/blog` | Blog authoring dashboard — add-post form + draft/published lists with inline edit, preview, and delete. File: `app/src/pages/admin/blog.astro` |
| `POST /api/admin/content` | Generic content endpoint (existing) — the blog uses it via `collection=blog`. File: `app/src/pages/api/admin/content.ts` |

The admin page is a structural clone of `app/src/pages/admin/faq.astro` (AdminLayout wrapper,
`?saved=` / `?error=` flash params, `<details>` add-form + collapsible per-item edit forms). A link
to `/admin/blog` (label "Blog") is added to `app/src/components/AdminNav.astro` under "Content".

### Page structure

- **Add new post** — a `<details>` form posting to `/api/admin/content` with hidden
  `collection=blog`, `createOnly=true`, `redirectTo=/admin/blog?saved=new`. Fields: title, slug,
  date, author, excerpt, body (Markdown), featured image (upload widget + URL input), image
  description (alt), SEO title/description (collapsed, optional), and a status select (Draft /
  Published, default Draft).
- **Post list** — two groups, **Drafts** and **Published**, ordered by `compareBlogPosts`. Every row
  with `type='blog'` is shown regardless of status (any non-`published` status, including a
  stray/legacy value, sorts under Drafts). Status badges pair color with text using AA-passing
  pairings.
- **Edit form** — the same field set, pre-filled. Slug is read-only (a hidden input plus a display).
  The status `<select>` renders `selected={post.status}` so an untouched edit retains the post's
  current status (editing a published post without touching status keeps it published). The image
  input prefills `value={post.image}`. The edit form carries no `createOnly`.
- **Preview** — a nested `<details>` containing the server-rendered output of
  `renderPostBody(post.body)` — the identical public render pipeline, zero-JS. On save, the saved
  post's `<details>` (and its preview) server-render `open` so the save → redirect → preview loop
  works.
- **Delete** — a per-post form posting `action=delete`, `collection=blog`, `slug`,
  `redirectTo=/admin/blog?saved=deleted`, with a confirmation prompt.

### Form field names

The exact form field names are exported from a single source-of-truth module,
`app/src/lib/blog-form-fields.ts` (`collection`, `slug`, `title`, `status`, `createOnly`,
`redirectTo`, `baseDataJson`, `action`, `data.date`, `data.author`, `data.excerpt_raw`,
`data.body_raw`, `data.image`, `data.imageAlt`, `data.seoTitle`, `data.seoDescription`). The admin
page, the client validation module, and the handler-integration test all reference field names
through this module so drift fails a test.

### Layout constraints

- The status `<select>` always renders top-level, never inside a collapsed `<details>` (a required
  control inside a collapsed, unfocusable disclosure can be silently un-submittable in Chrome).
- Only optional, never-required fields (the "SEO (optional)" group) may live inside collapsed
  sub-details. Date, excerpt, body, image, and imageAlt (all conditionally required) render
  top-level.
- The body and excerpt textareas are authored with tight interpolation
  (`<textarea …>{post.body}</textarea>`, zero whitespace) under a `<!-- prettier-ignore -->` guard,
  because the `_raw` form path deliberately skips the parser's trim; `normalizeBlogData` is the
  backstop trim.

### Featured image (media system reuse)

The featured-image widget mirrors `app/src/pages/admin/staff.astro`: a text input holds the public
URL path, with an inline upload widget that POSTs to `/api/media/upload` (FormData: `file`, `title`,
`category='blog'`, `createPhotoEntry='true'`). On success it sets the URL input (dispatching an
`input` event so conditional validation re-runs), surfaces a "Image attached — save the post to keep
it." status in a live region, and offers a "Copy address" affordance plus a "(opens in a new tab)"
crop link to `/admin/media`. Inline post images are added by the owner via Markdown
(`![description](address)`), using addresses copied from the media system. The photo category
`'blog'` already exists in `app/src/types/photo.ts`.

- **New-tab editor links (R2-F11).** The crop/focal link and the in-body-image Media link both
  carry `target="_blank" rel="noopener"` and a visible "(opens in a new tab)" suffix, so the owner
  never loses an unsaved draft by navigating away in the same tab.
- **Rendered-but-empty live region (R4-F14).** The upload announcement node is a
  permanently-rendered, visually-empty `<p aria-live="polite">` — it does NOT carry staff.astro's
  `hidden` class (content injected into a `display:none` live region is not announced). Upload
  success, upload failure, and copy-address success all write into this same polite node.

### Client-side validation

All client validation lives in `app/src/lib/blog-admin-client.ts` (an importable module called from
the page's processed `<script>`, unit-tested in jsdom), kept at the same complexity class as
`faq.astro`'s script. Per form, it runs once at `DOMContentLoaded` (computing required-state from
the initial field values) and re-runs on status `change` / image-URL `input`:

- **Conditional `required`** — `status=published` ⇒ `required` on excerpt/body/date; a non-empty
  image ⇒ `required` on imageAlt; reversed when the condition clears. Static `required` stays only on
  title + slug.
- **Native-attribute mirrors** — `minlength="6"` on imageAlt and a `pattern` on the image URL input
  express the cheap floor checks declaratively.
- **Slug-collision block** — the page server-renders the existing slug list into a `data-` attribute;
  on collision the module shows an inline `role="alert"` adjacent to the slug input (mutated only on
  state transition) and calls `setCustomValidity(...)`, which blocks submission and focuses the slug
  field even if the inline warning was never seen.

Native browser validation blocks submission and focuses the first invalid field; the server remains
the source of truth. The body-image alt-quality bar and the imageAlt filename/generic-word rejection
are enforced **server-side** at publish (the client does not mirror those).

### Flash messages

- The success banner never renders alongside an error
  (`const savedSlug = errorMessage ? null : Astro.url.searchParams.get('saved')`).
- Saved copy is **state-specific** (the page already loads every row, so it resolves the saved slug's
  status): a published save → "Published — now live at its link."; a draft save → "Saved as a draft —
  NOT yet visible to the public…"; `saved=deleted` → "Post deleted."
- The add-form save (`saved=new`) uses a **two-state copy that names both outcomes** ("Saved. If you
  set status to Published it is now live… If you saved it as a draft it is NOT yet visible…"). This
  is a deliberate deviation from R4-F12's "saved=new state-specific" ask: the add-form `redirectTo`
  is the static literal `/admin/blog?saved=new` (R1-F15, no slug) and `BlogPost` carries no
  timestamp, so the just-created row cannot be identified to resolve its status. The edit-save case
  carries the slug and fully resolves the state-specific copy.
- The saved flash carries `role="status"` + a manual Dismiss button and must NOT carry
  `data-admin-alert` (avoiding AdminLayout's 6-second auto-hide). It gets no focus steal.
- The error flash carries `role="alert"` + `tabindex="-1"` + `data-error-flash`, is focused once by
  an init script when present, then strips `?error=` from the URL; it must NOT carry
  `data-admin-alert` and is never auto-dismissed.

### Accepted residuals (admin authoring)

- **Slug-collision is a client convenience, not a guarantee (R2-F12).** The add-form's inline
  collision check reads a server-rendered snapshot of existing slugs; the authoritative guard is the
  endpoint's `createOnly` insert (`ON CONFLICT … DO NOTHING` → `400`). A genuine collision is
  therefore only possible under concurrent creation of the same slug between page render and submit,
  and the server rejects it.
- **Body-image alt quality is enforced server-side at publish (R4-F7).** The client module does NOT
  scan body Markdown for image alt text; a publish with a weak or empty in-body image description is
  blocked by `validateBlogData` with a `400`. For a single author this surfaces as a publish-time
  error rather than an inline warning — an accepted residual that keeps the client at faq.astro's
  complexity class.

## Admin API

The blog uses the existing generic content endpoint `POST /api/admin/content` (which also handles
`action=delete`). No new endpoint is added. The endpoint receives small additive changes, which
enter the request path of all existing admin collections — a regression test confirms an existing
collection still saves and deletes (including the header-absent fail-open case).

| Change | Behavior |
|---|---|
| Allowlist | `'blog'` added to `ALLOWED_COLLECTIONS` |
| Origin check | Defense-in-depth CSRF: a mismatched `Origin` or `Sec-Fetch-Site: cross-site` → `403`; **fails open** when both headers are absent. SameSite=Lax remains the primary CSRF defense |
| `_raw` field suffix | A `data.*_raw` field bypasses `parseSimpleValue` type-coercion and is stored as the raw string (used by `data.body_raw`, `data.excerpt_raw`); follows the existing `_csv` / `_lines` convention |
| Blog normalize/validate hook | When `collection='blog'`, runs `normalizeBlogData` then `validateBlogData` (wired like the existing faq/testimonials hooks), passing the **raw pre-default** status |
| `createOnly` guard | When truthy, `INSERT … ON CONFLICT (type, slug) DO NOTHING` + rowCount check; rowCount 0 → `400` "A post with this address already exists…" (used by the blog add-form) |
| Form-based delete | `action='delete'` runs the existing DELETE (allowlist + slug check + cache invalidation) and responds via `responseByFormat` |
| `parseRedirectPath` hardening | Rejects backslash-leading paths (`/\evil.com`) that browsers resolve off-site: `^\/(?![/\\])` |

### Auth

The middleware protects `/admin` and `/api/admin` prefixes:

| Request | Result |
|---|---|
| Unauthenticated JSON request | `401` |
| Unauthenticated `Accept: text/html` | `302` to `/auth/sign-in` (middleware `context.redirect` default — verified; not `303`) |
| Authenticated, non-admin session | `403` (the endpoint's own check) |

### Status requirement

Blog POSTs must carry `status ∈ {draft, published}` **explicitly**. A missing / empty /
whitespace-only status is rejected with `400` "Status must be Draft or Published" — checked first,
against the raw form value, before the endpoint's `status || 'published'` default (which never
applies to blog). The admin form always submits a status, so owners never see this error.

### Validation rules (`validateBlogData`)

- **Always:** explicit status (checked first); valid slug (`^[a-z0-9-_]{1,100}$` AND not
  date-prefixed); non-empty title ≤ 300 chars; length caps (slug ≤ 100, title ≤ 300, excerpt ≤ 1,000,
  body ≤ 200,000).
- **`data.image`, when set:** must match `^(\/(?![/\\])\|https:\/\/)`, else `400`.
- **When `status='published'`:** `excerpt`, `body`, and a valid `date` (`YYYY-MM-DD`, real date) are
  required; if `image` is set, `imageAlt` is required, ≥ 6 chars, not filename-like
  (`/\.(jpg|jpeg|png|gif|webp)$/i`), not a generic word (`/^(image|photo|picture)$/i`);
  **additionally, every image token in the body Markdown must carry alt text meeting the same quality
  bar** (walks the marked token tree, rejects with a plain-language error naming the offending
  image).
- **Drafts** are lenient — title + slug + caps + explicit status only — so owners can save
  half-written posts.

All error messages use plain language and surface through the focused error flash.

### Library (`app/src/lib/blog-content.ts`)

Blog logic lives in one lib file. It consumes `ContentEntry` as-is and does not motivate any change
to `ContentEntry` / `toContentEntry`. Exports:

| Export | Purpose |
|---|---|
| `type BlogPost` | `{ slug, title, date, author, excerpt, body, image?, imageAlt?, seoTitle?, seoDescription?, status }` |
| `normalizeBlogEntry(entry)` | Read-path trust boundary — skips rows with bad slug / missing title-date-excerpt; coerces `''` optionals to `undefined`; nulls `data.image` failing the scheme regex (covers index `<img>`, post `<img>`, and ogImage) |
| `compareBlogPosts(a, b)` | The single ordering implementation (date DESC, slug DESC, undated-last) |
| `getPublishedPosts()` | `db.content.getCollection('blog')` → normalize → sort (public index) |
| `getPublishedPost(slug)` | `db.content.getEntry('blog', slug)` (drafts are `null` via SQL) |
| `getManagedBlogPosts()` | `queryRows` for `type='blog'` with **no status filter** (admin list), uncached |
| `resolveLegacyBlogRedirect(slug)` | Returns the stripped slug when `slug` is date-prefixed AND the stripped target is a published post; `null` otherwise (miss or draft target) |
| `normalizeBlogData(data)` / `validateBlogData(data, title, rawStatus)` | Write-path normalize / validate |
| `renderPostBody(markdown)` | Markdown → sanitized HTML (see [Rendering & Sanitization](#rendering--sanitization)) |
| `escapeXml(s)` / `renderBlogSitemapXml(posts, origin)` | Sitemap urlset builder (kept in-lib so the endpoint is a thin shell) |

## Rendering & Sanitization

`data.body` is rendered server-side only (the public post page + the admin preview), via one
function, `renderPostBody()`:

1. `marked.parse(markdown, { gfm: true, async: false })` with:
   - a **walkTokens** normalization — link/image tokens whose `href`/`src` begins with `www.` get
     `https://` prefixed before sanitization;
   - a **heading renderer override** that (a) demotes body `h1` → `h2` (the page title is the sole
     `<h1>`) and (b) clamps heading-level skips: `depth = min(depth, previousDepth + 1)` with
     `previousDepth` initialized to 1 and **created fresh per `renderPostBody` call** (the admin list
     renders many posts in one request, so module-scope state would bleed across posts). No heading
     `id` is emitted.
2. `DOMPurify.sanitize(html, STRICT_CONFIG)` via `isomorphic-dompurify`.

The body trust boundary is **arbitrary HTML** — `marked` passes raw inline HTML verbatim, so the
realistic hostile input is raw HTML an owner pastes (`<img src=x onerror=...>`, `<svg onload>`,
`<iframe>`, mixed-case `jAvAsCrIpT:`, mXSS), not Markdown-syntax vectors. DOMPurify is the sole
barrier. The stored body is re-sanitized on every render, and `set:html` appears exactly once in
blog code (plus the admin preview call site).

### Strict DOMPurify config (authoritative)

```typescript
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['h2','h3','h4','h5','h6','p','a','ul','ol','li','strong','em','b','i',
                 'blockquote','code','pre','img','hr','br',
                 'table','thead','tbody','tr','th','td','del'],
  ALLOWED_ATTR: ['href','src','alt','title'],   // NO 'id' — heading anchors are cut, so author
                                                // ids must never reach the public page; DOMPurify
                                                // strips every author-supplied id (no DOM-clobbering
                                                // surface; resolved by removal)
  ALLOW_DATA_ATTR: false,   // defaults to TRUE and is checked BEFORE ALLOWED_ATTR — without these,
  ALLOW_ARIA_ATTR: false,   // an authored <p data-admin-alert> survives "strict" sanitization and
                            // trips AdminLayout's auto-remove in the preview; aria spoofing reaches
                            // screen-reader users
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?![/\\]))/i
  // HTTPS-only for body links/images (unifies the body trust boundary with the featured-image
  // policy); NO '#'/fragment alternative (heading anchors cut, so fragment links have no targets);
  // blocks javascript:, data:, vbscript:, protocol-relative, AND the backslash form '/\evil.com'
  // (which WHATWG URL and browsers parse as '//evil.com')
});
```

### URI policy

| Form | Behavior |
|---|---|
| `http:` body links/images | **Blocked** (HTTPS-only) |
| `https:`, `mailto:`, `tel:` | Allowed |
| Site-relative `/page` | Allowed |
| `www.`-leading | Normalized to `https://` (walkTokens) |
| Fragment-only `#section` | **Stripped** (no in-post id targets exist) |
| Non-slash relative `images/x.png`, `../page` | **Blocked** |
| Backslash-leading `/\evil.com` | **Blocked** (in the sanitizer, the write-path image scheme, and the read-path mapper) |
| `javascript:` / `data:` / `vbscript:` / `//evil` | **Blocked** |

The featured-image URL is validated by the same backslash-aware scheme on the write path
(`validateBlogData`) and re-checked on the read path (`normalizeBlogEntry`); the slug charset is
re-checked on the read path. All other fields render through Astro's escaping interpolation.
External links rely on Layout's `ExternalLinkTargetBehavior`; if it does not cover `set:html`
output, a DOMPurify `afterSanitizeAttributes` hook adds `rel="noopener noreferrer"` to external
`<a>`.

No new dependencies — `marked` (^16.1.1) and `isomorphic-dompurify` (^2.26.0) are already installed.

## Draft / Publish Flow

Drafts are invisible to the public (filtered by `status='published'` in SQL) and visible in admin
(the admin read has no status filter). Owners save half-written drafts under lenient validation
(title + slug + caps + explicit status only); publishing enforces excerpt, body, a valid date, and
featured/body-image alt quality. The save → redirect → reopen-preview loop is the only Markdown
verification surface, and the admin preview runs the identical render pipeline as the public page.

## Caching

- **TTL:** the existing 5-minute blog collection TTL is unchanged.
- **Invalidation:** already wired on save and delete (`db.cache.invalidateCollection('blog')`).
- **Serverless semantics:** the cache is in-memory per instance; invalidation fires only in the
  instance that handled the POST. Cached nulls are never served, so a **newly published post's URL is
  live immediately on every instance**; only the index listing and edits/unpublishes of
  already-cached posts lag ≤ 5 minutes on other warm instances. Cross-instance invalidation is out of
  scope. This semantics is surfaced in the admin helper text.
- **Admin reads bypass the cache** (`getManagedBlogPosts` queries directly), so the author always
  sees their own save immediately — which makes the in-admin Preview trustworthy.
- `sitemap-blog.xml` rides the collection cache plus its own `max-age=300`. No long `Cache-Control`
  on `/blog` pages.
- `preloadCommonData` is dead code (zero call sites); blog reads are lazily cached per instance on
  first request.

## SEO

### Redirects

The three legacy 301-to-`/contact` stubs are unwound: `/blog` and `/blog/[slug]` become real pages;
`/resources/blog` 301s to `/blog`; `/resources/blog/[slug]` 301s to `/blog/[slug]`. The existing
301s are served `cache-control: no-cache`, so returning visitors get the new pages on their next
request; the only real recovery lag is Googlebot recrawl, addressed by sitemap submission.

### Origin resolution

One resolver, `resolveSiteOrigin` in `app/src/lib/site-origin.ts`
(`site?.origin` → `process.env.PUBLIC_SITE_URL` → hardcoded prod fallback), is used by `robots.txt`,
the blog sitemap, and the post page's ogImage. `PUBLIC_SITE_URL` is set to
`https://spicebushmontessori.org` in all deploy contexts, and the production build runs with
`PUBLIC_SITE_URL=https://spicebushmontessori.org` so the static `@astrojs/sitemap` origin (baked at
build time) matches the runtime canonical.

### Per-post meta / OG / Twitter / canonical

The post page passes `title={post.seoTitle || post.title}` and
`description={post.seoDescription || post.excerpt}` (using `||`, not `??`). `Layout.astro` accepts
optional props `ogImage`, `ogImageAlt`, `ogType` (default `'website'`), and `publishedTime`:

| Tag | Source |
|---|---|
| `og:image` and `twitter:image` | `ogImage ?? seoMetadata.ogImageUrl` (post featured image, absolute prod-origin URL) |
| `og:image:alt` and `twitter:image:alt` | `ogImageAlt` (post `imageAlt`) — Twitter/X does not read `og:image:alt`, so both are emitted |
| `og:type` | `'article'` for posts |
| `article:published_time` | `{date}T12:00:00Z` ISO value, when `ogType='article'` and set |
| `rel="canonical"`, `meta[name=robots]` | prod-origin canonical; `index, follow` (asserted, not assumed) |

`/blog` is added to `SEO_MANAGED_PAGES` (owner-tunable index meta via `/admin/seo`); individual posts
are not added. Indexability is asserted, not assumed — `meta[name=robots]` must be `index, follow`
with no googlebot-noindex tag on `/blog` and post pages.

### Sitemap

- `/sitemap-blog.xml` (`app/src/pages/sitemap-blog.xml.ts`, `prerender = false`) is a thin shell:
  `getPublishedPosts()` → `renderBlogSitemapXml(posts, origin)` → `Response` with
  `Content-Type: application/xml`, `Cache-Control: public, max-age=300`. Drafts never appear; no
  `lastmod`. The urlset builder and `escapeXml` live in `blog-content.ts` (coverage-measured).
- URLs are **slashless**, matching the canonical form (`normalizePathname`): `{origin}/blog` and
  `{origin}/blog/{slug}` — asserted as exact `<loc>` strings, not substrings. Every interpolated URL
  passes through `escapeXml`.
- The static `@astrojs/sitemap` `filter` excludes the blog URLs (deduped against the blog sitemap),
  the redirected `/resources/blog` and `/resources/blog/*`, and `/admin`, `/admin/*`, `/auth/*` (the
  live `sitemap-0.xml` already discloses the admin and auth surface — a pre-existing issue).
- `robots.txt` appends `Sitemap: {origin}/sitemap-blog.xml`. Search Console submission is the
  recovery mechanism for the unwound 301s.

### Legacy URL preservation

Three layers preserve historical URLs: (1) the six clean slugs restore the Markdown-era URLs; (2) the
date-prefix 301 fallback (`resolveLegacyBlogRedirect`) restores the seed-era URLs live, with its
namespace closed to new owner slugs; (3) `/resources/blog` and `/resources/blog/<slug>` 301 to their
new equivalents (a tolerated 2-hop chain — the second hop strips the date prefix). Any other
pre-Astro URL shapes are checked against old-site archives / Search Console; confirmed shapes get
redirect entries.

## Accessibility

**Admin editor:**

- Every input / textarea / select has an associated `<label>`; short helper texts use
  `aria-describedby` (the body textarea points at a one-sentence summary, with the full Markdown
  guide as in-flow `<details>` content).
- Static `required` on title + slug only; publish-dependent fields carry visible "(required to
  publish)" label text (WCAG 3.3.2) and dynamic `required` toggled by the client module.
- Flash semantics: the error flash uses `role="alert"` + `tabindex="-1"`, focused once then `?error=`
  stripped; the saved flash uses `role="status"` + manual Dismiss, no focus steal. Neither carries
  `data-admin-alert`.
- Dynamic messages: the slug-collision warning is an inline `role="alert"` mutated only on state
  transition; the upload/copy status uses a **permanently rendered, visually-empty**
  `<p aria-live="polite">` node (never `display:none` / `hidden`).
- No required field sits inside a collapsed `<details>`.
- Status badges pair color with text (amber-50/amber-800 "Draft", green-50/green-800 "Published").
- At publish: a featured image requires a quality-checked `imageAlt`, and every body Markdown image
  requires same-quality alt text (server-validated) — no unlabeled or junk-labeled image, featured or
  inline, can ship.

**Public pages:**

- Index: a single `<h1>` ("Blog"); post titles as `<h2>` links; `<time datetime>`; lazy images with
  alt; non-link metadata uses an AA-passing contrast token (`text-earth-brown/80` ≈ 6.4:1, not the
  failing `/70` or `text-gray-400`).
- Post page: `<article>` with exactly one `<h1>`; `.blog-body` links underlined in forest-canopy
  (#3E6D51, 5.98:1, AA) — moss-green and sunlight-gold are not used for body-size text on light
  backgrounds; blockquote / code / pre / table receive minimal `.blog-body` CSS so block semantics
  are visible (no `@tailwindcss/typography`).
- No in-page anchors (heading anchors are not a feature).
- Heading hierarchy is normalized in the renderer (h1→h2 demotion + skip clamp), keeping every legal
  owner save within the heading-hierarchy CI assertion.

## Deferred Features

Each item below is intentionally **out of V1**. The generic content pipeline already does ~90% of the
work; every deferred item would add files, migrations, or UI that the maintainability gate penalizes.

| Deferred | Rationale |
|---|---|
| Categories / tags UI | Owner-deferred; legacy keys are carried opaquely by `baseDataJson`. No blog code names them |
| RSS | No `@astrojs/rss` dependency; a new surface for zero current demand |
| Pagination | 6 posts + a slow cadence; a single list page is correct until post count demands otherwise |
| Scheduled publishing | Draft → manual publish covers the owner workflow |
| Related posts, search, comments, newsletter integration | Each is a feature in itself |
| In-post heading anchors / table of contents / "back to top" fragment links | Documentation-grade for a low-volume school blog, and the root of an author-controlled-`id` security surface; the renderer emits no ids and DOMPurify strips all author ids |
| Rich-text / WYSIWYG editor | A new dependency + a new XSS surface; Markdown + server preview achieves owner confidence within MVP. A V2 candidate only if owners struggle |
| Client-side autosave / restore | Prevention (client validation) replaces recovery; the residual loss risk is recorded below |
| Body-image-alt client scanner | A per-keystroke parallel validation engine with no admin-surface precedent; the server enforces body-image alt quality at publish |
| Featured-image thumbnail preview in the editor | Additive UI with its own load/error/empty states and a11y; the field is text-box-only, matching the staff/media clone source. A high-value V2 candidate |
| `BlogPosting` JSON-LD structured data | Per-post meta + OG/Twitter tags cover V1; a V2 candidate |
| Meta-description length capping / bespoke index meta | Search engines truncate gracefully; the `/blog` index meta is owner-tunable via `/admin/seo` |
| Cross-instance cache invalidation, CDN caching of blog pages, full-site sitemap rebuild | Risk decisions; see [Caching](#caching) and [SEO](#seo) |

## Accepted Residual Risks

- **Create-collision concurrency** — with the blocking `setCustomValidity` slug check, the residual
  state-losing `400` is concurrent-only (two admins creating simultaneously, or a slug created after
  the page's server-rendered slug list was emitted).
- **Single-user body-image-alt publish 400** — an owner who pastes `![](url)` or `![photo](url)` and
  clicks Publish gets a server `400` (the client does not pre-catch body-image alt quality). The
  error flash is focused and names the offending image; no saved-draft state is destroyed.
- **Single top-of-page error flash** — does not name which collapsed form failed (deferred; the rare
  residual errors name the slug or the image). The flash is `role="alert"`, focused once, never
  auto-dismissed.
- **Slug-typo recovery** — slugs are immutable; the recovery path is create-copy-publish-delete, with
  help text in the editor.
- **Saved-flash announcement** — relies on reading-order proximity + `role="status"` (post-redirect
  static markup does not fire a live-region announcement); the error flash is announced via the focus
  call.
- **Two admins editing the same post** — last-write-wins (the existing platform semantics);
  `createOnly` removes the worst case.

## Related Documents

- `docs/adr/008-db-backed-blog.md` — the architecture decision (generic content table, raw-Markdown +
  sanitize-at-render, dynamic sitemap, lean MVP, heading anchors + rich editor explicitly out).
- `docs/specs/api.md` — the `/api/admin/content` endpoint (allowed collections, `_raw` suffix,
  `createOnly`, `action=delete`, origin check, blog's explicit-status requirement).
- `docs/specs/data-model.md` — the `content` table.
- `docs/specs/architecture.md` — stack, build pipeline, brand tokens, and known gotchas.
