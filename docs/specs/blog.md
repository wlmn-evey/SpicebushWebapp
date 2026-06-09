# Blog System Specification

## Overview

The blog is a DB-backed content system that lets non-technical school owners author, draft, and
publish posts from the admin panel at `/admin/blog` with no deploys. Posts are stored as rows in the
generic `content` table (`type = 'blog'`), authored in a TipTap WYSIWYG editor whose HTML is stored
in `data.body` and re-sanitized to safe HTML at request time. The public surface is a blog index at
`/blog` and individual post pages at `/blog/[slug]`.

The blog rides the existing generic content pipeline end to end — the same `content` table, DB
facade, cache layer, admin form-POST endpoint, and media upload system used by other CMS
collections. No new database table and no new admin API endpoint are introduced; the V2 build added
a TipTap rich-text editor (ADR-009) on top of the existing form-POST save path. Blog-specific logic
is concentrated in `app/src/lib/blog-content.ts`.

This spec documents the shipped V2 scope — the WYSIWYG authoring editor, the public discovery layer
(categories, tags, pagination, related posts), SEO/syndication (JSON-LD, RSS, sitemap), and the
admin-controlled news ticker. See [Deferred Features](#deferred-features) for what remains
intentionally out and why.

## Authoring Model

- Posts are authored in a **TipTap WYSIWYG editor** (ADR-009; redesigned to dedicated editor pages in
  ADR-011, #114). The editor's HTML is stored in `data.body`. Bold/italic/underline/strike,
  **highlight** (`<mark>`), **class-based brand text color**
  (`text-forest-canopy|moss-green|sunlight-gold|earth-brown`), H2–H4, lists, blockquote, code blocks,
  **horizontal rules**, links, images, tables, and **class-based** text alignment are first-class. The
  grouped toolbar also has undo/redo and a live word/character count. All color/alignment/highlight
  output is **class-based, never inline `style`** (which stays banned) — see
  [Rendering & Sanitization](#rendering--sanitization).
- Links and images are inserted via **accessible in-editor dialogs** (PR C / #114) — focus-trapped
  `role="dialog"` modals with Esc/backdrop close, replacing the old `window.prompt` boxes. The link
  dialog offers an "open in a new tab" option (`target="_blank"`, both enumerated-safe); the image
  dialog requires alt text. A **live side-by-side preview** renders the body through the same
  `renderBodyHtml` the public page uses, updating as you type.
- The body is **re-sanitized at every render** through `renderBodyHtml` (DOMPurify `STRICT_CONFIG_V2`,
  `app/src/lib/blog-html.ts`) — sanitize-at-render is the trust boundary, never sanitize-at-write only.
  `style` is banned (alignment is class-based; tables `resizable:false`). During the markdown→HTML
  cutover, `renderPostBody` is **transitional**: HTML bodies use `renderBodyHtml`, any not-yet-converted
  legacy markdown still uses the V1 `marked` path (see `docs/runbooks/blog-html-conversion.md`).
- Each post has a **status** of `published` or `draft`. Drafts are excluded from every public read
  by the SQL `status = 'published'` filter and are visible only in the admin list.
- Owners publish, edit, unpublish (flip to draft), and delete posts from `/admin/blog` with no
  deploy. New post URLs go live immediately; the index and edits to already-published posts
  propagate within the 5-minute cache TTL (see [Caching](#caching)).

## Data Model

The blog reuses the existing `content` table unchanged (see `docs/specs/data-model.md` →
`content`). No DDL migration is required. All blog rows use `type = 'blog'`; the unused
`'cms_blog'` collection alias was removed from the DB read allowlist in the Blog V2 build (Phase-1
PR1) — nothing ever read or wrote it.

### Row shape for a blog post

| Column / JSONB key             | Value                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                         | `'blog'`                                                                                                                                                                                                                                                                                                                                           |
| `slug`                         | URL slug, matches `^[a-z0-9-_]{1,100}$`; must NOT match `^\d{4}-\d{2}-\d{2}-` (that prefix shape is reserved for the legacy-redirect namespace); immutable after creation in the admin UI                                                                                                                                                          |
| `title` (column)               | Post title, ≤ 300 chars. Overrides `data.title` on read (via `toContentEntry`)                                                                                                                                                                                                                                                                     |
| `status`                       | `'published'` or `'draft'` — the entire draft/published representation. Blog POSTs must carry an **explicit** status; a missing/empty value is a 400, never a silent publish                                                                                                                                                                       |
| `data.date`                    | `'YYYY-MM-DD'` string — display and sort date                                                                                                                                                                                                                                                                                                      |
| `data.author`                  | string, default `'Spicebush Team'`                                                                                                                                                                                                                                                                                                                 |
| `data.excerpt`                 | string, ≤ 1,000 chars, trimmed                                                                                                                                                                                                                                                                                                                     |
| `data.body`                    | **HTML** string from the TipTap editor, ≤ 200,000 chars (~200 KB), trimmed of leading/trailing whitespace; **stored as authored — the write path does not sanitize** (`normalizeBlogData` only trims; `validateBlogData` checks length/non-empty/image-alt). Sanitize-at-render is the sole trust boundary: the body is sanitized to safe HTML on every render via `renderPostBody` → `renderBodyHtml` (DOMPurify `STRICT_CONFIG_V2`). Not-yet-converted legacy rows still hold V1 Markdown rendered via the transitional `marked` path — see [Authoring Model](#authoring-model)                                                                                                |
| `data.image`                   | optional featured-image URL; must be site-relative or HTTPS absolute, matching `^(\/(?![/\\])\|https:\/\/)`                                                                                                                                                                                                                                        |
| `data.imageAlt`                | alt text; required when `image` is set and status is `published`; must be ≥ 6 chars, not filename-like, not a generic word                                                                                                                                                                                                                         |
| `data.seoTitle`                | optional per-post `<title>` / OG override                                                                                                                                                                                                                                                                                                          |
| `data.seoDescription`          | optional per-post meta-description / OG override                                                                                                                                                                                                                                                                                                   |
| `data.categories`, `data.tags` | string arrays, carried losslessly through the edit passthrough (never mutated on write — R1-F12). The Phase-3 public discovery layer (`blog-discovery.ts`) **reads** them, canonicalizing each label to a slug on read for the `/blog/category/[slug]` + `/blog/tag/[slug]` routes and related-posts ranking; the stored values are never reshaped |
| `author_email`                 | set automatically to the admin's session email on save; `NULL` on the imported legacy rows (rollback discriminator)                                                                                                                                                                                                                                |
| `created_at` / `updated_at`    | imported rows use `{date}T12:00:00Z`; auto-managed otherwise                                                                                                                                                                                                                                                                                       |

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
`app/src/content/config.ts` have been removed (PR-5), now that the public pages are launched and
verified. Blog content lives only in the database (`content` rows with `type='blog'`); the removed
Markdown remains recoverable via git history.

## Public Routes

| Route                    | Description                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/blog`                  | Blog index = **page 1** of the paginated list. Published-post cards (featured image, title link, date, author, excerpt, category/tag chips). Friendly branded empty state at HTTP 200 when no posts. File: `app/src/pages/blog.astro` |
| `/blog/page/[n]`         | Pagination for **n ≥ 2** only; `/blog/page/1` `301`s to `/blog`; an out-of-range or non-integer `[n]` `404`s. Each `n ≥ 2` self-canonicals and is indexable. File: `app/src/pages/blog/page/[n].astro`                                |
| `/blog/category/[slug]`  | Category index (PATH segment, never query params — R4-F15). Indexable at **≥2 members** (`CATEGORY_INDEX_THRESHOLD`); below that, `noindex, follow` (thin content). Self-canonical. File: `app/src/pages/blog/category/[slug].astro`  |
| `/blog/tag/[slug]`       | Tag click-filter — **always `noindex, follow`** and excluded from the sitemap (R1-F21). Self-canonical. File: `app/src/pages/blog/tag/[slug].astro`                                                                                   |
| `/blog/[slug]`           | Individual post page — SSR, sanitized body. File: `app/src/pages/blog/[slug].astro`                                                                                                                                                   |
| `/resources/blog`        | 301 redirect to `/blog`. File: `app/src/pages/resources/blog.astro`                                                                                                                                                                   |
| `/resources/blog/[slug]` | Trivial 301 redirect to `/blog/[slug]`. File: `app/src/pages/resources/blog/[slug].astro`                                                                                                                                             |

### Discovery route behavior (Phase 3 PR2)

- **Canonical-param guard.** Category/tag routes render only when the `[slug]` is ALREADY the
  canonical taxonomy slug (`isCanonicalTaxonomyParam` — `taxonomySlug(raw) === raw`, blog-routes.ts).
  A capital, spaced, or hyphen-noisy param (`/blog/category/Education`) `404`s rather than serving a
  duplicate, so there is exactly ONE indexable URL per taxonomy and its self-referential canonical
  (built path-only by `resolveSeoMetadata`) is always correct.
- **Pagination param.** `parseBlogPageParam` classifies `[n]`: `'1'` → `301 /blog`; a clean integer
  `≥2` → render (range checked by `paginate.isValidPage`, else `404`); everything else (non-integer,
  `'0'`, leading-zero `'02'`) → `404`. `blogPageHref(n)` collapses page 1 to `/blog`.
- **Soft noindex** is driven by the Layout `robots="noindex-follow"` prop (PR1b machinery): tag pages
  always; category pages only below the ≥2 threshold. Indexable pages pass no prop (`index, follow`).
- **a11y (R2-F25).** `Pagination.astro` is a `<nav aria-label="Blog pagination">` of real anchors with
  `aria-current="page"` + bold/underline (non-color affordance) on the active page and `aria-disabled`
  prev/next at the boundaries. Taxonomy/count text is rendered in document order (no `aria-live` — these
  are full-nav routes, not client filters, so a live region would be a no-op).
- **Heading outline (R3-F21).** Each route has a single `<h1>`; `PostCardList` cards use `<h2>` titles
  — no skipped levels.
- **Shared components.** `app/src/components/blog/PostCardList.astro` (cards + chips) and
  `Pagination.astro` are reused by `/blog`, `/blog/page/[n]`, and the category/tag routes.

### Post page behavior

- **Slug hygiene** — if `Astro.params.slug` fails `^[a-z0-9-_]{1,100}$`, return `404` before
  querying.
- **Legacy date-prefix fallback** — on a miss, `resolveLegacyBlogRedirect(slug)` returns the
  stripped slug, and the page `301`s to `/blog/{strippedSlug}` only when the stripped slug resolves
  to a **published** post (no loops, no draft leakage, no redirect-to-404). The write path can never
  mint slugs in this namespace.
- **Missing or draft** → `404` (drafts are indistinguishable from missing by design).
- The post renders `<article>` with a single `<h1>` title, a `<time datetime>` + author byline (the
  byline string is already resolver-resolved on the read path — `resolveAuthorByline`, R4-F9), an
  optional featured `<img>`, then `<div class="blog-body" set:html={renderPostBody(post.body)} />` —
  the only `set:html` in the feature.
- **Post-page surfaces (Phase 3 PR3)**, appended after the body, each an `<h2>` section under the
  single `<h1>` (heading outline continuous — R3-F21):
  - **Taxonomy chips** (`TaxonomyChips.astro`) — the post's own category/tag links (same component the
    index cards use).
  - **Share** (`ShareButtons.astro`) — NAMED anchors for X / Facebook / email, each with an accessible
    name (R3-F23); links are built from the ABSOLUTE canonical URL with `encodeURIComponent` on both
    URL and title (`buildShareLinks`, blog-share.ts) and work without JS. A **Copy-link** button uses
    `navigator.clipboard` (secure context) and announces success/failure into a `aria-live="polite"`
    status region; with no JS / no clipboard it degrades to a no-op (the named anchors still work).
  - **Related posts** (`RelatedPosts.astro`) — up to 3 from `getRelatedPosts` (shared taxonomy, recency
    tiebreak, self + zero-overlap excluded); the section is omitted when there are none.
- **Author bios are deferred** (issue #100) — no author registry / admin exists yet, so all posts use
  the `data.author` fallback and no bio block renders. The render-time bio sanitizer is built with that
  feature, against a real caller.

The Footer link to `/blog` (`app/src/components/Footer.astro:141`) is unchanged — making `/blog`
real fixes the previously-broken link that 301'd to `/contact`.

## Admin Routes

| Route                     | Description                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/blog`             | Blog dashboard — a scannable list of all posts (four lifecycle groups) with bulk + per-row lifecycle actions and a **New Post** button. File: `app/src/pages/admin/blog.astro` |
| `/admin/blog/new`         | Dedicated new-post editor. File: `app/src/pages/admin/blog/new.astro`                                                                                          |
| `/admin/blog/edit/[slug]` | Dedicated editor for an existing post. File: `app/src/pages/admin/blog/edit/[slug].astro`                                                                      |
| `POST /api/admin/content` | Generic content endpoint (existing) — the blog uses it via `collection=blog`. File: `app/src/pages/api/admin/content.ts`                                       |

The list and the editor share the `AdminLayout` wrapper and the `?saved=` / `?error=` flash params.
The editor form lives in one shared component, `app/src/components/admin/BlogEditorForm.astro` (used
by both `new` and `edit`), so the field set is authored once. The **#114 admin redesign** replaced
the accordion add/edit forms that previously lived inline on the list page with these dedicated
editor pages (it preserved the form-POST contract, field names, validation, upload widget, and flash
logic exactly — only the layout changed). A link to `/admin/blog` (label "Blog") is in
`app/src/components/AdminNav.astro` under "Content".

### Page structure

The dashboard and the editor are separate pages (#114 redesign):

- **List (`/admin/blog`)** — four lifecycle groups (Published, Scheduled, Drafts, Archived), each a
  scannable list of rows ordered by `compareBlogPosts`. Every row with `type='blog'` is shown
  regardless of status (any non-`published`/`scheduled`/`archived` value sorts under Drafts). Each
  row shows the title (a link to the editor), a four-state status badge (color paired with AA-passing
  text), the date, an optional "N views" badge (published only), per-row quick actions (View on site,
  Archive/Restore, Delete), and an **Edit** link. A **New Post** button opens the editor.
- **Editor (`/admin/blog/new`, `/admin/blog/edit/[slug]`)** — the shared `BlogEditorForm.astro`
  renders the title + TipTap body in the main column and **all metadata in an always-visible
  sidebar** (status + schedule, date, slug, author, excerpt, featured image + alt, SEO; categories
  and tags shown read-only when present). Nothing is hidden in `<details>`. The form posts to
  `/api/admin/content`: `new` carries `createOnly=true` and `redirectTo=/admin/blog?saved=new`; `edit`
  carries the post's `slug` (hidden), `baseDataJson`, and `redirectTo=/admin/blog?saved=<slug>`. The
  status `<select>` renders `selected` matching the post's EXACT status, so an untouched edit retains
  it. The slug is editable on `new` (with the collision check) and read-only on `edit`; a missing slug
  on `edit` redirects to the list with an error flash.
- **Preview** — the TipTap editor's Preview button toggles a **live side-by-side preview** pane (PR C)
  that renders the current body through `renderBodyHtml` (the same render-time pipeline the public page
  uses) and updates as you type; it stacks below the editor on narrow screens. The separate
  server-rendered accordion preview was removed with the accordions.
- **Delete** — a per-row form on the list posts `action=delete`, `collection=blog`, `slug`,
  `redirectTo=/admin/blog?saved=deleted`, with a confirmation prompt.

### Form field names

The exact form field names are exported from a single source-of-truth module,
`app/src/lib/blog-form-fields.ts` (`collection`, `slug`, `title`, `status`, `createOnly`,
`redirectTo`, `baseDataJson`, `action`, `data.date`, `data.author`, `data.excerpt_raw`,
`data.body_raw`, `data.image`, `data.imageAlt`, `data.seoTitle`, `data.seoDescription`). The admin
page, the client validation module, and the handler-integration test all reference field names
through this module so drift fails a test.

### Layout constraints

- Every field is **always visible** on the editor page — none lives inside a collapsed `<details>`
  (the #114 redesign removed the accordions). The status `<select>` and all conditionally-required
  fields (date, excerpt, body, image, imageAlt) sit in the always-visible main column / sidebar, so a
  required control can never be hidden in a collapsed, unfocusable disclosure (which can be silently
  un-submittable in Chrome).
- The excerpt textarea is authored with tight interpolation
  (`<textarea …>{post.excerpt}</textarea>`, zero whitespace) under a `<!-- prettier-ignore -->` guard,
  because the `_raw` form path deliberately skips the parser's trim; `normalizeBlogData` is the
  backstop trim. (The body is the TipTap island's hidden field, not a textarea.)

### Featured image (media system reuse)

The featured-image widget mirrors `app/src/pages/admin/staff.astro`: a text input holds the public
URL path, with an inline upload widget that POSTs to `/api/media/upload` (FormData: `file`, `title`,
`category='blog'`, `createPhotoEntry='true'`). On success it sets the URL input (dispatching an
`input` event so conditional validation re-runs), surfaces a "Image attached — save the post to keep
it." status in a live region, and offers a "Copy address" affordance plus a "(opens in a new tab)"
crop link to `/admin/media`. Inline **post-body** images are inserted via the editor's **image
dialog** (PR C / #114): an accessible modal with an address field, a "Media (opens in a new tab)"
link to `/admin/media`, and a **required alt-text** field (Insert is disabled until both are filled)
— no more `window.prompt`. The photo category `'blog'` already exists in `app/src/types/photo.ts`.

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

| Change                        | Behavior                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowlist                     | `'blog'` added to `ALLOWED_COLLECTIONS`                                                                                                                                                         |
| Origin check                  | Defense-in-depth CSRF: a mismatched `Origin` or `Sec-Fetch-Site: cross-site` → `403`; **fails open** when both headers are absent. SameSite=Lax remains the primary CSRF defense                |
| `_raw` field suffix           | A `data.*_raw` field bypasses `parseSimpleValue` type-coercion and is stored as the raw string (used by `data.body_raw`, `data.excerpt_raw`); follows the existing `_csv` / `_lines` convention |
| Blog normalize/validate hook  | When `collection='blog'`, runs `normalizeBlogData` then `validateBlogData` (wired like the existing faq/testimonials hooks), passing the **raw pre-default** status                             |
| `createOnly` guard            | When truthy, `INSERT … ON CONFLICT (type, slug) DO NOTHING` + rowCount check; rowCount 0 → `400` "A post with this address already exists…" (used by the blog add-form)                         |
| Form-based delete             | `action='delete'` runs the existing DELETE (allowlist + slug check + cache invalidation) and responds via `responseByFormat`                                                                    |
| `parseRedirectPath` hardening | Rejects backslash-leading paths (`/\evil.com`) that browsers resolve off-site: `^\/(?![/\\])`                                                                                                   |

**`/api/admin/settings` CSRF (Phase 6, R2-F1 / closes #85).** The generic settings endpoint now carries
the **same** defense-in-depth Origin / `Sec-Fetch-Site: cross-site` → `403` check (fails open when both
headers absent), copied from the content endpoint. This hardens all ~16 same-origin admin settings
forms (camp, testimonials, seo, ticker) — verified none is cross-origin, so none breaks. The endpoint
still validates the **key** only (`^[a-zA-Z0-9_]+$`), never the value — so the ticker's value-level
safety (href scheme, expiry, ≤5) is enforced at render in `getActiveTickerItems`, not here. Authoring
UI: `/admin/ticker` (full Ticker spec section added in the Phase-6 docs PR).

### Auth

The middleware protects `/admin` and `/api/admin` prefixes:

| Request                             | Result                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Unauthenticated JSON request        | `401`                                                                                  |
| Unauthenticated `Accept: text/html` | `302` to `/auth/sign-in` (middleware `context.redirect` default — verified; not `303`) |
| Authenticated, non-admin session    | `403` (the endpoint's own check)                                                       |

### Status requirement

Blog POSTs must carry `status ∈ {draft, published, scheduled, archived}` **explicitly** (Phase-2
four-state lifecycle, R2-F11). A missing / empty / whitespace-only / unknown status is rejected with
`400` "Status must be Draft, Published, Scheduled, or Archived" — checked first, against the raw form
value, before the endpoint's `status || 'published'` default (which never applies to blog). The admin
form always submits a status, so owners never see this error. Migration `016_blog_status_check.sql`
adds a **type-scoped** DB CHECK
(`type <> 'blog' OR status IN ('draft','published','scheduled','archived')`) as defense-in-depth
behind this gate and behind the exact-match `WHERE status = 'published'` public read filter — scoped
to blog rows so the shared `content.status` column does not couple other content types to the blog
lifecycle.

- **`published`** — live on every public surface.
- **`draft`** — exempt from the publish requirements below; invisible publicly.
- **`scheduled`** — passes the FULL publish gate at SAVE time (R1-F1): it goes live unattended, so it
  must be publish-ready now AND carry a future `data.publishedAt`. Invisible publicly until the
  every-5-min scheduled-publish cron flips it to `published`
  (`netlify/functions/publish-scheduled-blog-posts.ts` → `blog-scheduled-publish.ts`; see
  `docs/runbooks/scheduled-publish.md`).
- **`archived`** — non-publishing (exempt like a draft) and **reversible**: round-trips back to
  `draft`/`published` through the normal save path (R4-F12), so it is never a one-way trip.

#### Scheduled publish timestamp (`data.publishedAt`) — R4-F1

A `scheduled` save additionally requires `data.publishedAt`: an ISO-8601 date-time with an explicit
zone (`Z` or `±HH:MM`; seconds/millis optional) that is a real instant in the **future**. A bare
`datetime-local` (no zone) is rejected — the authoring form attaches a zone before saving (UTC
contract). This format contract lives in `app/src/lib/blog-publish-schedule.ts`
(`isScheduledPublishAtFormat` / `isFutureScheduledPublishAt` / `isDueScheduledPublishAt`) and is
imported by BOTH `validateBlogData` (save gate) and the scheduled-publish cron (fire predicate),
so a post that saves cleanly is exactly the set the cron will fire — one contract, no drift.

#### Authoring the lifecycle (`BlogEditorForm.astro` + `blog-admin-client.ts`)

The editor's status dropdown exposes all four statuses. Each edit option's
`selected` matches the post's EXACT status (R3-F10) — the prior `selected={post.status !== 'draft'}`
would have silently published a scheduled/archived post on an untouched save. Scheduling specifics:

- A **datetime-local** "Go live on (your local time)" control appears only while status = Scheduled;
  the client toggles its visibility AND its `required` in **lockstep** (a hidden-but-`required`
  control is silently unsubmittable, so the markup carries no static `required`).
- On submit the client converts the local pick to UTC-`Z` (`localInputToUtcIso`, offset read from
  the target date for DST correctness) into a hidden `data.publishedAt`; the edit form pre-fills the
  visible control back from the stored UTC (`utcIsoToLocalInput`) so the owner sees the local time
  they picked, not raw UTC. Both helpers are pure (offset injected) and unit-tested.
- **Two-gesture reconciliation (R2-F19):** choosing Published while a future time is set prompts an
  overridable `confirm()` ("this publishes now, not at that time") so a future date never silently
  publishes-now. `archived` is selectable here and round-trips to Draft/Published via a normal save.

#### Dashboard (`/admin/blog` list — scannable rows, #114 redesign)

The list is a scannable set of rows that link to the dedicated editor — the **#114 redesign**
replaced the per-post `<details>` accordion edit forms, **superseding the earlier R3-F15
keep-accordion choice**. Lifecycle management stays in place: posts are grouped into four sections
(Published, Scheduled, Drafts, Archived); each row carries a four-state status badge and per-row
quick actions —
**Archive** (any non-archived) / **Restore to draft** (archived, R4-F12) — that POST the
`action=archive`/`action=restore` endpoints. **Bulk** select uses a checkbox per row associated via
`form="bulk-blog-form"` (HTML forbids nesting them in the per-post edit forms) and a toolbar whose
Archive/Delete buttons POST `bulk-archive`/`bulk-delete`; the client adds a **count-aware,
irreversibility-naming `confirm()`** ("Delete N posts? This cannot be undone.", R4-F14) and blocks an
empty selection. Buttons carry `data-no-loading` so a cancelled confirm never leaves them disabled.

**Per-post view counts (Phase 5, R1-F13/R3-F3).** Each PUBLISHED post's summary shows an
approximate "N views" badge from `getBlogPostViewCounts(publishedSlugs)`, which aggregates
`event_name = 'page_view'` rows from the EXISTING `analytics_events` table — **no new schema**. The
count is **constrained in SQL to `/blog/{slug}` for the published slugs** (`page_path = ANY($1)`), so a
fabricated `/blog/<phantom>` event row is never counted (R3-F3); the SQL constraint is the trust
boundary. Only published posts have a public page, so only they carry the badge. The rendered value is
a NUMBER (Astro auto-escaped) — no raw `page_path` is ever rendered, so there is no hostile-string
surface. Counts are labelled **best-effort/forgeable** (a `title` tooltip notes they can be over- or
under-counted) — client-fired analytics, not an authoritative figure.

#### Author byline (`resolveAuthorByline`) — R4-F9

The display byline resolves as: `registry.get(author_ref)` when `data.author_type` + `data.author_ref`
are both present AND resolve against the author registry (`settings.blog_authors`); otherwise the
legacy `data.author` string (default `'Spicebush Team'`). The 6 live posts carry only `data.author`
(no `author_type`/`author_ref`), so they always take the fallback and their bylines are preserved
byte-for-byte (6-byline regression test). Ordering tiebreak: posts sharing a calendar `date` order by
`data.publishedAt` DESC before the slug tiebreak (R1-F17), a no-op for legacy posts that carry none.

### Public discovery helpers (`blog-discovery.ts`) — Phase 3

Pure functions over the already-published, already-sorted `BlogPost[]`:

- **Taxonomy canonicalization (R1-F3).** `taxonomySlug(label)` slugifies a free-text category/tag
  (lowercase → hyphenate spaces → strip to `[a-z0-9-]` → collapse/trim hyphens). `buildTaxonomy`
  groups posts by slug — variant spellings collapse to one group; a post counts once per slug — and
  picks the display label by a stable **collision rule**: most frequent raw label, ties alphabetical.
  Taxonomy is canonicalized on read, never rejected.
- **Category index threshold (R1-F31).** `indexableCategories` keeps categories with
  `≥ CATEGORY_INDEX_THRESHOLD` (= 2) members; below that a category route renders `noindex` (thin
  content). Category routes are PATH segments `/blog/category/[slug]` (R4-F15). Tags are a click-filter
  and `noindex` (R1-F21) — never sitemapped index routes.
- **Robots three-state (`softNoIndex`).** `resolveSeoMetadata` resolves one of three robots states:
  `index, follow` (default), soft `noindex, follow` (crawl links but don't index — thin/duplicate
  routes: paginated pages, tag filters, below-threshold categories), or hard `noindex, nofollow`
  (site-wide kill switch or a per-page DB override). A page opts into soft via the `Layout`
  `robots="noindex-follow"` prop, which passes `softNoIndex: true`. **Hard always wins** — `softNoIndex`
  only applies when the page isn't already hard-noindexed, and `ResolvedSeoMetadata.noIndex` keeps its
  prior meaning (hard only). The rendered `<meta name="googlebot">` is derived from `robotsContent`
  (`googlebotContent`, rendered only when noindex), so the two tags can never disagree. PR1b adds the
  machinery as a no-op (no route passes the prop yet); routes opt in in PR2.
- **Pagination (R3-F19 / R4-F10).** `paginate(items, page, BLOG_PAGE_SIZE)` with `BLOG_PAGE_SIZE` = 10
  (≥10 so the 6-post corpus is a single page — `/blog` shows all 6). An out-of-range / non-integer
  page is flagged `isValidPage:false` (the route 404s) while still returning a clamped renderable page;
  a one-page list reports no prev/next.
- **Related posts.** `getRelatedPosts(post, all, limit)` ranks other posts by shared category/tag
  count, then input (recency) order; excludes self and zero-overlap; a post with no taxonomy gets none.

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

| Export                                                                 | Purpose                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type BlogPost`                                                        | `{ slug, title, date, author, excerpt, body, image?, imageAlt?, seoTitle?, seoDescription?, status }`                                                                                                                  |
| `normalizeBlogEntry(entry)`                                            | Read-path trust boundary — skips rows with bad slug / missing title-date-excerpt; coerces `''` optionals to `undefined`; nulls `data.image` failing the scheme regex (covers index `<img>`, post `<img>`, and ogImage) |
| `compareBlogPosts(a, b)`                                               | The single ordering implementation (date DESC, slug DESC, undated-last)                                                                                                                                                |
| `getPublishedPosts()`                                                  | `db.content.getCollection('blog')` → normalize → sort (public index)                                                                                                                                                   |
| `getPublishedPost(slug)`                                               | `db.content.getEntry('blog', slug)` (drafts are `null` via SQL)                                                                                                                                                        |
| `getManagedBlogPosts()`                                                | `queryRows` for `type='blog'` with **no status filter** (admin list), uncached                                                                                                                                         |
| `resolveLegacyBlogRedirect(slug)`                                      | Returns the stripped slug when `slug` is date-prefixed AND the stripped target is a published post; `null` otherwise (miss or draft target)                                                                            |
| `normalizeBlogData(data)` / `validateBlogData(data, title, rawStatus)` | Write-path normalize / validate                                                                                                                                                                                        |
| `renderPostBody(markdown)`                                             | Markdown → sanitized HTML (see [Rendering & Sanitization](#rendering--sanitization))                                                                                                                                   |
| `escapeXml(s)` / `renderBlogSitemapXml(posts, origin)`                 | Sitemap urlset builder (kept in-lib so the endpoint is a thin shell)                                                                                                                                                   |

## Rendering & Sanitization

`data.body` is rendered server-side only (the public post page + the admin preview), via
`renderPostBody()`. For V2 HTML bodies it delegates to `renderBodyHtml` (DOMPurify
`STRICT_CONFIG_V2`, `app/src/lib/blog-html.ts`; see [Authoring Model](#authoring-model)); for
not-yet-converted legacy Markdown rows it runs the transitional `marked` path detailed below:

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

### Render-time sanitizer config — `STRICT_CONFIG_V2` (authoritative)

Every TipTap/HTML body renders through `renderBodyHtml` → `DOMPurify.sanitize(html, STRICT_CONFIG_V2)`
(`app/src/lib/blog-html.ts`). This is the authoritative steady-state config:

```typescript
// app/src/lib/blog-html.ts
export const STRICT_CONFIG_V2 = {
  ALLOWED_TAGS: [
    // V1 baseline:
    'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
    'blockquote', 'code', 'pre', 'img', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del',
    // V2 delta: underline/strike, table column groups, then PR B (#114) highlight + brand-color span
    'u', 's', 'colgroup', 'col', 'mark', 'span'
  ],
  // NO 'id', NO 'style'. class/target/rel are admitted by NAME then VALUE-ENUMERATED by the hook below.
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  // https/mailto/tel/site-relative (NOT https-only — live posts carry mailto:/tel:, R3-F1). Blocks
  // javascript:/vbscript:/protocol-relative and the backslash form '/\evil.com' (parsed as '//evil.com').
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?![/\\]))/i,
  // Mark structural/enumerated attrs URI-safe so the URI regexp gates only true URIs (href/src).
  ADD_URI_SAFE_ATTR: ['class', 'target', 'rel', 'colspan', 'rowspan']
};
```

A `uponSanitizeAttribute` hook (`enumerateBodyAttrs`) value-restricts the by-name-only attributes —
registered around each sanitize call and removed in a `finally` so it never leaks to another path:

- **`class`** → kept tokens limited to code-block language hints (`language-*`), the four text-align
  classes (`text-left|center|right|justify`), and the four brand text-color classes
  (`text-forest-canopy|moss-green|sunlight-gold|earth-brown`). Any other token is dropped; an empty
  result drops the `class` attribute entirely. So `<span>`/`<mark>` can never carry anything but an
  allowlisted **presentational class** — no inline `style`, no utility-class/CSS-injection abuse.
- **`rel`** → `noopener|noreferrer|nofollow`; **`target`** → `_blank|_self`; anything else dropped.
- **`src`/`href`** → `data:` rejected (DOMPurify otherwise admits `data:` on its default image tags
  regardless of `ALLOWED_URI_REGEXP`).

> **Legacy markdown path (transitional).** Not-yet-converted legacy markdown bodies still render via
> `renderMarkdownToHtml` (`marked` → `DOMPurify.sanitize(html, STRICT_CONFIG)`), whose V1
> `STRICT_CONFIG` is **narrower** (`ALLOWED_ATTR: ['href','src','alt','title']`; no `class`/`target`/
> `rel`, no `u`/`s`/`mark`/`span`, no enumeration hook). It is retained only until the markdown→HTML
> conversion is fully ratified (see `docs/runbooks/blog-html-conversion.md`); the steady-state
> config for the primary path is `STRICT_CONFIG_V2` above.

### URI policy

| Form                                             | Behavior                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `http:` body links/images                        | **Blocked** (HTTPS-only)                                                              |
| `https:`, `mailto:`, `tel:`                      | Allowed                                                                               |
| Site-relative `/page`                            | Allowed                                                                               |
| `www.`-leading                                   | Normalized to `https://` (walkTokens)                                                 |
| Fragment-only `#section`                         | **Stripped** (no in-post id targets exist)                                            |
| Non-slash relative `images/x.png`, `../page`     | **Blocked**                                                                           |
| Backslash-leading `/\evil.com`                   | **Blocked** (in the sanitizer, the write-path image scheme, and the read-path mapper) |
| `javascript:` / `data:` / `vbscript:` / `//evil` | **Blocked**                                                                           |

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

| Tag                                    | Source                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `og:image` and `twitter:image`         | `ogImage ?? seoMetadata.ogImageUrl` (post featured image, absolute prod-origin URL)          |
| `og:image:alt` and `twitter:image:alt` | `ogImageAlt` (post `imageAlt`) — Twitter/X does not read `og:image:alt`, so both are emitted |
| `og:type`                              | `'article'` for posts                                                                        |
| `article:published_time`               | `{date}T12:00:00Z` ISO value, when `ogType='article'` and set                                |
| `rel="canonical"`, `meta[name=robots]` | prod-origin canonical; `index, follow` (asserted, not assumed)                               |

`/blog` is added to `SEO_MANAGED_PAGES` (owner-tunable index meta via `/admin/seo`); individual posts
are not added. Indexability is asserted, not assumed — `meta[name=robots]` must be `index, follow`
with no googlebot-noindex tag on `/blog` and post pages.

### Sitemap

- `/sitemap-blog.xml` (`app/src/pages/sitemap-blog.xml.ts`, `prerender = false`) is a thin shell:
  `getPublishedPosts()` → `renderBlogSitemapXml(posts, origin)` → `Response` with
  `Content-Type: application/xml`, `Cache-Control: public, max-age=300`. Drafts never appear; no
  `lastmod`. The urlset builder and `escapeXml` live in `blog-content.ts` (coverage-measured).
- URLs are **slashless**, matching the canonical form (`normalizePathname`): `{origin}/blog`, each
  `{origin}/blog/{slug}`, each pagination page `{origin}/blog/page/{n}` for **n ≥ 2** (never
  `/blog/page/1` — R3-F19), and each **indexable** category `{origin}/blog/category/{slug}` (≥2
  members — R1-F31, via `indexableCategories`). **Tags and below-threshold categories are EXCLUDED**
  (they render `noindex` — R1-F21). Every route appears exactly once (R1-F28). Asserted as exact
  `<loc>` strings, not substrings; every interpolated URL passes through `escapeXml`.
- The static `@astrojs/sitemap` `filter` excludes the blog URLs (deduped against the blog sitemap),
  the redirected `/resources/blog` and `/resources/blog/*`, and `/admin`, `/admin/*`, `/auth/*` (the
  live `sitemap-0.xml` already discloses the admin and auth surface — a pre-existing issue).
- `robots.txt` appends `Sitemap: {origin}/sitemap-blog.xml`. Search Console submission is the
  recovery mechanism for the unwound 301s.

### Feeds & structured data (Phase 4)

- **RSS feed** — `/blog/rss.xml` (`app/src/pages/blog/rss.xml.ts`, `prerender = false`; the static
  path wins over `/blog/[slug]`). `getPublishedPosts()` → `renderBlogRssXml(posts, origin)` → RSS 2.0
  with an `atom:self` link, one `<item>` per post (title, link, permalink `<guid>`, excerpt
  `<description>`, RFC-822 `<pubDate>` from `toRfc822Date` at noon UTC), all XML-escaped.
  `<lastBuildDate>` is the newest post's date (deterministic, no `Date.now()`). Auto-discovered via a
  `<link rel="alternate" type="application/rss+xml">` in the blog `<head>` (Layout `feedUrl` prop).
- **JSON-LD Article** — each post page emits a `BlogPosting` block (`buildArticleJsonLd(post, origin)`)
  ALONGSIDE the site-wide `EducationalOrganization` block (R2-F24), via the Layout `jsonLd` prop.
  Serialized with `serializeJsonLd` = `JSON.stringify` + `<`/`>`/`&`/U+2028/U+2029 → `\uXXXX`
  (inline-`<script>`-safe, NOT `escapeXml`; round-trips through `JSON.parse` — R1-F29). `headline` is
  clamped ≤110 chars from the **title** (never the 160-cap `seoTitle` — R4-F17); `datePublished` =
  post date at noon UTC; `dateModified` = the normalized `updated_at` (`isoOrNull`, falling back to
  `datePublished` — R3-F18); `image` (absolutized) only when a featured image exists; `author` and
  `publisher` are Organizations. A paired `article:modified_time` OG tag uses the same value.
- **`updated_at` plumbing (R3-F18)** — `content.updated_at` is carried through the generic
  `toContentEntry` as `ContentEntry.updatedAt` (raw passthrough; the DB driver's format is not
  guaranteed) and surfaced as `BlogPost.updatedAt`; ISO normalization happens only at the JSON-LD
  point of use. The 6 legacy posts' `updated_at` reflects the cutover date, so their `dateModified`
  is the cutover instant (semantically correct — the body was rewritten then).

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
- **Skip-to-main link (R4-F18)** — `Header.astro` renders a `Skip to main content` link as the first
  focusable element, visually hidden (`.sr-only`) until focused, targeting `#main-content` (present on
  every page that renders the shared `Header`). It lets keyboard/SR users bypass the header chrome
  (including the ticker strip + its controls). Explicit `focus:` styles ensure it shows regardless of
  the global `.sr-only` override (`focus:not-sr-only` wins on specificity; `focus:fixed` avoids shift).

## Ticker (Phase 6)

A rotating "News" strip the owner controls from `/admin/ticker`. **Ships OFF and inert** — nothing
renders publicly until the owner adds items **and** enables it.

### Storage & reads

- **No table.** Two `settings` JSONB keys: `ticker_items` (a `TickerItem[]`) and `ticker_enabled`
  (bool, default `false`). Reorder is array index order — no `sort_order` column.
- `TickerItem` = `{ text, href?, expiresAt?, type? }`. `type` (`info|event|closure`) is organisation
  metadata only — **not rendered publicly** (decision D5=A — sidesteps WCAG 1.4.1 color-coding,
  R4-F20); a future PR could surface it as an icon+label indicator.
- **5-minute TTL (R4-F11).** `getActiveTickerItems` / `getTickerEnabled` read via
  `getSetting(key, 5*60*1000)` — never `getAllSettings()` (whose `setting:all` blob caches 30 min and
  whose per-key cache ignores `maxAge`). So the ticker is no staler than the 5-min AnnouncementBar.
  Cross-instance propagation rides the 5-min TTL (the single-instance `invalidateSettings()` clears
  `setting:*` on write; the TTL is the contract, not the test).

### Render-time trust boundary (`getActiveTickerItems`, R1-F2/R3-F4)

The `/api/admin/settings` endpoint validates the **key** only (`^[a-zA-Z0-9_]+$`), never the value, so
**all** value-level safety is enforced at render: drop empty-text + past-`expiresAt` items, **strip an
unsafe `href`** (the item still renders as inert text), cap text to 200 chars, cap to **5** items.
The href allowlist `LINK_HREF_REGEX = /^(?:https:|mailto:|tel:|\/(?![/\\]))/i` allows
https/mailto/tel/site-relative and blocks `javascript:`/`data:`/protocol-relative `//` — **duplicated**
from `blog-html.ts` `ALLOWED_URI_REGEXP` (R3-F1 "tightening forbidden", so not shared); a parity test
pins them. The validator strips `[\t\n\r]` **before** the regex (browsers strip those from URLs, so
`/⇥/evil.com` would reconstitute to `//evil.com` — an open-redirect the naked regex misses).

### Public render (`Ticker.astro`)

- One shared component, `variant: strip | section`. **Inert when empty** (`{items.length > 0 && …}`,
  mirroring `AnnouncementBar`); `getSetting` returns `null` on a DB error → inert even on a hiccup.
- Mounted as a **site-wide header strip** (after `AnnouncementBar`, independent stacking — R2-F21) and
  a **homepage section** (top of `<main>`). The two carousels carry distinct accessible names.
- Rotator (vanilla per-instance script): Pause/Play **action** button (label states the action, no
  `aria-pressed`), prev/next, **reduced-motion gate** (`prefers-reduced-motion` → no auto-advance, nav
  still works — R1-F32), **state-dependent `aria-live`** (`off` while auto-advancing, `polite` when
  paused — R3-F20), and pause-on-focus/hover with **reference-counted** sources (a release of one
  source doesn't resume while the other is still active). Non-current items are `display:none`
  (removed from the a11y tree). `text`/`href` are Astro auto-escaped.

### Admin (`/admin/ticker`) + endpoint CSRF

Mirrors `admin/announcements`: enable/disable is a native no-JS form; the items editor is JS-driven
(text/link/expiry/type per item, Add/Remove, keyboard **Move up/down** with an `aria-live` confirmation
— R1-F35) and serializes the rows into the `ticker_items` JSON on submit. Initial items are passed via
an **auto-escaped `data-` attribute** (not an inline `<script>`) — no admin self-XSS. The endpoint got
the defense-in-depth Origin/CSRF check (R2-F1 / #85 — see Admin API above).

## Deferred Features

Each item below was intentionally **out of V1**. The generic content pipeline already did ~90% of the
work; every deferred item would have added files, migrations, or UI that the maintainability gate
penalized.

> **V2 update (Phases 2–6, 2026-06).** Blog V2 **shipped** several items once listed below — the
> TipTap WYSIWYG editor (ADR-009), scheduled publishing, categories/tags discovery + pagination +
> related posts, RSS, `BlogPosting` JSON-LD, and the ticker. The table is kept as the V1 rationale
> snapshot; the live behavior is documented in the sections above. **AI writing + voice** remains
> deferred — see the new row below and issue #110.

| Deferred                         | Rationale                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI writing + voice (Phase 7)** | Deferred per owner (2026-06-09): the school must supply its own paid **Anthropic API key**, and may not want it. `/admin/blog` shows a non-functional "Coming Soon" panel; the full build-ready spec is **issue #110**. No code, key, or cost until the org commits |

| Deferred                                                                                | Rationale                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories / tags UI                                                                    | Owner-deferred; legacy keys are carried opaquely by `baseDataJson`. No blog code names them                                                                                 |
| RSS                                                                                     | No `@astrojs/rss` dependency; a new surface for zero current demand                                                                                                         |
| Pagination                                                                              | 6 posts + a slow cadence; a single list page is correct until post count demands otherwise                                                                                  |
| Scheduled publishing                                                                    | Draft → manual publish covers the owner workflow                                                                                                                            |
| Related posts, search, comments, newsletter integration                                 | Each is a feature in itself                                                                                                                                                 |
| In-post heading anchors / table of contents / "back to top" fragment links              | Documentation-grade for a low-volume school blog, and the root of an author-controlled-`id` security surface; the renderer emits no ids and DOMPurify strips all author ids |
| Rich-text / WYSIWYG editor                                                              | A new dependency + a new XSS surface; Markdown + server preview achieves owner confidence within MVP. A V2 candidate only if owners struggle                                |
| Client-side autosave / restore                                                          | Prevention (client validation) replaces recovery; the residual loss risk is recorded below                                                                                  |
| Body-image-alt client scanner                                                           | A per-keystroke parallel validation engine with no admin-surface precedent; the server enforces body-image alt quality at publish                                           |
| Featured-image thumbnail preview in the editor                                          | Additive UI with its own load/error/empty states and a11y; the field is text-box-only, matching the staff/media clone source. A high-value V2 candidate                     |
| `BlogPosting` JSON-LD structured data                                                   | Per-post meta + OG/Twitter tags cover V1; a V2 candidate                                                                                                                    |
| Meta-description length capping / bespoke index meta                                    | Search engines truncate gracefully; the `/blog` index meta is owner-tunable via `/admin/seo`                                                                                |
| Cross-instance cache invalidation, CDN caching of blog pages, full-site sitemap rebuild | Risk decisions; see [Caching](#caching) and [SEO](#seo)                                                                                                                     |

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
