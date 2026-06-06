# Implementation Plan: DB-Backed Blog MVP (post-Round-4, completeness-pass canonical)

Base: the **simplicity-first** plan (judge winner) with verified grafts (v1), revised in stress round 1 (45 findings), round 2 (40 findings), round 3 (24 findings), and round 4 (29 findings, dominated by scope cuts). All paths relative to `/Users/eveywinters/CascadeProjects/SpicebushWebapp/` unless absolute. App code lives in `app/`. See **§17 Revision History** for what changed in each round and why.

> **Canonical-artifact status (completeness pass, 2026-06-05):** This file (`docs/plans/blog-implementation-plan.md`) is the single authoritative build-run playbook. A fresh Claude session must be able to execute the blog build from this file alone — the locked decisions and key constraints are restated at the top (§0). The earlier 8-phase plan and spec on branch `spec/blog-cms` (`blog-cms-plan.md` / `docs/specs/blog-cms.md`: TipTap rich editor, Claude AI voice-corpus service, ticker, RSS, scheduled publishing, categories/tags UI, related posts) are **superseded and abandoned** — every one of those features violates the locked OUT decisions of 2026-06-05. No builder should follow them; `spec/blog-cms` must be abandoned (not merged) and this lean plan landed on a fresh branch per repo PR rules. The companion lean spec is `docs/specs/blog.md` (authored in PR-1); its sanitizer block is copied **verbatim from §8 of this document** (the post-Round-4 config — no `id`, no `#`, HTTPS-only).

---

## 0. Locked Decisions & Key Constraints (restated for a fresh session — read first)

A fresh Claude session executing this plan needs no other context. These are **not revisitable** by any agent.

### Locked decisions (project owner, 2026-06-05)
1. **Authoring model — DB-backed via the admin panel.** Non-technical school owners author and publish posts at `/admin/blog` with **no deploys**. Posts live as rows in the existing generic `content` table (`type='blog'`, with `slug`, `title`, `status`, and a JSONB `data` column). The 6 legacy markdown posts in `app/src/content/blog/` get a one-time import into the DB.
2. **V1 scope — lean MVP.**
   - **IN:** blog index page (`/blog`), post pages (`/blog/[slug]`), draft/published states, per-post SEO meta, sitemap entries, fix the Footer `/blog` link + unwind the three 301 redirects, images via the existing media system, admin CRUD with a simple markdown editor.
   - **OUT (explicitly deferred — do not add, do not scaffold "for later"):** categories/tags UI, RSS, pagination, scheduled publishing, related posts, search, comments, newsletter integration, rich-text/WYSIWYG editor, client-side autosave/restore, in-post heading anchors / table-of-contents / fragment links, a body-image-alt client scanner, featured-image thumbnail preview (V2), BlogPosting JSON-LD (V2), meta-description length capping (V2).

### Key constraints (verified against the codebase / live site; trust these)
- **Stack:** Astro 5 SSR on Netlify (serverless), Neon PostgreSQL via `NETLIFY_DATABASE_URL`, custom magic-link admin auth, Tailwind 3, React islands used sparingly. No SSG, no Next.js, no Vercel, no Supabase. Email: SendGrid + Unione (REST). Stripe/payments and newsletter are out of scope.
- **No new table, no new endpoint, no new architecture.** The generic `content` table (`app/db/migrations/001_core_schema.sql:11`) is `id UUID PK, type TEXT, slug TEXT, title TEXT, data JSONB`, plus `status`, `author_email`, `created_at`, `updated_at`, with `UNIQUE(type, slug)`. There is **no `cms_blog` table**; `'cms_blog'`/`'blog'` are allowed collection names in `DATABASE_COLLECTIONS` (`app/src/lib/db/content.ts`) mapping to rows in this generic table.
- **All DB access through the facade `@lib/db`** (`db.content`, etc.); low-level `queryFirst()`/`queryRows()` in `@lib/db/client`.
- **`ContentEntry` is `{id, slug, collection, data, body}` with NO timestamps** (`app/src/lib/db/types.ts`). Blog code works within that shape; it MUST NOT be modified for blog.
- **All three blog routes are currently 301 redirects to `/contact`** (`app/src/pages/blog.astro`, `app/src/pages/blog/[slug].astro`, `app/src/pages/resources/blog.astro` — each just `return Astro.redirect('/contact', 301)`). `app/src/components/Footer.astro:141` links `/blog` (a live bug: links to a 301).
- **Migrations stop at 014** (`app/db/migrations/001`–`014`); the next number is **015**. Runner: `npm run db:migrate` → `app/scripts/apply-migrations.sh`, tracked in `schema_migrations`.
- **Exactly 6 legacy markdown posts** in `app/src/content/blog/` (2024-05-20 to 2025-07-26), validated by the `blogCollection` Zod schema in `app/src/content/config.ts`.
- **Deploy is git-triggered on push to `main`** via `.github/workflows/deploy.yml`, whose deploy step is `cd app && npx netlify deploy --prod --auth=$NETLIFY_AUTH_TOKEN --site=$NETLIFY_SITE_ID` (NO `--dir` — so the Netlify CLI consumes the SSR adapter manifest at `app/.netlify/functions/ssr.zip`). The committed `netlify.toml` has **no `base` key**; its `[functions] directory = "netlify/functions"` is a non-existent repo-root path, which is why `--dir=app/dist` from repo root uploads a STATIC-ONLY build that 404s every SSR route.
- **ROADMAP Phase-3 gates (all must pass before merge):** (1) security review — no new P1+ findings; (2) maintainability review — no regression; (3) full test coverage for new code; (4) lint, typecheck, and E2E gates green. CI runs lint + typecheck + Vitest + `format:check` + `security.yml`; CI does **not** run Playwright or coverage — gates 3 and 4 are satisfied via recorded manual runs with attached artifacts.
- **PRD `docs/PRD.md` §5** currently lists public blog as deferred ("content may exist in DB but blog UI is removed/redirected"); **ROADMAP `docs/ROADMAP.md`** lists Blog as a Phase-3 candidate gated on the four gates above. **7 ADRs exist (001–007); the next is 008.** No blog spec existed in `docs/specs/` before this work; the companion `docs/specs/blog.md` is authored in PR-1.

---

Base architecture, file map, and per-round revision rationale follow. **§14 is the ordered build sequence; §4 is the migration + legacy-import procedure; §15 is rollout/rollback; §14 Step 0 is the pre-build checklist (incl. the prod-DB audit for existing `blog`/`cms_blog` rows); §16 is open questions for the owner.**

## Synthesis changelog (v1 grafts, annotated with revision status)

Each graft was verified against the codebase or live site before inclusion.

1. **`_raw` form-field suffix** (risk-first) — VERIFIED: `parseSimpleValue` (`app/src/pages/api/admin/content.ts:32-59`) coerces `"true"/"on"/"yes"`→bool, `"null"`→null, numeric strings→numbers, and JSON-parses any `{...}`/`[...]` value. Preventing coercion at the parser beats repairing it. Follows the existing `_csv`/`_lines` suffix convention. `normalizeBlogData` strips leading/trailing whitespace from body/excerpt, and the admin textareas are pinned to tight interpolation (R2-F8 — the cloned template's indented textarea pattern would otherwise corrupt markdown on every edit-save).
2. **`createOnly` guard** (owner-ux-first) — VERIFIED: the upsert is `ON CONFLICT (type, slug) DO UPDATE` (content.ts:475-481); without the guard the add-form silently overwrites an existing post on slug collision. Round 2 upgraded the client collision warning to a blocking `setCustomValidity` check (R2-F12), so the residual server-400 loss is genuinely concurrent-only.
3. **localStorage autosave** (owner-ux-first) — **REMOVED in round 1 (R1-F10/F14/F15/F18 cascade).** Replaced by the conditional-required validation toggle (§5.4), trimmed in round 4 to native attributes + the conditional-`required` toggle + the slug-collision block (R4-F7).
4. **Server-rendered draft preview in admin** (risk-first's mechanism) — zero-JS preview through the identical public pipeline. Lazy-render threshold comment (R1-F13); save→preview loop restored by server-rendering `open` on the saved post's `<details>` (R2-F13).
5. **Strict DOMPurify allowlist + XSS matrix** (risk-first) — extended in rounds 1–2 (backslash-as-slash bypass R2-F1; `ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` pinned false R2-F3); narrowed in round 3 to HTTPS-only body URLs (R3-F2); and **narrowed again in round 4 (R4-F6): `id` dropped from `ALLOWED_ATTR`, `#`/fragment hrefs dropped from `ALLOWED_URI_REGEXP`** — heading anchors are cut, so authored ids no longer reach any render site. Raw-HTML XSS matrix added (R4-F2).
6. **h1→h2 demotion + heading-skip clamp in the renderer** (risk-first) — heading-id generation **removed in round 4 (R4-F6)**; the renderer keeps only the h1→h2 demotion and the skip clamp. The clamp's `previousDepth` state is created fresh per `renderPostBody` call (R4-F22).
7. **Reject invalid `status` with 400** (risk-first) — round 2 closed the omission hole: a blog POST with a missing/empty status is a 400, not a silent publish (R2-F2).
8. **`author_email = NULL` on imported rows** (risk-first) — unchanged as rollback discriminator; migration 015 reconciles the seed-created rows first (R1-F27), with a mandatory pre-flight re-audit immediately before applying (R2-F21).
9. **Refined cache-staleness honesty** (risk-first) — unchanged (`preloadCommonData` is dead code; caching is lazy per instance — R1-F53).
10. **`<style is:global>` scoped under `.blog-body`** (owner-ux-first) — link color pinned (forest-canopy, R1-F35) with a concrete E2E assertion (R2-F27); non-link metadata contrast pinned to an AA-passing token (R4-F18); minimal block-element CSS added for blockquote/code/pre/table (R4-F19).
11. **`ogType` Layout prop** (owner-ux-first) — expanded to `ogImage`/`ogImageAlt`/`publishedTime`, feeding og:image AND twitter:image, og:image:alt, **twitter:image:alt** (R4-F16), and article:published_time (R2-F15); `article:published_time` ISO value inlined at the call site (R4-F10).
12. **UTC date formatting** (owner-ux-first) — unchanged.
13. **Sitemap section** — `resolveSiteOrigin` hoisted, `lastmod` dropped; urlset building + `escapeXml` live in `blog-content.ts` so the endpoint is a thin shell whose logic is automatically coverage-measured; slashless URL form pinned (R2-F5/F17/F35); static-sitemap `filter` excludes blog/redirected resources/blog/`/admin`/`/admin/*`/`/auth/*` (R3-F8/R4-F4); build-time `PUBLIC_SITE_URL` divergence pinned (R4-F31).
14. **Preserve legacy `tags` data-only** — purely the existing `baseDataJson` passthrough; no blog code names `categories`/`tags` (R1-F12).
15. **Smaller grafts** — Netlify's git-connected CI is a live third deploy path (`stop_builds=false`, production branch `testing`) that Step 0 neutralizes (R2-F38). **Deploy mechanism corrected in round 4 (R4-F26/F27/F28): `cd app && npx netlify deploy --prod` (no `--dir`); the round-3 "operator can't break it / base=app discovery" framing was verified false and is deleted.**

**Considered and NOT grafted** (unchanged): live client-side markdown preview; admin draft preview on the public template; bespoke `/api/admin/blog` endpoint; checked-in generator script; full-site dynamic `/sitemap.xml` replacement; title-derived placeholder alts; fetch-DELETE buttons; media `<select>` picker; the Astro Container API (prohibited even for the empty-state test — R2-F6); per-page coverage thresholds in CI (coverage is a recorded manual gate — R2-F35). **Cut in round 4 (do not build):** in-post heading anchors/ids (R4-F6), a body-image client scanner (R4-F7), a single-hop `/resources/blog/[slug]` page (R4-F8, reverted to a 3-line 301), a `src/pages/api/admin/**` coverage widening (R4-F9, reverted to `src/lib/**`), an `articlePublishedTimeIso` exported helper (R4-F10, inlined).

---

## 1. Goals & Non-goals

### Goals (locked IN scope, 2026-06-05)
- Public blog index at `/blog` and post pages at `/blog/[slug]`, served from rows in the existing generic `content` table (`type='blog'`).
- Draft/published states (drafts invisible to the public, visible in admin).
- Per-post SEO meta (title, description, OG/Twitter image, OG type, canonical).
- Sitemap entries for blog URLs that update **without deploys**.
- Fix the Footer `/blog` link (by making `/blog` real) and unwind the three 301 redirects.
- Featured images via the existing media system (`/admin/media`, `/api/media/upload`, photo category `'blog'`).
- Admin CRUD at `/admin/blog` with a simple editor, usable by non-technical school owners, publish with no deploys.
- One-time import of the 6 legacy markdown posts in `app/src/content/blog/` into the DB — reconciling the seed-created prod rows first (§4).

### Non-goals (locked OUT — do not build, do not scaffold "for later")
- **Categories/tags UI** — deferred by owner; legacy keys are carried opaquely by the existing `baseDataJson` edit convention. No blog code names them (R1-F12).
- **RSS** — no `@astrojs/rss` dependency exists; new surface for zero current demand.
- **Pagination** — 6 posts + slow authoring cadence; a single list page is correct until post count demands otherwise.
- **Scheduled publishing** — draft → manual publish covers the owner workflow.
- **Related posts, search, comments, newsletter integration** — each is a feature in itself.
- **In-post heading anchors / table-of-contents / "back to top" fragment links** — CUT in round 4 (R4-F6): never in the locked IN list, documentation-grade for a ~3-posts/year school blog, and the root of an author-controlled-`id` security residual. The renderer keeps only the h1→h2 demotion + heading-skip clamp (a11y-gate defense), emits no ids, and DOMPurify strips all author ids. Re-addable later if owners actually request a TOC.
- **Rich-text/WYSIWYG editor** — new dependency, new XSS surface; markdown + server preview achieves owner confidence within MVP (§5).
- **Client-side autosave/restore machinery** — removed in round 1 (R1-F10); prevention (client-side validation, §5.4) replaces recovery. Residual risk recorded in §16 and `docs/specs/blog.md`.
- **A body-image-alt client scanner** — CUT in round 4 (R4-F7): a per-keystroke parallel validation engine with no admin-surface precedent. The server still enforces body-image alt quality at publish (§5/§6); the client uses only native attributes.
- **BlogPosting JSON-LD structured data** — noted as a V2 candidate in `docs/specs/blog.md`; per-post meta + OG/Twitter tags cover V1.
- **Featured-image thumbnail preview in the editor** — deferred V2 (R4-F13): a genuine owner-UX improvement on the most visual field, but additive UI with its own load/error/empty states and a11y; the house staff/media clone source ships URL-string-only, so the text-box-only field is not a regression from norms.
- **Meta-description length capping and bespoke index meta** — deferred (R2-F18, §16); the `/blog` index meta is owner-tunable via `/admin/seo` (it joins `SEO_MANAGED_PAGES` in PR-4).
- **Cross-instance cache invalidation, CDN caching of blog pages, full-site sitemap rebuild** — risk decisions; see §9, §10.

Rationale: every deferred item would add files, migrations, or UI that the maintainability gate (ROADMAP) penalizes. The generic content pipeline already does 90% of the work; the win here is a small diff.

---

## 2. Architecture Overview

**No new architecture.** The blog rides the existing generic content pipeline end to end:

```
Owner at /admin/blog
  └─ HTML form POST → /api/admin/content (existing generic endpoint)
       ├─ origin check (NEW ~5 lines, defense-in-depth CSRF: 403 on mismatched Origin / cross-site Sec-Fetch-Site; fails open when headers absent)
       ├─ checkAdminAuth (existing middleware + per-endpoint check)
       ├─ _raw field passthrough (NEW ~5-line parser addition, defuses parseSimpleValue coercion)
       ├─ normalizeBlogData / validateBlogData (NEW hooks, mirror existing faq/testimonials hooks;
       │    blog requires an EXPLICIT status — the endpoint's missing-status→'published' default never applies to blog (R2-F2))
       ├─ createOnly guard (NEW ~15 lines: INSERT … ON CONFLICT DO NOTHING + rowCount check, new-post form only)
       ├─ upsert INTO content ON CONFLICT (type, slug) DO UPDATE  (existing SQL, content.ts:470–492)
       └─ db.cache.invalidateCollection('blog')                   (existing, content.ts:494)

Public visitor at /blog or /blog/[slug]
  └─ db.content.getCollection('blog') / db.content.getEntry('blog', slug)
       (existing cached reads; WHERE type='blog' AND status='published' — drafts excluded in SQL)
  └─ normalizeBlogEntry (read-path trust boundary: slug shape, image-URL scheme, ''→undefined — R1-F1/R2-F7/R2-F20)
  └─ data.body (markdown) → marked (walkTokens link normalization; renderer: h1→h2 demotion, heading-skip clamp)
       → DOMPurify strict allowlist → set:html
```

Everything blog-specific lives in **one new lib file** (`app/src/lib/blog-content.ts` — including the sitemap urlset builder and `escapeXml`, so the sitemap endpoint is a thin shell — R2-F5/F35), **one small client-behavior module** (`app/src/lib/blog-admin-client.ts`, the conditional-required toggle + the slug-collision block, imported by `blog.astro`'s script and unit-tested in jsdom — R2-F36; trimmed to faq.astro's complexity class in round 4 — R4-F7), **one tiny shared origin helper** (`app/src/lib/site-origin.ts`, ~12 lines hoisted verbatim from `robots.txt.ts` — R1-F8), **one tiny form-field fixture module** (`app/src/lib/blog-form-fields.ts`, shared by the admin page and the handler-integration test — R1-F42), **one new admin page**, **two rewritten public pages**, **one 3-line legacy redirect page** (`resources/blog/[slug].astro` — a trivial 301, R4-F8), and **one thin dynamic sitemap endpoint**. The DB layer, cache layer, auth, media upload, and admin form-POST conventions are reused unmodified except for small additive changes to the existing generic endpoint.

**Hard constraint (R1-F7): `ContentEntry` and `toContentEntry` in the shared DB layer are NOT modified for blog.** `ContentEntry` is `{id, slug, collection, data, body}` with no timestamps (`app/src/lib/db/types.ts:301-307`); blog code works within that shape. Ordering, sitemap, and the view model are all designed to need nothing more (§3, §6, §9).

**Why the generic content-table path:** locked owner decision; `content` already has everything blog needs (verified `app/db/migrations/001_core_schema.sql:11–26`).

**Change-impact note (R4-F32):** the additive endpoint changes (origin check, `_raw`, `parseRedirectPath` hardening, `action=delete`) enter the request path of every existing admin collection (faq/staff/testimonials/announcements/camp/donations/settings/seo/contact/hours/tuition/media — 13 collections). PR-1 carries a regression assertion that an existing collection still saves AND deletes, including the header-absent fail-open case.

---

## 3. Data Model & Migrations

### Table usage — no schema change
Use the existing `content` table exactly as-is:
- `id UUID PK`, `type TEXT`, `slug TEXT`, `title TEXT`, `data JSONB`, `status TEXT DEFAULT 'published'`, `author_email TEXT`, `created_at`, `updated_at`
- `UNIQUE(type, slug)` — slug uniqueness enforced by the DB; `createOnly` makes creation collision-safe (§6).
- Existing indexes `idx_content_type`, `idx_content_status` cover the read query. No new index.

### Row shape for a blog post
| Column / JSONB key | Value |
|---|---|
| `type` | `'blog'` (ignore the `'cms_blog'` alias — leave it in `DATABASE_COLLECTIONS`, write nothing to it) |
| `slug` | URL slug, `^[a-z0-9-_]{1,100}$` (write-path regex content.ts:423 plus a 100-char cap — R1-F6); **new slugs must NOT match `^\d{4}-\d{2}-\d{2}-`** — that shape is reserved for the legacy-redirect namespace (R2-F19); immutable after creation in the admin UI |
| `title` (column) | Post title, ≤ 300 chars (column overrides `data.title` on read via `toContentEntry`) |
| `status` | `'published'` or `'draft'` — the entire draft/published representation. Public reads already filter `status='published'`. **Blog POSTs must carry an explicit status: the server rejects any other value AND a missing/empty value with 400** — the endpoint's pre-hook `status || 'published'` default is bypassed for blog (R2-F2). The admin list does NOT filter on status — any row with `type='blog'` is visible and fixable by the owner regardless of status (R1-F9). |
| `data.date` | `'YYYY-MM-DD'` string (display + sort date) |
| `data.author` | string, default `'Spicebush Team'` |
| `data.excerpt` | string, ≤ 1,000 chars, trimmed (form field: `data.excerpt_raw`) |
| `data.body` | raw **markdown** string, ≤ 200,000 chars (~200 KB), trimmed of leading/trailing whitespace (R2-F8) — never HTML (form field: `data.body_raw`) (caps: R1-F6) |
| `data.image` | optional URL — **must be site-relative or `https://` absolute, matching `^(\/(?![/\\])|https:\/\/)`** (backslash second character rejected — browsers parse `\` as `/`, R2-F1). **Five imported posts use `/images/blog/*.webp`; file 6 uses an existing `/images/optimized/gallery/*.jpg` path** (R2-F24) |
| `data.imageAlt` | alt text — required when `image` is set and status is published; must satisfy the CI a11y bar (≥ 6 chars, not filename-like, not a generic word — R1-F37) |
| `data.seoTitle`, `data.seoDescription` | optional per-post meta overrides |
| `data.categories`, `data.tags` | legacy import keys, carried **opaquely** by the existing `baseDataJson` edit convention. No blog code reads, validates, or reshapes them (R1-F12). |
| `author_email` | set automatically by the endpoint to the admin's session email; `NULL` on imported rows (rollback discriminator, §4/§15); `'seed@spicebushmontessori.org'` identifies legacy seed-created rows that migration 015 removes (§4) |

**Empty-string semantics (pinned — R2-F20):** the blog form always submits the optional `data.*` fields, and a blank input arrives as `''` (which `??` cannot catch). Three layers, all specified in §6: (1) `normalizeBlogData` **deletes** optional keys whose trimmed value is `''` (`image`, `imageAlt`, `seoTitle`, `seoDescription`, and `date` — so a blank date yields "date required" at publish, not "bad date"); (2) `validateBlogData` defines "set" as **non-empty after trim**; (3) `normalizeBlogEntry` coerces `''` to `undefined` on the read path (belt-and-suspenders for rows written before this fix). The post page additionally uses `||` (not `??`) for its meta fallbacks (§9).

**Date format pinned (R3-F15):** `data.date` is `'YYYY-MM-DD'` (the markdown frontmatter shape). `created_at`/`updated_at` for imported rows are `{date}T12:00:00Z`. The display formatter renders with `{ timeZone: 'UTC' }`.

**Ordering (R1-F7/F9/R3-F18):** one rule, one implementation. `compareBlogPosts(a, b)` in `blog-content.ts`: `data.date` DESC (ISO strings compare lexicographically), tiebreak **slug DESC**; an undated row (no `data.date`) sorts after any dated row (it cannot publish, so this only affects the admin draft list). Both `getPublishedPosts` (public) and `getManagedBlogPosts` (admin) sort in JS with this comparator — no SQL `ORDER BY` divergence, no dependency on `created_at` (which `ContentEntry` does not expose and which we will not add). The same-date 2024-10-29 pair orders deterministically by slug. All six imports use `{date}T12:00:00Z`.

### Migrations
- **No DDL migration.**
- **One data migration:** `app/db/migrations/015_import_legacy_blog_posts.sql` — reconcile-then-import, wrapped in `BEGIN; … COMMIT;` (R1-F27/F52). See §4. Runs through the existing runner (`npm run db:migrate` → `app/scripts/apply-migrations.sh`, tracked in `schema_migrations`). **Execution is manual with an explicit, production-context target and a mandatory host echo** (§15 — R2-F40). The deploy path does not run migrations.
- **Two-phase bookkeeping caveat (R4-F30):** `apply-migrations.sh` records `schema_migrations` in a separate psql call (non-atomic with the apply); a between-phase crash leaves 015 applied-but-unrecorded. 015's idempotency (`DELETE` + `ON CONFLICT DO NOTHING`) makes a re-run harmless, but the runbook (§13.8) adds a post-apply `SELECT 1 FROM schema_migrations WHERE …'015'` check so the operator re-inserts the bookkeeping row rather than re-running blindly.

---

## 4. Legacy Import (reconcile seed rows, then 6 markdown posts → DB rows)

### Verified ground truth (round 1, R1-F27/F24)
- The public blog was DB-backed from the initial commit until the 301s landed (2026-02-08); historical post URLs were defined by **DB row slugs**, not markdown frontmatter.
- `app/scripts/insert-critical-data.js` (the documented `npm run db:seed`) includes `'blog'` in `CONTENT_COLLECTIONS` and derives slugs from the **filename minus `.md`** — e.g. `2024-05-20-nurturing-growth-gardening-program` — upserting them as `status='published'`, `author_email='seed@spicebushmontessori.org'`, with raw frontmatter (`featured_image` key, `draft` retained). `docs/runbooks/deploy.md` instructs running this against prod.
- Therefore prod near-certainly contains **6 published, seed-created, date-prefix-slugged blog rows**. A naive `ON CONFLICT DO NOTHING` import of the six clean slugs would never collide and would produce **12 published rows**. Step 0 (§14) confirms this expected state.

### Mechanism (R1-F27)
`015_import_legacy_blog_posts.sql`, all inside one transaction:

```sql
BEGIN;
-- 1. Reconcile: remove the seed-pipeline rows (idempotent; targets ONLY seed-authored, date-prefixed rows)
DELETE FROM content
 WHERE type = 'blog'
   AND author_email = 'seed@spicebushmontessori.org'
   AND slug ~ '^\d{4}-\d{2}-\d{2}-';
-- 2. Import: six INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
--    VALUES (...) ON CONFLICT (type, slug) DO NOTHING;   -- never clobbers owner-edited rows on re-run
COMMIT;
```

Markdown bodies embedded with PostgreSQL dollar-quoting (e.g. `$blog015$ … $blog015$`); **the transcription step must verify the chosen tag does not occur in any body.** The builder transcribes frontmatter + body from the files (a throwaway local `gray-matter` script may generate the SQL; the checked-in, human-reviewed artifact is the SQL). The `BEGIN/COMMIT` wrapper makes a mid-file failure all-or-nothing (R1-F52); `DELETE` + `DO NOTHING` together keep the migration idempotent and safe on re-run.

**Pre-existing CLEAN-slug audit (R3-F16):** Step 0's audit (§14) also confirms there is **no pre-existing clean-slug `type='blog'` row** (e.g. an owner-created `nurturing-growth-gardening-program` that would collide with 015's INSERT and be silently skipped by `DO NOTHING`, leaving a stale body). If a clean-slug row exists, STOP and reconcile its body against the markdown before applying 015.

### Same PR (PR-3): remove `'blog'` from `CONTENT_COLLECTIONS` in `app/scripts/insert-critical-data.js`
(R1-F28) — otherwise every future `npm run db:seed` run silently re-creates the date-prefixed duplicates 015 just removed. Add a runbook note: blog content is owned by the DB/admin panel and excluded from seeding.

### The PR-2 → 015 edit window (R2-F21)
The moment PR-2 deploys, the owner/tester sees the 6 live seed rows in `/admin/blog` as published posts with odd date-prefixed slugs — and a single admin edit sets `author_email` to the admin's session email, removing that row from 015's DELETE predicate. The clean-slug INSERT then lands **alongside** it: 7 rows, one duplicated post. Three guards:
1. **Freeze note** in PR-2's description and acceptance walkthrough: *"The 6 legacy seed rows will appear in this UI with date-prefixed addresses — do not edit or delete them until the PR-3 import is verified."*
2. **Mandatory pre-flight:** re-run the Step-0 audit query (§14) **immediately before applying 015**. STOP if any `type='blog'` row no longer matches the seed shape or the six clean slugs (the Step-0 audit can be days stale by then).
3. **Remediation if the window is hit** (documented in the runbook): compare the edited date-prefixed row against its markdown source; after confirming the clean-slug row supersedes it (carrying over any divergent edits), delete the date-prefixed row manually.

### Field mapping (per file, from verified frontmatter)
| Source | Target |
|---|---|
| explicit `slug` (files 1–5) | `slug` |
| file 6 (no slug key) | `slug = 'welcome-to-our-new-blog'` — confirmed against the Step 0 DB audit (the seed row's filename-derived slug strips to exactly this; R1-F24) |
| `title` | `title` column **and** `data.title` |
| `date` | `data.date` as `'YYYY-MM-DD'`, and explicit `created_at`/`updated_at` = `{date}T12:00:00Z` |
| `author` | `data.author` (`'Spicebush Team'` for all six) |
| `categories` / `tags` | `data.categories` / `data.tags` — carried opaquely; no blog code names them (R1-F12) |
| `featured_image` (files 1–5) | normalized to `data.image` (paths verified in `app/public/images/blog/`) |
| `image`/`imageAlt`/`seoTitle`/`seoDescription` (file 6) | same-named `data.*` keys — **file 6's image is `/images/optimized/gallery/group/group-montessori-collaboration-img-6599-1362x2213-640w.jpg` (exists in `app/public`), NOT an `/images/blog/` path** (R2-F24) |
| `excerpt` | `data.excerpt` |
| markdown body | `data.body` (raw markdown, frontmatter stripped, trimmed) |
| `draft: false` (all six) | `status = 'published'` |
| — | `author_email = NULL` (rollback discriminator, §15) |
| `imageAlt` for files 1–5 | builder writes a **descriptive alt of at least 6 characters that names the subject** (e.g. "Yellow spicebush flowers blooming in spring") — audited by the existing alt-text E2E standard (R1-F37) |

### Step 0 reconciliation inputs (R1-F24/F30)
The Step 0 audit (§14) captures, for each existing prod row: `slug`, `status`, `author_email`, `created_at`, `updated_at`, JSONB shape (`featured_image` vs `image`), and `length(data->>'body')`. Before writing 015, the builder compares DB body lengths/`updated_at` against the markdown sources. Expected: seed rows match the markdown. If any row differs (newer `updated_at` than the seed runs, or materially different body length), present the **diff direction** to the owner and reconcile before 015. Rows matching neither the seed shape nor the six clean slugs → STOP and ask (genuinely owner-authored).

### Post-import verification (run against the target DB, scripted in the PR description)
```sql
SELECT count(*) FROM content WHERE type='blog';                          -- expect exactly 6
SELECT count(*) FROM content WHERE type='blog'
  AND author_email='seed@spicebushmontessori.org';                      -- expect 0 (seed rows reconciled)
SELECT slug, status, data->>'date', created_at, author_email FROM content
  WHERE type='blog' ORDER BY data->>'date' DESC, slug DESC;             -- clean slugs, order, NULL author_email
SELECT slug, length(data->>'body') FROM content WHERE type='blog';      -- all bodies non-trivial
SELECT slug, data->>'image' FROM content WHERE type='blog';             -- all 6 set; verify each resolves to a file in app/public (R2-F24 — do NOT assert a directory pattern)
```
Then re-run `npm run db:seed` locally against a scratch DB and confirm zero `type='blog'` rows are created or modified (PR-3 acceptance criterion, R1-F28).

### What happens to the files and the Astro collection afterward
In PR-5 (after prod verification): delete the 6 files in `app/src/content/blog/` and remove `blogCollection` from `app/src/content/config.ts`. The file-based blog collection is referenced by `config.ts` AND read directly by path in `app/scripts/insert-critical-data.js` — the latter is defused in PR-3 (R1-F28). `hours`/`photos` file collections **must not** be touched. Do **not** remove `'blog'` from `DATABASE_COLLECTIONS` in `app/src/lib/db/content.ts` — that is the DB read allowlist. **Removing `blogCollection` regenerates Astro's content-collection types, so PR-5's gate is a full `cd app && npm run build` + typecheck in CI plus an explicit assertion that no component imports the file collection — PR-5 must not merge until that build is green** (R4-F29).

---

## 5. Admin UX — `/admin/blog`

**New file:** `app/src/pages/admin/blog.astro`, a structural clone of `app/src/pages/admin/faq.astro` (AdminLayout wrapper, `?saved=`/`?error=` flash params, `<details>` add-form + collapsible per-item edit forms) — **with deliberate deviations from the clone source, each marked for the builder**: (1) the status select renders top-level, never inside a collapsed `<details>` (R2-F14); (2) body/excerpt textareas use tight interpolation under a `prettier-ignore` guard (R2-F8); (3) links that leave the editor open in a new tab (R2-F11); (4) the saved post's `<details>` server-renders `open` (R2-F13); (5) the flash messages carry roles + focus handling, not the faq auto-hide pattern (R1-F33/R2-F28); (6) **the edit-form status `<select>` renders `selected={post.status}`, and "default Draft" applies to the add-form only** (R4-F11).

### Editor choice: plain `<textarea>` + markdown. Not rich text.
Unchanged from v1: Option A (plain textarea + `marked` + `isomorphic-dompurify`, both already installed) **chosen**; rich-text island and live client preview rejected (new dependency / bundle weight; server preview suffices).

### Form field names — single source of truth (R1-F42)
A tiny const module `app/src/lib/blog-form-fields.ts` exports the exact form field names (`collection`, `slug`, `title`, `status`, `createOnly`, `redirectTo`, `baseDataJson`, `data.date`, `data.author`, `data.excerpt_raw`, `data.body_raw`, `data.image`, `data.imageAlt`, `data.seoTitle`, `data.seoDescription`, `action`). `blog.astro` renders its `name` attributes from this module, the handler-integration test (§12) builds its FormData from it, **and `blog-admin-client.ts` (§5.4) resolves its field references through it** (R2-F36) — field-name drift between page, client script, and endpoint fails a test instead of corrupting the owner's first post.

### Page structure
1. **"Add new post"** `<details>` section — form `method="post" action="/api/admin/content"` with:
   - Hidden: `collection=blog`, `createOnly=true`, **`redirectTo=/admin/blog?saved=new`** (static literal — the verified faq convention; R1-F15).
   - **Layout constraints (R2-F14):** the `status` select renders **top-level in every form, never inside a collapsed `<details>`** — in the faq clone source it sits inside the collapsed "Advanced Options" disclosure, which would bury the feature's entire draft/publish control AND let Chrome silently refuse submission when a required control is inside a collapsed (unfocusable) disclosure. General rule: **only optional, never-required fields may live inside collapsed sub-details** — the "SEO (optional)" group satisfies this; date, excerpt, body, image, and imageAlt (all conditionally required) render top-level.
   - Visible fields (every input labeled; **native mirrors of every server rule — R2-F10**): `title` (text, **`required`**, `maxlength="300"`); `slug` (text, **`required`**, `pattern` enforcing `[a-z0-9-_]+` AND not starting with a `YYYY-MM-DD-` date prefix (R2-F19), `maxlength="100"`, help text "this becomes the post's web address and can't be changed later — don't start it with a date, dates are added automatically on the page"); `data.date` (`<input type="date">`, default today, label "Date **(required to publish)**"); `data.author` (text, prefilled `Spicebush Team`); `data.excerpt_raw` (textarea, 3 rows, `maxlength="1000"`, label "Excerpt **(required to publish)**"); `data.body_raw` (textarea, ~16 rows, `maxlength="200000"`, label "Body **(required to publish)**"); featured image (widget below; the URL input's scheme rule — `/` or `https://`, no `\` — is mirrored client-side via `setCustomValidity` in §5.4's module); `data.imageAlt` (text, **`minlength="6"`**, label "Image description **(required to publish when an image is set)**", help text stating the FULL server rule: **"At least 6 characters describing what's in the picture — not a file name, and not just 'photo' or 'picture'. E.g. 'Children planting seedlings in the school garden'"**); `data.seoTitle`, `data.seoDescription` (collapsed under "SEO (optional)" — allowed, never required); `status` (`<select>`: Draft / Published, **default Draft (add-form only)**, top-level; its help text names the publish-required fields).
   - **Slug autofill + blocking collision check** (in §5.4's module): prefill `slug` from `title`; the page server-renders the existing slug list into a `data-` attribute. On collision: (a) insert/update an inline **`role="alert"`** node adjacent to the slug input (linked via `aria-describedby`) with "A post with this address already exists — choose a different address or edit the existing post.", **mutating the node only on state transition** (no-collision→collision and back), never on every keystroke while the state is unchanged (R2-F30); (b) **call `setCustomValidity(...)` on the slug input**, cleared on change away from the collision — native validation then **blocks submission and focuses the slug field even when the inline warning was never seen** (R2-F12). The residual server-400 collision is now genuinely concurrent-only — recorded in §16.12.
2. **Post list** — two groups, **Drafts** and **Published**: `status='published'` rows under Published; **every other row — including any legacy/stray status — under Drafts** (R1-F9). Ordered by the shared comparator (§3). Badges pair color with text using AA-passing pairings (amber-50/amber-800 "Draft", green-50/green-800 "Published" — R1-F35). Each post is a `<details>` containing:
   - **Open-on-save (R2-F13):** the post `<details>` (and its nested preview `<details>`) server-renders the `open` attribute when `post.slug === savedSlug` (the `?saved=` param). The save→redirect→reopen-preview loop is the feature's ONLY markdown verification loop. `saved=new` and `saved=deleted` get no auto-open (the new post sorts to the top of Drafts).
   - The same edit form pre-filled, with `slug` as `<input type="hidden">` plus a read-only display, and `baseDataJson` hidden input carrying the current `data` JSON. No `createOnly` on edit forms. **The edit-form image input prefills `value={post.image}` (R3-F14) and the status `<select>` renders `selected={post.status}` (R4-F11, mirroring faq.astro:642-647)** — without the latter a routine typo-edit of a published post leaves the Draft-defaulted select submitting `'draft'` and silently unpublishes the post (404, drops off the index, with a success flash); the explicit-status guard (R2-F2) does not catch it because the select always submits a valid value. Proven by §12.18's untouched-status edit-retention test.
   - **Tight textarea interpolation (R2-F8, pinned):** the body and excerpt textareas MUST be authored as `<textarea …>{post.body}</textarea>` with **zero whitespace between the tags and the expression**, guarded by `<!-- prettier-ignore -->` — Prettier reflows exactly this into the indented multi-line shape every existing admin textarea has (faq.astro:556-565, testimonials.astro:771-778). Those templates are only safe because `parseSimpleValue` trims; the `_raw` path deliberately skips that trim, so the cloned pattern would prepend newline+spaces to the body on EVERY edit-save, turning the owner's first paragraph into a markdown code block, compounding per save. Backstop: `normalizeBlogData` trims body/excerpt (§6). Proof: the no-op round-trip phase in E2E test 24 (§12).
   - **Slug recovery help line** next to the read-only slug (R1-F21): "Need to change a post's address? Create a new post, copy the content over, publish it, then delete the old one."
   - **Preview**: a nested `<details>` containing the **server-rendered** output of `renderPostBody(post.body)`. Eager rendering accepted at current scale; threshold comment: *"render previews lazily via `?preview={slug}` if the collection exceeds ~30 posts"* (R1-F13). Workflow note: "Save first — the preview shows your last saved version."
   - A "View on site" link for published posts.
3. **Delete** — per-post form `method="post" action="/api/admin/content"` with hidden `action=delete`, `collection=blog`, `slug`, `redirectTo=/admin/blog?saved=deleted`, and `data-confirm` with softened copy (R1-F21): "Delete this post? If you are renaming its address, make sure the new copy is saved first. This cannot be undone."
4. **Client-side publish validation (`blog-admin-client.ts` — trimmed in round 4):** all client validation logic lives in this importable module called from `blog.astro`'s (processed, non-inline) `<script>` — NOT scattered inline JS — so the load-bearing prevention mechanism is **unit-testable in the existing jsdom Vitest environment** (R2-F36). **Round 4 (R4-F7) trims the module back to faq.astro's complexity class** — verified: every existing `src/pages/admin/*.astro` `<script>` uses only `.required =` toggling, with zero `setCustomValidity` quality-scanning and zero markdown parsing. The module exports an init function that, **for each form, runs once at DOMContentLoaded** (computing required-state from the INITIAL field values — R2-F9) and re-runs on `change` of the status select / `input` of the image URL field. It applies:
   - **Conditional `required`:** `status=published` ⇒ `required` on excerpt/body/date; image non-empty ⇒ `required` on imageAlt; reverse when conditions clear. Static `required` stays only on title + slug.
   - **Native-attribute mirrors only (R4-F7):** `minlength="6"` on imageAlt and a `pattern` on the image URL input express the cheap floor checks declaratively. **The inexpressible `setCustomValidity` mirrors are CUT** — no body-image scanner (parallel validation engine, no admin-surface precedent), no filename/generic-word imageAlt predicate, no backslash-URL tail. **KEPT:** the conditional-`required` toggle AND the locked slug-collision `setCustomValidity` block (the single state-loss path §5.4 exists to prevent). The body-image-alt quality bar and the imageAlt filename/generic rejection remain **server-enforced at publish** (§6); the client no longer mirrors them.
   - Native browser validation then blocks submission with field-level messages and focuses the first invalid field — form state never leaves the page. The server remains the source of truth (§6).
   - **Residual (corrected — R4-F7, §16.13):** with the scanner cut, the state-losing server 400s are now (a) a **concurrent** create collision (slug list stale since page load) AND (b) a **single-user body-image-alt** publish 400 (the owner pastes `![](url)` or `![photo](url)` and the server rejects publish; the client no longer pre-catches it). Both surface through the focused error flash; neither destroys saved-row state for a draft.
5. **Flash messages (R1-F15/F16/F33 + R2-F28 + R4-F12):**
   - Frontmatter: `const savedSlug = errorMessage ? null : Astro.url.searchParams.get('saved');` — the success banner never renders alongside an error.
   - **State-specific saved copy (R4-F12):** the page already loads every row, so it resolves the saved slug's status and renders **state-specific** copy: `saved=new` published → "Published — now live at its link."; `saved=new` draft → "Saved as a draft — NOT yet visible to the public. Set status to Published when ready."; an edit save resolves the slug's current status the same way ("Published — now live" vs "Saved as a draft — NOT yet visible"). `saved=deleted` → "Post deleted." — closing the most common owner mistake (believing a draft is live), which a single literal "saved" message reinforced.
   - The **saved** flash gets `role="status"` and a manual **Dismiss** button; it must NOT carry `data-admin-alert` (avoiding AdminLayout's 6-second auto-hide — WCAG 2.2.1).
   - The **error** flash gets `role="alert"`, must NOT carry `data-admin-alert`, **plus `tabindex="-1"` and a `data-error-flash` attribute; a one-line init call focuses it when present** (`document.querySelector('[data-error-flash]')?.focus()`), **once, then strips `?error=` from the URL so a reload/back doesn't re-focus stale state** (R3-F22).
   - **Mechanism note (R2-F28):** for post-redirect flashes, the ARIA roles do NOT announce — they are static initial markup after the 303, and live regions announce *changes*, not content present at page load. Announcement of the error flash comes from the focus call above. The saved flash gets no focus steal (reading-order proximity + `role="status"`); recorded in the spec.
6. **Staleness note** — helper text under the status field, `aria-describedby`-linked (R1-F38): *"New posts appear at their link immediately after publishing. The blog index, and edits to already-published posts, can take up to 5 minutes to update."*
7. **Markdown help (R1-F38/F19/F20 + R2-F11 + R4-F6):** the body textarea's `aria-describedby` points at a one-sentence summary ("Write in Markdown — formatting guide below the editor."). The full cheat-sheet renders as in-flow content in a `<details>` labeled "Markdown formatting guide" immediately after the textarea, including: the syntax list; "Link addresses must start with `https://` (or `/` for pages on this site). Addresses starting with `www.` are fixed automatically."; **"Every image inside your post needs a description in the square brackets: `![description](address)` — a post can't be published with an empty or one-word image description"** (R2-F26); and "To add more images inside your post: upload them at [Media](/admin/media), copy the image's address, and use `![description](address)`." — **this Media link, used mid-draft by instruction, gets `target="_blank" rel="noopener"` and visible "(opens in a new tab)" text** (R2-F11). **The in-post-heading-anchor help line is CUT (R4-F6)** — heading anchors are no longer a feature; the guide must NOT teach `#h-heading` fragment links (they are stripped by the sanitizer, §8).

### Featured image via the existing media system (R1-F18/F20 + R2-F11/F30 additions)
Mirror the **staff.astro** pattern (`app/src/pages/admin/staff.astro:638–700`):
- `data.image` is a text input holding a public URL path (`data-photo-url-input`); on edit forms it prefills `value={post.image}` (R3-F14).
- Inline upload widget: file input + button → `fetch POST /api/media/upload` (FormData: `file`, `title`, `category='blog'`, `createPhotoEntry='true'`) → on success sets the text input to the returned **`url`** and links to `/admin/media?slug={photoSlug}` for cropping — **this crop link deviates deliberately: `target="_blank" rel="noopener"` + visible "(opens in a new tab)" text** (R2-F11). The widget handles the documented upload **error response shape** so the failure-branch live-region message (R3-F21) fires on a real error.
- **After setting the input value programmatically, dispatch `new Event('input', { bubbles: true })`** — the conditional-required toggle listens on `input` (R1-F18).
- **Status message** (in the permanent `aria-live` node, §11): success → **"Image attached — save the post to keep it."**; failure → an announced error message in the same node (R3-F21).
- **Copy-address affordance (R1-F20 + R2-F30):** on success, display the returned `url` in a readonly text element with a "Copy address" button and the helper sentence "To put this image inside your post, copy this address into `![description](address)`." (Clipboard API with select-text fallback). **On copy success, write "Address copied" (or the fallback instruction) into the existing permanent `aria-live="polite"` node** (WCAG 4.1.3).

### Admin nav
Add one link to `app/src/components/AdminNav.astro` under "Content": `/admin/blog`, label "Blog", icon `Newspaper` (or `FileText`), same `aria-current` pattern as siblings.

### Draft visibility in admin
The admin list uses `getManagedBlogPosts()` (§6): **`SELECT … FROM content WHERE type='blog'` with no status filter** (R1-F9). Uncached — admins always see their own save immediately, which is what makes the Preview trustworthy.

### Validation (server-enforced; the client module §5.4 mirrors the cheap part)
- **Explicit status (R2-F2):** blog POSTs must carry `status` ∈ {`draft`,`published`} **explicitly** — a missing or empty-after-trim status is a 400 "Status must be Draft or Published", checked FIRST in `validateBlogData` against the RAW pre-default `payload.status` (§6). The endpoint's `status?.trim() || 'published'` default (content.ts:416) runs before the hooks, so omission could otherwise silently PUBLISH a half-written draft. The admin form always submits a status (top-level select), so owners never see this error.
- Always: valid slug (`^[a-z0-9-_]{1,100}$` **and NOT matching `^\d{4}-\d{2}-\d{2}-`** — R2-F19: the date-prefix shape is the legacy-redirect namespace. Error: "Don't start the address with a date — dates are added automatically on the page"); `title` non-empty and ≤ 300 chars.
- Length caps (R1-F6): slug ≤ 100, title ≤ 300, excerpt ≤ 1,000, body ≤ 200,000 chars — plain-language errors.
- **Empty optional fields (R2-F20):** `normalizeBlogData` deletes `image`, `imageAlt`, `seoTitle`, `seoDescription`, and `date` keys whose trimmed value is `''`; "set" in every rule below means **non-empty after trim**.
- `data.image`, when set: must match **`^(\/(?![/\\])|https:\/\/)`** (R2-F1: rejects `'/\evil.com'`, which `new URL()` and browsers resolve to `https://evil.com`); otherwise 400 "Image addresses must start with / (for images on this site) or https://".
- When `status='published'`: `excerpt`, `body`, valid `date` (`YYYY-MM-DD`, real date) required; if `image` is set, `imageAlt` required and ≥ 6 chars, not `/\.(jpg|jpeg|png|gif|webp)$/i`, not `/^(image|photo|picture)$/i` (R1-F37). **Additionally (R2-F26): every image token in the body markdown must carry alt text meeting the same quality bar** — `validateBlogData` walks the marked token tree and rejects publish with a plain-language error naming the offending image ("The image at 'address' needs a description in the square brackets…"). This is **server-only** now (the client scanner is cut — R4-F7); without it, `![](url)` legally published `<img alt="">` — a live WCAG 1.1.1 failure that would also break the pinned a11y E2E route on the next legal owner edit.
- Drafts are lenient (title + slug + caps + explicit status only) so owners can save half-written posts.
- All error messages in plain language, surfaced by the error flash (`role="alert"`, focused on load, never auto-dismissed).

---

## 6. Admin API Endpoints

**No new endpoint.** Seven additive changes to `app/src/pages/api/admin/content.ts` plus the new lib files.

1. **Allowlist:** add `'blog'` to `ALLOWED_COLLECTIONS`.
2. **Origin check (R1-F3, ~5 lines, defense-in-depth CSRF):** at the top of the `POST` handler (which also covers `action=delete`):
   ```typescript
   const requestOrigin = new URL(request.url).origin;
   const origin = request.headers.get('origin');
   if ((origin && origin !== requestOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
     return new Response(JSON.stringify({ error: 'Cross-site request rejected' }), { status: 403 });
   }
   ```
   **Fails open when both headers are absent** (reject only on positive cross-site evidence). Hardens faq/staff/testimonials form POSTs too — intended (regression test in PR-1 — R4-F32). Documented in `docs/specs/blog.md` §Admin API. **Coverage note (R2-F4):** this check is exercised by unit tests (§12.13), NOT by the E2E flow test — Playwright request-context calls send no Origin/Sec-Fetch-Site headers and ride the fail-open path. **Adapter correctness (R4-F5):** `new URL(request.url).origin` must resolve to the public origin on the Netlify adapter or a same-origin admin save is falsely rejected; PR-1's verification deploy confirms a real same-origin save passes (no false 403). SameSite=Lax remains the primary CSRF defense; no security change.
3. **`_raw` field suffix (~5 lines):** following the `_csv`/`_lines` convention:
   ```typescript
   if (dataKey.endsWith('_raw')) {
     data[dataKey.slice(0, -4)] = typeof value === 'string' ? value : '';
     continue;
   }
   ```
   The blog form uses `data.body_raw` and `data.excerpt_raw`. Round-trip unit tests in §12. The trim that `parseSimpleValue` would have applied is restored for body/excerpt inside `normalizeBlogData` (R2-F8).
4. **Blog normalize/validate hook**, wired like the existing faq/testimonials hooks — **passing the RAW pre-default status (R2-F2)**:
   ```typescript
   import { normalizeBlogData, validateBlogData } from '@lib/blog-content';
   if (collection === 'blog') {
     data = normalizeBlogData(rawData);
     // NOTE: pass payload.status (the raw form value, BEFORE the endpoint's `|| 'published'`
     // default at content.ts:416), not the defaulted local — for blog, omission is a 400,
     // never a silent publish. The default stays untouched for all other collections.
     const error = validateBlogData(data, title, payload.status);
     if (error) return responseByFormat(redirectTo, { error }, 400);
   }
   ```
   `normalizeBlogData`: trims and string-coerces the short blog fields; **trims leading/trailing whitespace from `body` and `excerpt`** (R2-F8 backstop); **deletes optional keys (`image`, `imageAlt`, `seoTitle`, `seoDescription`, `date`) whose trimmed value is `''`** (R2-F20); defaults `author` to `'Spicebush Team'`. It does not touch `categories`/`tags` (R1-F12). `validateBlogData` enforces §5's rules — **explicit-status check first**, then slug shape + date-prefix rejection, caps, image URL scheme (backslash-aware), imageAlt quality, publish requirements, body-image alt walk.
5. **`createOnly` guard (~15 lines):** optional top-level payload field; when truthy, `INSERT … ON CONFLICT (type, slug) DO NOTHING` + `rowCount` check; if 0 → 400 "A post with this address already exists — change the address or edit the existing post." Generic; used by the blog add-form.
6. **Form-based delete:** in the `POST` handler, `action === 'delete'` runs the existing DELETE logic (allowlist check, slug check, `DELETE FROM content WHERE type=$1 AND slug=$2`, cache invalidation) and responds via `responseByFormat`. ~20 lines.
7. **`parseRedirectPath` hardening (R1-F5, ~2 lines):** `'/\evil.com'` passes the existing `'//'` check while browsers parse `\` as `/` → off-site redirect. Fix: `return /^\/(?![/\\])/.test(value) ? value : null;`. Unit test for `'/\\evil.com'` in §12. The same backslash pattern is carried into the other two URI validators (sanitizer `ALLOWED_URI_REGEXP` §8, image scheme §5) — R2-F1.

**Auth (R1-F4 + R2-F32):** middleware protects `/admin` + `/api/admin` prefixes. Actual semantics (verified `app/src/middleware.ts:252-261`): unauthenticated JSON request → **401**; unauthenticated with `Accept: text/html` → **303 to `/auth/sign-in`**; the endpoint's own **403** is reached only by authenticated non-admin sessions (content.ts:396-403). **The 401 and 303 assertions live in E2E request-context tests (§12 test 26), which exercise the real middleware; the endpoint unit test asserts only what the handler can produce: mocked authenticated-non-admin → 403** (R2-F32). CSRF: Lax+HttpOnly+Secure session cookie plus the origin check (item 2).

**Cache invalidation:** already present on save and delete — nothing to add.

**New lib file:** `app/src/lib/blog-content.ts`. **It consumes `ContentEntry` as-is and must not motivate any change to `ContentEntry`/`toContentEntry`** (R1-F7). Exports:
- `type BlogPost` — `{ slug, title, date, author, excerpt, body, image?, imageAlt?, seoTitle?, seoDescription?, status }` — no `updatedAt` (R1-F7)
- `normalizeBlogEntry(entry: ContentEntry): BlogPost | null` — tolerant mapper; **the single read-path trust boundary**: skips rows whose slug fails `^[a-z0-9-_]{1,100}$` (R1-F1); skips rows missing title/date/excerpt; **coerces `''` optional fields to `undefined`** (R2-F20); **nulls out `data.image` when it fails the backslash-aware scheme regex `^(\/(?![/\\])|https:\/\/)`** (R2-F7/F1 — this is the single image-URL check; the index `<img>`, the post `<img>`, AND the ogImage construction all inherit it).
- `compareBlogPosts(a, b)` — date DESC, slug DESC, undated-last (R3-F18); the **only** ordering implementation (R1-F9)
- `getPublishedPosts(): Promise<BlogPost[]>` — `db.content.getCollection('blog')` → normalize → sort. Carries the scale threshold comment (*">~50 posts → no-body list projection"* — R1-F53)
- `getPublishedPost(slug): Promise<BlogPost | null>` — `db.content.getEntry('blog', slug)` (draft → null in SQL)
- `resolveLegacyBlogRedirect(slug): Promise<string | null>` (R2-F37) — returns the stripped slug when `slug` matches `/^\d{4}-\d{2}-\d{2}-(.+)$/` AND `getPublishedPost(strippedSlug)` resolves; null otherwise (miss, or draft target). Unit-pinned so a future refactor can't silently leak draft existence via 301.
- `getManagedBlogPosts(): Promise<BlogPost[]>` — `queryRows`: `SELECT id, slug, title, status, data FROM content WHERE type='blog'` (**no status filter** — R1-F9), normalize (admin variant tolerates missing fields), sort
- `normalizeBlogData(data)` / `validateBlogData(data, title, rawStatus)` — per §5/§6.4
- `renderPostBody(markdown: string): string` — see §8
- `escapeXml(s: string): string` and `renderBlogSitemapXml(posts: BlogPost[], origin: string): string` (MOVED HERE — R2-F5/F35) — the full `<urlset>` string-building lives in this lib (automatically coverage-measured under `src/lib/**`); `sitemap-blog.xml.ts` is a thin getPublishedPosts→render→`Response` shell.

---

## 7. Public UI

### `/blog` — rewrite `app/src/pages/blog.astro` (replaces the 301 stub)
- `Layout` with title "Blog"; container pattern `container mx-auto px-4`; Poppins headings, brand colors inherited.
- `const posts = await getPublishedPosts()`. Simple vertical list: featured image (if any, `loading="lazy"`, alt from `imageAlt`), `<h2>` title linking to `/blog/{slug}`, `<time datetime={date}>` formatted with `{ timeZone: 'UTC' }`, author, excerpt. No pagination (OUT).
- **Non-link metadata contrast (R4-F18):** the post date/byline/excerpt text must use an AA-passing token (`text-earth-brown/80` ≈ 6.4:1) — NOT `text-earth-brown/70` (≈ 4.0:1) or `text-gray-400` (≈ 2.8:1), which fail WCAG 1.4.3. Pinned with a deterministic `getComputedStyle` ratio assertion in `blog.spec.ts` (the shared contrast E2E is vacuous — it asserts only color≠transparent — so it does NOT discharge this gate).
- **Empty state:** if `posts.length === 0`, a friendly branded message + `/contact` link, still HTTP 200. **Verification split (R2-F6):** the DATA PATH is unit-tested; the empty-state MARKUP is a one-line manual check on the PR-4 review checklist. The experimental Astro Container API must NOT be introduced. **Heading-hierarchy note (R4-F20):** the empty state is `h1` + message + footer `h3` (a 1→3 skip), so `/blog` is kept OUT of the heading-hierarchy E2E list — its heading order is asserted in `blog.spec.ts` behind a posts-exist precondition (the populated case), so a degraded import cannot flip the absolute "E2E green" gate red for an unrelated reason.

### `/blog/[slug]` — rewrite `app/src/pages/blog/[slug].astro` (replaces the 301 stub)
- SSR (no `prerender`).
- Slug param hygiene: if `Astro.params.slug` fails `^[a-z0-9-_]{1,100}$`, 404 before querying (date-prefixed legacy slugs contain only `[a-z0-9-]`, so they pass).
- `const post = await getPublishedPost(slug)`.
- **Legacy date-prefix fallback (R1-F24, helper-extracted R2-F37):** on a miss, `const target = await resolveLegacyBlogRedirect(slug); if (target) return Astro.redirect(`/blog/${target}`, 301);` — fires only when the stripped slug resolves to a *published* post (no loops, no draft leakage, no redirect-to-404). The owner-facing write path can never mint slugs in this namespace (R2-F19). If Step 0 reveals a different historical slug shape, adjust the pattern before PR-4.
- **Missing or draft → 404:** `return new Response(null, { status: 404 })`; branded 404 expected (builder verification, §16). Drafts indistinguishable from missing by design.
- Render: `<article>` with `<h1>` title (escaped expression), `<time datetime>` + author byline, featured `<img src={post.image} alt={post.imageAlt}>` when present, then `<div class="blog-body" set:html={renderPostBody(post.body)} />` — the only `set:html` in the feature. **No template-level URL re-checks** (R2-F7): `normalizeBlogEntry` enforces the scheme on every read for all three render sites.
- **OG/social meta (R2-F15 + R4-F10/F16):** `ogImage={post.image ? new URL(post.image, resolveSiteOrigin(Astro.site)).href : undefined}`, `ogImageAlt={post.imageAlt}`, `ogType="article"`, `publishedTime={post.date ? `${post.date}T12:00:00Z` : undefined}` (the ISO concat is inlined at the call site — no exported helper, R4-F10) — consumed by Layout per §9 (og:image AND twitter:image, og:image:alt, twitter:image:alt, article:published_time).
- **Meta fallbacks use `||`, not `??`** (R2-F20): `title={post.seoTitle || post.title}`, `description={post.seoDescription || post.excerpt}` — `''` is not nullish.
- **Body typography:** `<style is:global>` with every selector nested under `.blog-body`. **Pinned link style (R1-F35):** `.blog-body a { color: #3E6D51 /* forest-canopy */; text-decoration: underline; }` — 5.98:1 on white, AA. **Constraint: moss-green (#5A8065, 4.46:1) and sunlight-gold (#F89406, 2.28:1) must not be used for body-size text on light backgrounds.** **Minimal block-element CSS (R4-F19):** the sanitizer permits blockquote/code/pre/table and the help teaches them, but with no typography plugin + Preflight reset they render borderless/semantics-lost (WCAG 1.3.1) — add minimal `.blog-body` rules giving blockquote a visible left border/indent, code/pre a monospace + background, and table visible cell borders (chosen over dropping the tags, to keep the documented capability honest). (Brand tokens live in `tailwind.config.mjs` — CLAUDE.md's `.cjs` reference corrected in PR-4.) Nunito body, Poppins headings. No `@tailwindcss/typography`.
- "Back to blog" link.

### `/resources/blog` — edit `app/src/pages/resources/blog.astro`
`return Astro.redirect('/blog', 301);` (was `/contact`).

### `/resources/blog/[slug]` — NEW 3-line 301 page (R4-F8, reverts R3-F11's single-hop page)
`app/src/pages/resources/blog/[slug].astro`: `return Astro.redirect('/blog/' + Astro.params.slug, 301);` — a trivial unconditional 301 to the canonical blog path. **Round 4 reverted the round-3 single-hop optimization** (which built a net-new page + helper coupling + a brittle "no intermediate hop" E2E to save one 301 hop on URLs unverified to have ever existed — §16 Q2): a 2-hop chain (`/resources/blog/2024-…` → `/blog/2024-…` → `/blog/clean`) is well-tolerated (Google follows ≤5), and the existing `/blog/[slug]` date-prefix fallback strips the date on the second hop. Re-addable later gated on Search Console evidence.

### Footer
`Footer.astro:141` already links `/blog` — no change; the bug is fixed by making `/blog` real. Verified in E2E.

### Catch-all
`app/src/pages/[...path].astro` is matched after named routes — no conflict, no change.

---

## 8. Rendering & Sanitization

- **Pipeline:** `data.body` → `marked.parse(markdown, { gfm: true, async: false })` with:
  - a **walkTokens normalization** (R1-F19): link/image tokens whose `href`/`src` begins with `www.` get `https://` prefixed **before** sanitization;
  - a **renderer override for headings** doing two things in one place: (1) demote body `h1` → `h2` (the page renders the post title as the sole `<h1>`); (2) **clamp heading-level skips** — `depth = min(depth, previousDepth + 1)` with `previousDepth` initialized to 1 (the page `<h1>`), so `##`→`####` renders h2→h3 and a first-heading `###` renders as h2. **Heading-id generation is CUT (R4-F6)** — no `id` is emitted. **`previousDepth` is created fresh inside `renderPostBody` per call, not at module scope (R4-F22)** — the admin list server-renders every post in one request; module-scope state would let the second post's clamp continue from the first's last depth. Pinned by the two-consecutive-call unit test (§12 test 3).
  → `DOMPurify.sanitize(html, STRICT_CONFIG)` via `isomorphic-dompurify` → `set:html`.
- **Strict allowlist config (pinned verbatim — the spec documents EXACTLY this, R2-F3; copied into `docs/specs/blog.md` per §13.2):**
  ```typescript
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2','h3','h4','h5','h6','p','a','ul','ol','li','strong','em','b','i',
                   'blockquote','code','pre','img','hr','br',
                   'table','thead','tbody','tr','th','td','del'],
    ALLOWED_ATTR: ['href','src','alt','title'],   // NO 'id' (R4-F6: heading anchors cut, so author
                                                  // ids must never reach the public page — DOMPurify
                                                  // strips every author-supplied id; this resolves the
                                                  // author-controlled-id / DOM-clobbering surface R4-F1
                                                  // by removal, not by SANITIZE_NAMED_PROPS)
    ALLOW_DATA_ATTR: false,   // R2-F3: defaults to TRUE and is checked BEFORE ALLOWED_ATTR —
    ALLOW_ARIA_ATTR: false,   // without these, authored <p data-admin-alert> survives "strict" sanitization
                              // and triggers AdminLayout's querySelectorAll('[data-admin-alert]') auto-remove
                              // in the admin preview, and aria-hidden spoofing reaches public SR users
    ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?![/\\]))/i
    // HTTPS-only for body links/images (R3-F2: http: dropped to unify the body trust boundary with the
    // featured-image policy); NO '#'/fragment alternative (R4-F6: heading anchors cut, so fragment links
    // have no targets and are stripped); blocks javascript:, data:, vbscript:, protocol-relative —
    // INCLUDING the backslash form '/\evil.com', which WHATWG URL and browsers parse as '//evil.com'
    // (R2-F1: the exact class R1-F5 fixed in parseRedirectPath)
  });
  ```
- **Explicit URI decisions (R1-F46 + R2-F1 + R3-F2 + R4-F6):** `http:` body links/images — **blocked** (HTTPS-only, R3-F2). Fragment-only hrefs (`#section`) — **stripped** (R4-F6: heading anchors cut; there are no in-post id targets). `www.`-leading hrefs — normalized to https (walkTokens). Non-slash relative URLs (`images/x.png`, `../page`) — blocked, deliberately, documented in the admin help. Backslash-leading "site-relative" (`/\evil.com`) — blocked in all three validators (sanitizer here, write-path image scheme §5, read-path `normalizeBlogEntry` §6). Site-relative `/` links remain allowed. All pinned as unit-test vectors (§12) — behavior is decided by tests, not implicitly by a regexp.
- Implemented once in `renderPostBody()`, executed server-side (public post page + admin preview). No client-side rendering.
- **XSS strategy (R4-F2 — the body trust boundary is arbitrary HTML):** DB stores raw markdown only; re-sanitize on every render. **marked passes raw inline HTML verbatim, so the realistic hostile input is raw HTML the owner pastes — not markdown-syntax vectors. DOMPurify is the sole barrier.** Treat `data.body` as hostile. The unit matrix (§12 test 4) asserts the raw-HTML vectors (`<img src=x onerror=alert(1)>`, `<svg onload>`, `<iframe>`, mixed-case `jAvAsCrIpT:`, mXSS) directly against `renderPostBody`, plus the R4-F1 vector asserting a raw `<h2 id="x">` / `<a id="x">` retains **no** attacker-chosen id on the public render. The same trust boundary covers the featured image URL (write §5 + read §6) and slug charset on the read path. All other fields render through Astro's escaping interpolation. Code-review gate: `set:html` appears exactly once in blog code (plus the admin preview call site). The spec documents that the body trust boundary is arbitrary HTML, so a future marked-option change or DOMPurify regression cannot pass a markdown-only suite while shipping a raw-HTML bypass.
- **External links:** builder verifies `ExternalLinkTargetBehavior` (Layout.astro) operates on rendered DOM; if not, add a DOMPurify `afterSanitizeAttributes` hook setting `rel="noopener noreferrer"` on external `<a>`.
- **No new dependencies.** `marked` v16.1.1 + `isomorphic-dompurify` v2.26.0 already installed. Fallback if jsdom bloats the Netlify function: the email-package Rollup-externals pattern — verified in PR-1.

---

## 9. SEO & Redirects

### Unwinding the 301s — corrected mechanics (R1-F26)
- `/blog` and `/blog/[slug]`: redirect stubs **replaced** by real pages. `/resources/blog`: target changes to `/blog`. `/resources/blog/[slug]`: trivial 301 to `/blog/{slug}` (§7).
- The existing 301s are served with `cache-control: no-cache` (verified live) — browsers revalidate, so returning visitors get the new pages on their next request. The only real recovery lag is **Googlebot recrawl**, addressed by sitemap submission.

### Origin resolution — one resolver, hard prerequisites (R1-F8/F22/F47 + R2-F38/F41 + R4-F31)
- **Verified:** ONE Netlify site serves both `spicebushmontessori.org` and `spicebush-testing.netlify.app`; `PUBLIC_SITE_URL` is the testing origin **in BOTH the dev and production contexts** (R2-F41).
- **Plan of record:** hoist the existing `resolveSiteOrigin` helper (`robots.txt.ts:6-18`: `site?.origin` → `process.env.PUBLIC_SITE_URL` → hardcoded prod fallback) **verbatim** into `app/src/lib/site-origin.ts`; import it from `robots.txt.ts`, `sitemap-blog.xml.ts`, and the post page's ogImage computation.
- **Build-time `PUBLIC_SITE_URL` divergence (R4-F31):** the static `@astrojs/sitemap` origin is baked at `astro build` time from `process.env.PUBLIC_SITE_URL`, separate from the runtime canonical resolver — so the **PR-4 production build MUST run with `PUBLIC_SITE_URL=https://spicebushmontessori.org` in its build env**, or `app/dist` carries testing-origin static sitemaps the `filter` (below) cannot touch. (Also confirmed: bare `sitemap()` today means PR-4 introduces the options object for the first time.)
- **Hard blocking dependencies of PR-4 (Step 0):**
  1. **`netlify env:set PUBLIC_SITE_URL https://spicebushmontessori.org` with NO context scoping — all deploy contexts** (R2-F41). Verify a prod deploy serves `spicebushmontessori.org` canonicals before PR-4 merges.
  2. **Neutralize Netlify's git-connected CI (R2-F38):** the site has `repo_url=…/SpicebushWebapp`, `repo_branch=testing`, **`stop_builds=false`**, and deploy 699f704b proves Netlify CI has built prod from `testing`. ANY push to `testing` triggers a full production build of likely-stale code. **Set `build_settings.stop_builds=true`** (Site settings → Build & deploy) and record it in the runbook's build-provenance rule.
  3. **Deploy mechanism pinned — `cd app && npx netlify deploy --prod` (no `--dir`) via GitHub Actions `deploy.yml` (R4-F26/F27/F28).** See §15. Because `stop_builds=true` is locked, GitHub Actions `deploy.yml` (the corrected workflow) is the **only** deploy mechanism — git-CI is off, so it cannot be the fallback. The SSR-function-upload verification (below) is a hard PR-4 prerequisite run **through the actual `deploy.yml` workflow**, not a local CLI.
- E2E cannot catch a wrong canonical origin from the testing host, so §15's launch verification asserts canonical/og/twitter origins explicitly.

### Sitemap — corrected picture
**Verified live state (2026-06-05):** the static `@astrojs/sitemap` output was built with the testing origin and includes `/admin/*`/`/auth/*` URLs; prod robots.txt advertises the cross-host testing-domain sitemap. Pre-existing site-wide bug — GitHub issue filed at Step 0.

- **New file** `app/src/pages/sitemap-blog.xml.ts` (`prerender = false`): a **thin shell** — `getPublishedPosts()` → `renderBlogSitemapXml(posts, resolveSiteOrigin(...))` → `Response` with `Content-Type: application/xml`, `Cache-Control: public, max-age=300`. No `lastmod` (R1-F7). Drafts never appear.
- **URL form pinned (R2-F17):** the sitemap emits **slashless URLs exactly matching the canonical form** produced by `normalizePathname` (seo-config.ts:138-151): `{origin}/blog` and `{origin}/blog/{slug}` — never `/blog/`. Unit test 8 and E2E test 22 assert **exact `<loc>` strings**, not substrings.
- **XML safety (R1-F1):** every interpolated URL passes through `escapeXml` (`& < > " '`). Unit-tested in the lib.
- **Static-sitemap `filter` (R3-F8/F9 + R4-F4):** PR-4 introduces the `@astrojs/sitemap` options object with a `filter` predicate that excludes the blog URLs (deduped against the blog sitemap), the redirected `/resources/blog` + `/resources/blog/*`, **and `/admin`, `/admin/*`, and `/auth/*`** (R4-F4 — the live `sitemap-0.xml` already advertises the admin surface + auth endpoints to crawlers, a pre-existing disclosure filed as a GitHub issue at Step 0; PR-4 re-drives crawler attention and the new `/admin/blog` would be enumerated, so the predicate excludes them at near-zero cost). Independent static-sitemap origin verification at launch (R3-F9): the static `sitemap-0.xml` must carry the prod origin (the build-env fix above).
- **Edit** `app/src/pages/robots.txt.ts`: import the hoisted helper; append `Sitemap: {origin}/sitemap-blog.xml` after the existing line. (A 2-line diff outside the coverage include — evidenced by E2E test 23.)

### Per-post meta / OG / Twitter / canonical (expanded — R2-F15 + R4-F16)
- Post page passes `title={post.seoTitle || post.title}` and `description={post.seoDescription || post.excerpt}` (`||`, not `??`) as `Layout` props.
- **`Layout.astro` change (~9 lines, R2-F15 + R4-F16):** optional props `ogImage?: string`, `ogImageAlt?: string`, `ogType?: string` (default `'website'`), `publishedTime?: string`. Implementation: `const resolvedOgImage = ogImage ?? seoMetadata.ogImageUrl;` consumed by **BOTH** `og:image` (line 64) **and** `twitter:image` (line 71). When `ogImage` and `ogImageAlt` are supplied, emit `<meta property="og:image:alt" content={ogImageAlt}>` **and `<meta name="twitter:image:alt" content={ogImageAlt}>`** (R4-F16 — Twitter/X does not read `og:image:alt`; with `summary_large_image` the card alt comes from `twitter:image:alt`, value already computed). When `ogType === 'article'` and `publishedTime` is set, emit `<meta property="article:published_time" content={publishedTime}>`. Backward compatible (all optional).
- Add `/blog` to `SEO_MANAGED_PAGES` in `app/src/lib/seo-config.ts`. Individual posts are not added.
- `robots.txt` already allows `/blog`. **Indexability is asserted, not assumed (R2-F16):** E2E test 19 and the §15 launch curls assert `meta[name=robots]` is `index, follow` and no googlebot-noindex tag is present on `/blog` AND a post page. Step 0 audits the backing rows (§14).

### Legacy URL preservation (R1-F24/F25 + R2-F19/F37 + R4-F8)
Three layers: (1) the six clean slugs restore the markdown-era URLs; (2) the **date-prefix 301 fallback** (§7, via `resolveLegacyBlogRedirect`) restores the seed-era URLs live; its miss and draft-target branches are unit-pinned (R2-F37) and its namespace is closed to new owner slugs (R2-F19); (3) `/resources/blog` and `/resources/blog/<slug>` 301 to their new equivalents (the latter a trivial 2-hop chain — R4-F8). Remaining open question for the owner (§16): any *other* URL shapes from the pre-Astro era — check old-site archives or Search Console (R3-F12 Search Console step); if confirmed, add redirect entries to PR-4.

---

## 10. Caching

- **TTL:** keep the existing 5-minute blog TTL. No change.
- **Invalidation:** already wired on save and delete.
- **Serverless caveat (document precisely):** in-memory per-instance cache; invalidation fires only in the instance that handled the POST. Cached nulls are never served, so a **newly published post's URL is live immediately on every instance**; only the index listing and edits/unpublishes of already-cached posts lag ≤ 5 minutes on other warm instances. Surfaced in the admin helper text (§5). Cross-instance invalidation is out. **The same semantics bound what the prod E2E run may assert: a cross-instance delete→public-404 check is cache-flaky for up to the 5-minute TTL, so test 24's prod cleanup verification uses an uncached surface instead (§12 — R2-F31).**
- `preloadCommonData` has **zero call sites** — dead code; blog reads are lazily cached per instance on first request (R1-F53).
- **Admin reads bypass the cache** (`getManagedBlogPosts` queries directly) — author always sees their own save.
- `sitemap-blog.xml` rides the collection cache + its own `max-age=300`. No long `Cache-Control` on `/blog` pages.

---

## 11. Accessibility

**Admin editor** (jsx-a11y ESLint rules enforce part of this):
- Every input/textarea/select has an associated `<label>`; short helper texts via `aria-describedby`; the body textarea's `aria-describedby` points at the one-sentence summary only, with the full markdown guide as in-flow `<details>` content (R1-F38).
- **Required-attribute rule (R1-F32 + R2-F9 + R4-F7):** static `required` on title and slug only; publish-dependent fields carry visible "(required to publish)" label text (WCAG 3.3.2) and the `blog-admin-client.ts` module sets `required` dynamically — **initialized once per form at DOMContentLoaded from the initial field values**, re-run on change/input. `minlength`/`pattern` express the cheap floors declaratively; the body-image scanner is cut (R4-F7). Native validation focuses and announces the first invalid field client-side. Server remains source of truth.
- **Flash semantics (R1-F33 + R2-F28 + R3-F22):** error flash `role="alert"` + `tabindex="-1"` + `data-error-flash`, **focused by an init script when present, once, then `?error=` stripped from the URL** (R3-F22). Never carries `data-admin-alert`. Saved flash `role="status"` with manual Dismiss, no focus steal.
- **Dynamic messages (R1-F34 + R2-F30 + R3-F21 + R4-F14):** (1) slug-collision warning = inline `role="alert"` node adjacent to the slug input, `aria-describedby`-linked, **mutated only on state transition**; (2) upload status = a **permanently rendered, visually empty `<p aria-live="polite">`** in the widget layout — **this node must NOT carry the cloned staff node's `hidden`/`display:none` class** (R4-F14: content injected into a display:none live region is not announced; the node must be visually-empty-but-rendered, asserted by §12.12); (3) **Copy-address success AND upload-failure both write into that same polite live region** (R2-F30 / R3-F21).
- Status badges pair color with text (amber-50/amber-800, green-50/green-800 — R1-F35).
- Publish-time rules: featured image ⇒ quality-checked `imageAlt` (R1-F37) **and every body markdown image ⇒ same-quality alt text, validated server-side at publish** (R2-F26). With both rules, **no unlabeled or junk-labeled image — featured or inline — can ship.**
- Heading discipline is normalized in the renderer, not policed in authoring: h1→h2 demotion + skip clamping (§8) keep every legal owner save within the heading-hierarchy CI assertion.
- Native `<details>/<summary>` for collapsibles; **no required field ever sits inside a collapsed `<details>`** (R2-F14).

**Public pages:**
- Index: single `<h1>` ("Blog"), post titles as `<h2>` links; `<time datetime>`; lazy images with alt; link text is the post title; non-link metadata at an AA-passing contrast token (R4-F18).
- Post page: `<article>`, exactly one `<h1>`; underlined forest-canopy links in `.blog-body` (R1-F35); blockquote/code/pre/table styled minimally so block semantics are visible (R4-F19). **No in-page anchors** — heading anchors are cut (R4-F6).
- **Smooth-scroll cascade bug (R3-F5, pre-existing):** `app/src/styles/global.css` (~line 474) declares `html { scroll-behavior: smooth }` AFTER the prefers-reduced-motion block (lines 7-17), winning the cascade at equal specificity — smooth scrolling runs even under reduced motion (WCAG 2.3.3). **Filed as a GitHub issue at Step 0 and fixed in its own isolated change (PR-0a — R3-F5)** by scoping the smooth rule inside `@media (prefers-reduced-motion: no-preference)`. (The blog no longer adds in-page fragment scrolling — R4-F6 cut anchors — so this is a standalone pre-existing-defect fix, not a blog dependency; the dead "functional fragments newly exercise it" rationale is removed.)
- **E2E a11y coverage is unconditional (R1-F36) and concrete (R2-F27), with the gate's DB precondition pinned (R4-F20):** PR-4 adds the **post route** `'/blog/nurturing-growth-gardening-program'` to BOTH the alt-text and heading-hierarchy lists in `e2e/accessibility-compliance-test.spec.ts`; **`/blog` is NOT added to the heading-hierarchy list** (its empty-state 1→3 skip would fail the gate — R4-F20) — its heading order is asserted in `blog.spec.ts` behind a posts-exist precondition. The a11y suite asserts **6 published posts exist before it runs** (so a degraded import fails loudly on its own precondition, not the absolute gate). **The link-style check is a deterministic assertion in `blog.spec.ts`** — navigate to the pinned post, locate `.blog-body a`, assert locator **count > 0**, computed `color === 'rgb(62, 109, 81)'`, and `text-decoration-line` contains `underline`.

---

## 12. Test Plan

Coverage target: **full coverage for new code** (ROADMAP Phase 3 gate). New logic concentrated in `blog-content.ts`, `blog-admin-client.ts`, and the endpoint additions.

### Coverage instrumentation + evidence path (R2-F5/F35 + R4-F9/F23)
- PR-1 extends `vitest.config.ts` coverage `include` to **`['src/lib/**/*.ts']` only** (R4-F9, reverting R2-F5's `content.ts` addition): adding the 559-line shared endpoint under `all: true` would gate the ENTIRE endpoint (all 9+ collections' paths) for ~40 lines of blog code. The ~40 endpoint lines are evidenced by the handler-integration test as **named-branch evidence in the PR**, not by the coverage glob.
- The sitemap logic (urlset + `escapeXml`) lives in `blog-content.ts` and is automatically measured under `src/lib/**`; `sitemap-blog.xml.ts` is a thin uncovered shell, and the 2-line `robots.txt.ts` edit is evidenced by E2E test 23 — both stated in the gate record.
- **Evidence path (R2-F35 + R4-F23):** CI runs neither coverage nor Playwright. The coverage gate is a **documented manual step** — run `npm run test:coverage` per PR and **attach the json-summary artifact** (NOT a hand-pasted block — R4-F23) for the new files, with these named branches shown covered: `_raw` passthrough, `createOnly` conflict (rowCount=0), `action=delete` allowlist rejection, explicit-status rejection, origin-check 403 + fail-open pass, `parseRedirectPath` backslash rejection, `normalizeBlogEntry` image-nulling + ''-coercion, `resolveLegacyBlogRedirect` all three branches. **ROADMAP states gates 3 (coverage) and 4 (E2E) are satisfied "via recorded manual run with attached artifacts," not as automated CI gates** (R4-F23).
- **`format:check` is part of every PR's gate (R4-F21):** CI runs five gates including `format:check` (`prettier --check src/`); the tight-textarea `prettier-ignore` and hand-authored PR-2 files can pass lint+typecheck+unit yet block at `format:check`. Run it locally before commit and name it in §14 + PR-2 acceptance.

### Unit (Vitest, co-located `app/src/lib/blog-content.test.ts`)
1. `normalizeBlogEntry`: complete row → BlogPost; missing optionals → defaults; garbage `data` tolerated or null; title-column override; rows missing title/date/excerpt skipped; rows whose slug fails `^[a-z0-9-_]{1,100}$` skipped (R1-F1); **`''` optional fields coerced to `undefined`** (R2-F20); **`data.image` failing `^(\/(?![/\\])|https:\/\/)` nulled — vectors include `'/\\evil.com/x.png'`, `'//evil.com/x.png'`, and `'http://insecure/x.png'`** (R2-F7/F1 + R3-F2 http).
2. Sorting: `compareBlogPosts` date DESC, slug DESC, undated-last (R3-F18); the 2024-10-29 pair deterministic; `getPublishedPosts` and `getManagedBlogPosts` both use it.
3. `renderPostBody` happy path: headings, paragraphs, links, images, bold/italic, lists, blockquote, code, GFM table; body h1 → h2; **skip clamping: `##` then `####` renders h2→h3; first-heading `###` renders h2** (R2-F26); **NO heading ids emitted** (R4-F6); **`previousDepth` is per-call: two consecutive `renderPostBody` calls each clamp from a fresh `previousDepth=1`** (R4-F22 — the second post's first `###` must render h2, not continue the first call's depth).
4. `renderPostBody` URI/XSS matrix (R2-F1/F3 + R3-F2 + R4-F1/F6/F2): markdown vectors (`javascript:` href, `data:text/html`, protocol-relative `//evil`, `[x](/\evil.com/x)` href stripped, `![x](/\evil.com/x.png)` src stripped, **`http://insecure` link/image stripped** — R3-F2, `<p data-admin-alert>` data attr stripped, `<a aria-hidden="true">` aria attr stripped, `[text](www.example.com)` → `https://www.example.com`, relative `images/x.png` stripped, **fragment `[anchor](#top)` → STRIPPED** — R4-F6 reverses the old "preserved" assertion); **raw-inline-HTML matrix asserted directly against `renderPostBody` (R4-F2):** `<img src=x onerror=alert(1)>`, `<svg onload=...>`, `<iframe>`, mixed-case `jAvAsCrIpT:` href, an mXSS payload — all neutralized; **R4-F1 vector: a raw `<h2 id="evil-clobber">`/`<a id="custom-id">` retains NO author id on the public render** (the cut config strips all ids); empty/undefined body → `''`; one real imported legacy body renders non-empty with expected `<h2>` count.
5. `normalizeBlogData`: string coercion of short fields, author default; **body/excerpt trim — vector: body of `'\n   Hello world\n  '` → `'Hello world'`** (R2-F8); **empty-string deletion: blank `image`/`imageAlt`/`seoTitle`/`seoDescription`/`date` keys removed** (R2-F20). (No categories/tags assertions — that code does not exist; R1-F12.)
6. `validateBlogData` branches: **missing/empty/whitespace-only rawStatus → "Status must be Draft or Published", checked first** (R2-F2); invalid status; missing title; missing excerpt/body/date when publishing; bad date; image-without-alt when publishing; image URL failing the scheme — vectors `javascript:alert(1)`, `data:image/svg+xml,...`, `//evil.com`, **`http://insecure`** (R3-F2), `'/\\evil.com/x.png'` (R2-F1); over-cap body/slug/title/excerpt (R1-F6); imageAlt quality (`'Photo'`, `'IMG_1234.jpg'`, 5-char rejected; 6+ descriptive passes — R1-F37); **slug `2026-08-01-fall-festival` → date-prefix error** (R2-F19); **body-image alt at publish: `![](x)` rejected, `![photo](x)` rejected, `![Children planting seedlings](x)` passes; drafts exempt** (R2-F26); blank-SEO + imageless publish succeed (R2-F20); draft leniency.
7. `getManagedBlogPosts` (mock `queryRows`): no status filter in the SQL; stray-status row appears in output (R1-F9); comparator ordering.
8. Sitemap (lib-level — R2-F5/F17): `escapeXml` escapes `& < > " '`; `renderBlogSitemapXml` asserts **exact slashless `<loc>` strings** matching the canonical normalizer; no other URL forms present.
9. **`resolveLegacyBlogRedirect` (R2-F37):** date-prefixed slug with published target → stripped slug; date-prefixed miss → null; date-prefixed slug whose stripped target is a DRAFT → null (the fourth draft-invisibility surface); non-date-prefixed slug → null.

### Unit — client validation module (R2-F36 + R4-F7, `app/src/lib/blog-admin-client.test.ts`, jsdom)
10. Build a form from `blog-form-fields.ts` fixtures; run the init function: **with initial status=published (edit-form-of-published-post case), `required` lands on excerpt/body/date at init with NO events fired** (R2-F9); flip to published via `change` → same; revert to draft → cleared; set image value + dispatch `input` → imageAlt `required`; clear → released; **slug matching the server-rendered slug list → `setCustomValidity` non-empty + alert node present; changed slug → cleared; alert node text mutates only on state transition** (R2-F12/F30). **No body-image-scanner or imageAlt-quality `setCustomValidity` assertions — those mirrors are CUT (R4-F7); the cheap floors are native `minlength`/`pattern` and need no JS test.** This is bottom-of-pyramid coverage for the conditional-required toggle + slug-collision block.

### Unit/integration for the endpoint changes
11. **`_raw` round-trip:** `{"a":1}` body stays a string; excerpt `"2024"` stays a string; body `"true"` stays a string.
12. **`createOnly`:** existing `(type,slug)` + `createOnly=true` → 400, row untouched; without it, upsert updates.
13. Allowlist + `action=delete`: accepts `'blog'`; delete branch deletes + invalidates; rejects non-allowlisted collections. **Origin check (R1-F3):** mismatched `Origin` → 403; `Sec-Fetch-Site: cross-site` → 403; matching Origin → proceeds; both headers absent → proceeds (fail-open). **`parseRedirectPath` (R1-F5):** `'/\\evil.com'` → rejected; `'//evil.com'` → rejected; `'/admin/blog?saved=new'` → accepted.
14. **Auth semantics (R2-F32):** the endpoint unit test asserts ONLY mocked authenticated-non-admin → **403**. The 401 (unauthenticated JSON) and 303 (unauthenticated `Accept: text/html` → `/auth/sign-in`) split lives exclusively in `src/middleware.ts` and is verified by E2E test 26. PR-1's acceptance criteria name where each code is verified.
15. **Draft-invisibility SQL pinning (R1-F41, PR-1):** assert both `fetchCollection` and `fetchEntry` SQL contain the `status = 'published'` predicate.
16. **Handler-integration test (R1-F42 + R2-F2 + R3-F25, PR-2, entries.test.ts style):** mock `@lib/admin-auth-check` + `@lib/db/client` (the **corrected handler-integration mock set** — R3-F25), call the **real POST handler** with FormData generated from `blog-form-fields.ts`. Asserts parse → `_raw` → normalize → validate → upsert SQL params → cache invalidation. Adds the omitted-status case → 400, no row written (R2-F2), and a whitespace-padded body asserting the stored param is trimmed (R2-F8). **Regression (R4-F32):** an existing collection (faq or staff) still saves AND deletes through the modified handler, including the header-absent fail-open path.
17. Index empty-state (R2-F6): **data-path only** — `getPublishedPosts` returns `[]` for an empty collection AND when all rows are skipped by `normalizeBlogEntry`. The friendly-message MARKUP is a one-line manual check on the PR-4 review checklist. **Do not introduce the Astro Container API.**
18. **Untouched-status edit-retention (R4-F11, handler-integration or jsdom form test):** an edit-form submission of a **published** post that does NOT touch the status select submits `status='published'` (because the edit form renders `selected={post.status}`) and the stored row stays published — proving the silent-unpublish bug is closed. A control case (Draft-defaulted add-form) submits `'draft'`.

### E2E (Playwright, new `app/e2e/blog.spec.ts`)

**Execution model (R1-F39/F49 + R2-F31/F4/F41 + R4-F24):**
- **CI does not run Playwright.** The ROADMAP "E2E green" gate is a documented manual step recorded in each PR with attached artifacts (R4-F23).
- **Gate command pinned (R2-F31):** `npx playwright test e2e/blog.spec.ts --project=chromium`. The repo config defines SEVEN projects with `fullyParallel: true` and no webServer — an unpinned run would execute the authoring-flow test 7× against the single prod DB. Belt-and-suspenders: the flow test (24) is `test.skip` for non-chromium projects, and its slug is **`e2e-flow-${projectName}-${workerIndex}-${Date.now()}`**.
- **Pre-merge (PR-4 gate run):** apply migration 015 → run the pinned command plus the a11y and smoke suites **locally against `npm run dev`** with `E2E_BASE_URL=http://localhost:4321` — **never `netlify dev`** (injects testing-origin dev env) until Step 0's all-contexts fix lands (R2-F41); export `NETLIFY_DATABASE_URL` via `npx netlify env:get NETLIFY_DATABASE_URL --context production` → record results.
- **Single-DB write safety (R4-F24):** the flow test writes to PROD (one DB). To prevent a crash between publish and cleanup from leaving a stray PUBLIC published row when PR-4 deploys: **the pre-merge run creates a DRAFT and asserts the publish→200 transition ONLY in the post-deploy run**; an `e2e-flow-%` orphan-sweep pre-step reaps prior crashes. Documented as a mandatory runbook pre-step.
- **Post-merge launch verification:** re-run with `E2E_BASE_URL=https://spicebushmontessori.org`.
- **`E2E_ADMIN_SESSION` handling (R2-F4):** a LIVE prod admin session cookie — (1) provisioned **fresh, immediately before the run**; (2) **never** in the PR record/issues/committed files (`read -s` or an env file outside the repo); (3) **revoked after the run** (or expiry within the 12h TTL accepted); (4) note that the origin check is exercised by unit tests, not this flow.
- **Baseline honesty (R1-F45):** record the current pass/fail baseline of `npm run test:e2e`; if red, the gate is scoped to the named green set and the baseline is filed as a GitHub issue.

Tests:
18. `GET /blog` → 200 (fail on landing at `/contact`), `<h1>` "Blog", at least 6 post links including `nurturing-growth-gardening-program` (R1-F43); the `.blog-body`-adjacent metadata contrast assertion lives in this spec (R4-F18).
19. `GET /blog/nurturing-growth-gardening-program` → 200, title, body content, `<meta name="description">` non-empty, `og:type=article`; canonical/og:url/og:image assert the prod origin (R1-F22); **`twitter:image` carries the post's featured image (prod origin), `og:image:alt` AND `twitter:image:alt` present** (R2-F15 + R4-F16), `article:published_time` present (ISO — R3-F10); **`meta[name=robots]` is `index, follow`, no googlebot-noindex tag, on BOTH this post and `/blog`** (R2-F16).
20. `GET /blog/this-does-not-exist` → 404 branded. `GET /blog/2024-05-20-nurturing-growth-gardening-program` → 301 → `/blog/nurturing-growth-gardening-program` (R1-F24). `GET /blog/2024-01-01-nonexistent` → 404, NOT a redirect (R2-F37).
21. `GET /resources/blog` → 301 → `/blog`; `GET /resources/blog/nurturing-growth-gardening-program` → 301 → `/blog/...` (R4-F8 — assert the 301 only; **no single-hop / "no intermediate hop" assertion**, that test was dropped with the page revert). The `article:published_time` ISO value is folded into test 19's assertions (R4-F10).
22. `GET /sitemap-blog.xml` → 200, `application/xml`; **exact `<loc>` assertions** — `<loc>{origin}/blog</loc>` and `<loc>{origin}/blog/nurturing-growth-gardening-program</loc>`, no trailing-slash variant; ≥ 6 post URLs, all prod-origin, no draft slug.
23. Footer link navigates to `/blog`; `GET /robots.txt` contains the `sitemap-blog.xml` line. (The static `sitemap-0.xml` excludes blog/`/resources/blog`/`/admin`/`/auth` per the `filter` — R3-F8/R4-F4; verified by a launch grep.)
24. **Authoring flow test (R1-F41/F42 + R2-F31/F37/F8 + R4-F24; mandatory in the PR-4 gate run):** Playwright request-context, authenticated via `E2E_ADMIN_SESSION`, **chromium-only**, slug `e2e-flow-${projectName}-${workerIndex}-${Date.now()}`, after an `e2e-flow-%` orphan sweep. Flow: POST create **draft** (`createOnly`) → assert `GET /blog/{slug}` → 404, slug absent from `/blog` index and `/sitemap-blog.xml`, and `GET /blog/2099-01-01-{slug}` → 404 (pins the fallback's draft-target branch — R2-F37) → **no-op edit round trip (R2-F8): GET `/admin/blog` with the session, extract the rendered `data.body_raw` textarea content (HTML-unescaped), assert byte-identical to the posted body; re-submit unchanged; re-extract and assert byte-identical (no whitespace accretion)** → **publish→200 asserted ONLY in the post-deploy run** (R4-F24) with rendered body → `finally`: POST `action=delete`, **assert the delete response, verify removal via the UNCACHED admin surface — re-GET `/admin/blog` and assert the slug is absent** (R4-F25: the single uncached admin-read mechanism; the "or SQL" fallback is dropped — §12 never wires a pg connection in the spec), NOT the public 404 (cross-instance cache-flaky — R2-F31). `test.skip` only when `E2E_ADMIN_SESSION` is absent; required and recorded. If the owner cannot provision a session, the gate record states the authoring journey is untested by E2E and ships a manual test script in the runbook.
25. **Stale spec reconciliation (R1-F45, PR-4):** delete the blog tests in `app/e2e/content-db-direct.spec.ts` (or the whole stale spec), folding unique assertions into `blog.spec.ts`.
26. Auth gates (R2-F32): `GET /admin/blog` unauthenticated → redirect to sign-in; **POST `/api/admin/content` with no cookie (JSON) → 401; same with `Accept: text/html` → 303 to `/auth/sign-in`** — exercise the real middleware (~6 lines, unauthenticated, write-free).
27. A11y additions per §11: the **post route** in both a11y lists (`/blog` kept out of heading-hierarchy — R4-F20); the a11y suite's 6-published-posts precondition; **the deterministic `.blog-body a` pin in `blog.spec.ts`: count > 0, `color === 'rgb(62, 109, 81)'`, underline** (R2-F27).

### Gate mapping (ROADMAP.md:86–92)
- **Security review, no new P1+:** strict sanitization allowlist with `ALLOW_DATA_ATTR/ALLOW_ARIA_ATTR: false`, **no `id` in `ALLOWED_ATTR`, no `#`/`http:` in the URI policy** (R4-F6/R3-F2), applied uniformly across sanitizer, write, and read paths; the body trust boundary documented as arbitrary HTML with a raw-HTML XSS matrix (R4-F2); author ids stripped from the public render (R4-F1); explicit-status requirement (R2-F2); single `set:html` call site; origin check with honest unit-only labeling (R2-F4) + a same-origin no-false-403 verify (R4-F5); open-redirect hardening (R1-F5); size caps (R1-F6); correct auth-code placement (R2-F32); drafts 404 identically with the fallback's draft branch pinned (R2-F37); sitemap XML-escaped, draft-free, exact-form (R2-F17), with the admin/auth disclosure filtered (R4-F4).
- **Maintainability non-regression:** one new lib + three tiny modules (client module trimmed to faq.astro's complexity class — R4-F7); `ContentEntry` untouched (R1-F7); one ordering implementation; one read-path trust boundary; coverage include held to `src/lib/**` (R4-F9); no Container API; five round-4 scope cuts (heading anchors, body scanner, single-hop page, coverage widening, ISO helper) keep the diff small.
- **Full test coverage for new code:** enumerated above; sitemap logic measured in-lib; recorded manual `test:coverage` step per PR with the **json-summary artifact attached** and named branches shown (R2-F35/R4-F23).
- **Lint/typecheck/E2E green:** every PR runs `npm run lint -- --max-warnings=0 && npm run typecheck` + full Vitest + **`format:check`** (R4-F21) in CI; Playwright per the pinned manual model (R2-F31/F4/F41/R4-F23/F24), scoped to the named green set if the baseline is red (R1-F45).

---

## 13. Doc Updates (each lands in the PR that changes the behavior)

1. **`docs/adr/008-db-backed-blog.md`** (new, PR-1): Context, Decision (generic content table, raw-markdown + sanitize-at-render, dynamic sitemap, lean MVP, **heading anchors + rich editor explicitly out**), Consequences. Lesson per R1-F26.
2. **`docs/specs/blog.md`** (new, PR-1, updated through PR-4): Overview; Data Model (caps, image-URL constraint, empty-string semantics — R2-F20, explicit-status rule — R2-F2, date-prefix slug prohibition — R2-F19, date format — R3-F15); Public Routes (the fallback helper and `/resources/blog/*` trivial 301s — R4-F8); Admin Routes (tight-textarea + trim — R2-F8; new-tab editor links — R2-F11; open-on-save — R2-F13; layout constraints — R2-F14; **edit-form `selected={post.status}` and state-specific saved copy — R4-F11/F12**); Admin API incl. the CSRF model and auth-code placement (R2-F32); **Rendering & Sanitization with the allowlist + URI decisions VERBATIM — copied from §8 — including `ALLOWED_ATTR` WITHOUT `id`, the `#`/`http:`-free `ALLOWED_URI_REGEXP`, `ALLOW_DATA_ATTR/ALLOW_ARIA_ATTR: false`, and the statement that the body trust boundary is arbitrary HTML** (R2-F3/R3-F2/R4-F6/F2 — documented and effective policies MUST match; do NOT carry any heading-id/fragment-link text); Draft/Publish flow incl. preview; Caching (lazy per-instance — R1-F53); SEO/sitemap mechanics (shared origin resolver, slashless form — R2-F17, twitter:image/og:image:alt/twitter:image:alt/article:published_time — R2-F15/R4-F16, static-sitemap filter incl. admin/auth — R4-F4, BlogPosting JSON-LD deferred V2); legacy import record (seed reconciliation, edit-window freeze + remediation — R2-F21, pre-existing clean-slug audit — R3-F16); **Accepted residual risks: create collision is concurrent-only AND a single-user body-image-alt publish 400 (R2-F12 + R4-F7); single top-of-page error flash doesn't name the failing form (deferred R1-F17); slug-typo recovery is create-copy-delete (R1-F21); saved-flash announcement relies on reading order (R2-F28)**; deferred R2-F18 and R4-F13 (featured-image thumbnail).
3. **`docs/specs/api.md`** (PR-1): `'blog'` in allowed collections, `_raw` suffix, `createOnly`, POST `action=delete`, origin check, `parseRedirectPath` hardening, blog's explicit-status requirement (R2-F2).
4. **`docs/README.md`** (PR-1): index entries (including this plan and the new spec).
5. **`docs/PRD.md`** (PR-4): replace the line-163 deferral with shipped V1 scope + still-deferred OUT list (heading anchors, rich editor, categories/tags, RSS, pagination, scheduled publishing, related/search/comments/newsletter).
6. **`docs/ROADMAP.md`** (PR-4): move Blog to shipped, noting the four gates and **stating gates 3 (coverage) and 4 (E2E) are satisfied via recorded manual runs with attached artifacts, not automated CI** (R4-F23).
7. **`CLAUDE.md`** (PR-4): remove "public blog features" from the out-of-scope one-liner; add "Blog: DB-backed via /admin/blog; posts are content rows with type='blog'"; correct the brand-colors line to `tailwind.config.mjs`; **correct the deploy gotcha — delete the "netlify.toml has base=app" claim (the checked-in `netlify.toml` has NO `base` key) and the "deploy from repo root" instruction; the correct mechanism is `cd app && npx netlify deploy --prod` (no `--dir`) so the CLI consumes `app/.netlify/functions/ssr.zip`** (R4-F26/F28).
8. **`docs/runbooks/deploy.md`** (PR-3 + PR-4): migration 015 procedure with `--context production` env:get and the mandatory target-host echo (R2-F40) **plus the post-apply `schema_migrations` bookkeeping check (R4-F30)**; blog excluded from `db:seed` (R1-F28); import-verification queries; pre-flight re-audit + edit-window remediation (R2-F21) + pre-existing clean-slug audit (R3-F16); rollback SQL with the `author_email IS NULL` caveat; **build-provenance rule: `stop_builds=true`, GitHub Actions `deploy.yml` is the authoritative and ONLY deploy path, deploy runs `cd app && npx netlify deploy --prod` (no `--dir`); replace the contradictory "No Netlify git integration is used" sentence with the verified reality — the site IS git-connected to branch `testing` and MUST be neutralized via `stop_builds=true`** (R4-F28); **PR-4 build runs with `PUBLIC_SITE_URL=https://spicebushmontessori.org` in the build env (R4-F31)**; Search Console recrawl tip (R3-F12); manual E2E gate steps incl. `E2E_ADMIN_SESSION` secret lifecycle (R2-F4), the orphan-sweep + draft-only-pre-merge rule (R4-F24), and the manual authoring-test fallback script.

---

## 14. Build Sequence (PR-sized, ordered; "flip the public switch last")

Per repo rules: each step is its own worktree branch + GitHub Issue + PR; **lint + typecheck + full Vitest + `format:check` (R4-F21) green before commit**; full suite before merge.

**Step 0 — Prod data audit + environment fixes (no code; blocking gate)**
- **Content audit (R1-F27/F30 + R3-F16 — confirmation, not discovery):** prod is *expected* to contain 6 seed-created rows. Run read-only:
  ```sql
  SELECT type, slug, status, author_email, created_at, updated_at,
         data ? 'featured_image' AS has_featured_image,
         data ? 'image' AS has_image,
         length(data->>'body') AS body_len
    FROM content WHERE type IN ('blog','cms_blog') ORDER BY slug;
  ```
  Record the rows; confirm historical slugs (ground truth for the §7 fallback, incl. file 6); compare body lengths/`updated_at` against the markdown; **confirm NO pre-existing clean-slug `type='blog'` row exists** that 015's `DO NOTHING` would silently skip (R3-F16). Any row matching neither the seed shape nor the six clean slugs → STOP. **Re-run as a mandatory pre-flight immediately before applying 015** (R2-F21).
- **SEO settings audit (R2-F16):** in the same session: `SELECT key, value FROM settings WHERE key IN ('seo_global','seo_page_overrides');` — confirm `siteNoIndex` is false and no `/blog`/`/blog/*` override exists.
- **Environment (HARD BLOCKERS for PR-4):**
  1. **`npx netlify env:set PUBLIC_SITE_URL https://spicebushmontessori.org`** — no context scoping, ALL contexts (R2-F41); redeploy; verify `curl -s https://spicebushmontessori.org/ | grep canonical` shows the prod origin. PR-4 does not merge until green.
  2. **Neutralize Netlify git CI: set `build_settings.stop_builds=true`** (R2-F38) and record it in the runbook.
  3. **Pin + verify the deploy mechanism (R4-F26/F27/F28):** GitHub Actions `deploy.yml` is the authoritative and only path (git-CI is stopped). **Patch `deploy.yml`'s deploy step to run from `app/` without `--dir`: `cd app && npx netlify deploy --prod --auth=$NETLIFY_AUTH_TOKEN --site=$NETLIFY_SITE_ID`** (today it runs `npx netlify deploy --prod --dir=app/dist` from repo root, which uploads a STATIC-ONLY deploy that 404s every SSR route — the SSR function manifest at `app/.netlify/functions/ssr.zip` is never consumed). **Then run one verification deploy THROUGH the actual `deploy.yml` workflow** (NOT a local CLI — local linked state is gitignored and masks the bug) and confirm an SSR route (e.g. an admin page or any DB-backed page) returns 200, proving the SSR function uploaded. This is a hard PR-4 prerequisite. GH secrets `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` exist (verified). The misleading round-3 "function resolution rides the UI base=app setting / operator can't break it" framing and the `--dir=app/dist`-from-root instruction are DELETED everywhere.
- **Resolved facts recorded (R1-F49):** one Netlify site, one Neon DB, no rehearsal buffer. Migration 015 applies once, directly to prod — safe pre-PR-4 (no public routes). Optional rehearsal: a Neon branch.
- **File GitHub issues:** (a) pre-existing sitemap/robots origin bug; (b) pre-existing static-sitemap admin/auth disclosure (R4-F4); (c) E2E baseline issues if red (R1-F45); (d) the `scroll-behavior: smooth` reduced-motion cascade bug (fixed in PR-0a — R3-F5); (e) the saved-banner-with-error quirk on faq/staff/testimonials (R1-F16).

**PR-0a — Pre-existing smooth-scroll a11y fix (R3-F5, isolated)**
- Scope `html { scroll-behavior: smooth }` inside `@media (prefers-reduced-motion: no-preference)` in `app/src/styles/global.css`. Standalone (not a blog dependency — R4-F6 cut the fragment scrolling that once justified bundling it); ships on its own small PR.

**PR-1 — Core lib + endpoint enablement** (Issue: "Blog V1: content pipeline enablement")
- Add `app/src/lib/blog-content.ts` + tests (renderer demotion/clamp **with NO ids and per-call `previousDepth`** — R4-F6/F22, raw-HTML + author-id XSS matrix — R4-F2/F1, HTTPS-only URI policy — R3-F2, sitemap builder + `escapeXml`, `resolveLegacyBlogRedirect` — R2-F37), `app/src/lib/site-origin.ts`; edit `app/src/pages/api/admin/content.ts` (allowlist, origin check, `_raw`, blog hooks with raw-status passthrough — R2-F2, `createOnly`, `action=delete`, `parseRedirectPath` hardening); **coverage include held to `src/lib/**` (R4-F9)**; draft-invisibility SQL-pinning tests; **the existing-collection save+delete regression (R4-F32)**; ADR-008, `docs/specs/blog.md` (sanitizer block copied verbatim from §8), `docs/specs/api.md`, `docs/README.md`. Verify the Netlify function builds with `isomorphic-dompurify`; **PR-1 verification deploy confirms a same-origin admin save passes (no false 403 — R4-F5).**
- Acceptance (Given/When/Then): valid blog POST creates a row + invalidates cache; `{`-leading body and `"2024"` excerpt round-trip byte-identical; publishing while missing excerpt/body/date, an unknown status, **a missing/empty status (R2-F2)**, an over-cap body, a `javascript:`/`data:`/`//`/`http:`/`/\`-prefixed image URL (R2-F1/R3-F2), a junk imageAlt, a date-prefixed slug (R2-F19), or a published body containing `![](x)` (R2-F26) → 303 with plain-language `?error=`, no row written; `createOnly` for an existing slug → 400 untouched; `action=delete` → row removed; mismatched `Origin`/`Sec-Fetch-Site: cross-site` → 403; both headers absent → fail-open; authenticated non-admin → 403 (unit; the 401/303 codes verified in PR-4's E2E — R2-F32); **an existing collection still saves and deletes (R4-F32).** Coverage json-summary artifact attached (R2-F35/R4-F23).

**PR-2 — Admin UI** (Issue: "Blog V1: /admin/blog authoring page")
- Add `app/src/pages/admin/blog.astro` + `app/src/lib/blog-form-fields.ts` + **`app/src/lib/blog-admin-client.ts` (trimmed to native attrs + conditional-required + slug-collision — R4-F7) with its jsdom unit tests** (R2-F36); edit `AdminNav.astro`; handler-integration test (§12.16, incl. omitted-status + existing-collection regression) and the untouched-status edit-retention test (§12.18 — R4-F11). Update `docs/specs/blog.md`. **PR description carries the seed-row freeze note** (R2-F21). Confirm `format:check` passes on the hand-authored + `prettier-ignore` files (R4-F21).
- Acceptance: draft-with-only-title appears under Drafts with a sanitized Preview; edit-form-of-published-post loaded + excerpt cleared + submit → browser blocks, focuses excerpt (R2-F9); colliding slug → inline `role="alert"` + native block + slug focus (R2-F12); image upload → URL field populates, `input` fires, live region reads "Image attached — save the post to keep it.", Copy-address announces "Address copied", crop + Media links open in a new tab (R2-F11/F30), the live-region node is NOT display:none (R4-F14); a server error redirect renders ONLY the error flash, `role="alert"`, focused once then `?error=` stripped (R2-F28/R3-F22); saving an edit reopens that post's editor + preview (R2-F13); a stray-status row shows under Drafts; **editing a published post WITHOUT touching the status select keeps it published — saved flash reads "Published — now live" not a generic "saved" (R4-F11/F12)**; status select visible top-level in every form (R2-F14). Lint (jsx-a11y) + `blog-admin-client` unit tests green.

**PR-3 — Legacy import migration + seed defusal** (Issue: "Blog V1: import 6 legacy posts")
- Add `015_import_legacy_blog_posts.sql` (reconcile-then-import, `BEGIN/COMMIT`, dollar-quote check); remove `'blog'` from `CONTENT_COLLECTIONS` in `insert-critical-data.js` (R1-F28); **2-line patch to `apply-migrations.sh` printing the parsed target host before applying** (R2-F40); update deploy runbook (migration invocation, seed exclusion, pre-flight re-audit + remediation — R2-F21, clean-slug audit — R3-F16, post-apply bookkeeping check — R4-F30). Apply per §15 (single DB — once, to prod, **immediately after re-running the Step-0 audit**).
- Acceptance: exactly 6 published rows with clean slugs; zero seed-authored rows; `created_at` = frontmatter dates at 12:00Z; `author_email IS NULL`; all 6 `data.image` values resolve to files present in `app/public` (R2-F24); descriptive ≥6-char `imageAlt`; legacy `categories`/`tags` in JSONB; bodies match the markdown (trimmed); re-run → zero changes; `npm run db:seed` afterward → zero blog rows touched. Verify in `/admin/blog`.

**PR-4 — Public pages + SEO (the launch PR)** (Issue: "Blog V1: public /blog + SEO")
- Rewrite `blog.astro` + `blog/[slug].astro` (fallback via `resolveLegacyBlogRedirect`); retarget `resources/blog.astro`; add the **3-line `resources/blog/[slug].astro` 301 (R4-F8)**; `Layout.astro` props (`ogImage`/`ogImageAlt`/`ogType`/`publishedTime`, twitter:image sharing `resolvedOgImage`, **twitter:image:alt** — R4-F16, inlined ISO `publishedTime` — R4-F10); `sitemap-blog.xml.ts` (thin shell); `robots.txt.ts` line; **`@astrojs/sitemap` options object with the `filter` excluding blog/`resources/blog`/`/admin`/`/auth` (R3-F8/R4-F4)**; `SEO_MANAGED_PAGES` entry; `e2e/blog.spec.ts` per §12 (flow test with orphan-sweep + draft-only-pre-merge — R4-F24, 401/303 middleware assertions, robots/twitter/twitter:image:alt assertions, exact sitemap `<loc>`s, `.blog-body a` pin, metadata-contrast pin — R4-F18, post route in a11y lists with `/blog` kept out of heading-hierarchy — R4-F20); delete/fold `content-db-direct.spec.ts` blog tests; PRD/ROADMAP/CLAUDE.md updates (deploy-gotcha correction — R4-F26/F28, coverage/E2E manual-gate statement — R4-F23); finalize `docs/specs/blog.md`. **Build with `PUBLIC_SITE_URL=https://spicebushmontessori.org` (R4-F31).** Review checklist: manual one-line check that the `/blog` empty-state renders the friendly message (R2-F6).
- **Hard dependencies:** PR-3 verified in prod **and** Step-0 env fix verified live **and** Netlify git CI stopped **and** the corrected `deploy.yml` SSR-upload verification green through the actual workflow (R4-F26/F27).
- Acceptance (Given deploy): `/blog` → 200 with 6 posts newest-first; each clean slug → 200 with sanitized body and per-post meta (prod-origin canonical/og/twitter, `index, follow`); seed-era date-prefixed slug → 301; unknown/draft/date-prefixed-miss slugs → branded 404; `/resources/blog{,/<slug>}` → 301; sitemap + robots → prod-origin, exact-form, draft-free; static `sitemap-0.xml` excludes blog/admin/auth; publishing a new post in admin → live immediately, index ≤ 5 min, no deploy. E2E gate per §12, results + artifacts recorded (cookie value never recorded — R2-F4).

**PR-5 — Cleanup** (Issue: "Blog V1: remove legacy markdown source")
- Delete `app/src/content/blog/*.md`; remove `blogCollection` from `app/src/content/config.ts` (seed path defused in PR-3; `photos`/`hours` untouched). Final spec touch-up.
- **Gate (R4-F29):** a full `cd app && npm run build` + typecheck in CI must be green (removing `blogCollection` regenerates content-collection types), plus an explicit assertion that no component imports the file collection (`grep -rn "getCollection('blog')" app/src` returns nothing in components, and `grep -n "blog" app/scripts/insert-critical-data.js` shows the defused state). PR-5 must not merge until that build is green. Legacy content recoverable via git history.

Dependencies: PR-0a is independent. PR-2 and PR-3 depend on PR-1 and may proceed in parallel (PR-2 freeze note in force until 015 is verified — R2-F21). PR-3 depends on Step 0's audit confirmation + the pre-flight re-audit. PR-4 hard-depends on PR-3 (verified in prod), the Step-0 env fix (verified on live canonicals), stopped git CI, and the corrected+verified `deploy.yml`. PR-5 depends on PR-4 launched and verified.

---

## 15. Rollout & Rollback

**Deploy order** = merge order. The public site is untouched until PR-4. The owner reviews all 6 imported posts and the authoring flow in `/admin/blog` before anything goes public; the blog launches populated, in a single deploy.

**Deploy mechanism (R4-F26/F27/F28 — the round-3 mechanism was verified false and is replaced):** deploys run via the corrected GitHub Actions `deploy.yml`, whose deploy step is **`cd app && npx netlify deploy --prod --auth=$NETLIFY_AUTH_TOKEN --site=$NETLIFY_SITE_ID` (no `--dir`)** — running from `app/` so the Netlify CLI discovers `app/.netlify/` and uploads the SSR function manifest (`app/.netlify/functions/ssr.zip`). The previous `npx netlify deploy --prod --dir=app/dist` from repo root uploaded a STATIC-ONLY `app/dist` that 404s every SSR route (the entire blog), because `netlify.toml`'s `[functions] directory = "netlify/functions"` is a non-existent repo-root path and `app/dist` contains no `.netlify` functions. **There is no "deploy from repo root" form and no `--dir`; the round-3 "operator can't break it / base=app discovery" framing is deleted.** Because `stop_builds=true` is locked (Step 0), GitHub Actions is the **only** deploy path — git-CI is off. The SSR-function-upload verification (Step 0, item 3) is a hard PR-4 prerequisite run **through the actual workflow**, not a local CLI (gitignored linked state masks the bug). **The PR-4 production build runs with `PUBLIC_SITE_URL=https://spicebushmontessori.org` (R4-F31)** so the static sitemap bakes the prod origin.

**Migration execution (R1-F52 + R2-F40 + R4-F30):** from `app/`, immediately after the pre-flight re-audit (R2-F21):
```bash
NETLIFY_DATABASE_URL="$(npx netlify env:get NETLIFY_DATABASE_URL --context production)" npm run db:migrate
```
**`--context production` is mandatory** — `env:get` defaults to the dev context, and this site carries context-divergent values. **The target-host echo is mandatory** (R2-F40): `apply-migrations.sh` (patched in PR-3) prints the parsed host before applying; the operator confirms it is the Neon pooler host before proceeding. **After applying, run `SELECT 1 FROM schema_migrations WHERE …'015'`** (R4-F30) — the bookkeeping psql call is non-atomic with the apply, so a between-phase crash leaves 015 applied-but-unrecorded; 015's idempotency makes a re-run harmless, but the operator should re-insert the bookkeeping row rather than re-run blindly. 015 is `BEGIN/COMMIT`-wrapped; one DB; the migration runs once.

**Launch verification (immediately post-PR-4 deploy):**
- `curl -sI` on `/blog` (200), each clean slug (200), one date-prefixed legacy slug (301 → clean), one date-prefixed unknown slug (404), `/resources/blog` (301), `/resources/blog/<slug>` (301), a known-bad slug (404).
- `curl -s https://spicebushmontessori.org/blog/<slug> | grep -E 'rel="canonical"|og:url|og:image|twitter:image|og:image:alt|twitter:image:alt|article:published_time|name="robots"'` — assert the prod origin on canonical/og:url/og:image, twitter:image carrying the post's featured image (not the global default — R2-F15), **twitter:image:alt present (R4-F16)**, and `robots` = `index, follow` with no googlebot-noindex tag (also on `/blog` — R2-F16).
- `curl -s /sitemap-blog.xml` (200, XML, prod origin, exact slashless `<loc>` forms — R2-F17, no drafts), `/robots.txt` (new Sitemap line, prod origin), and a grep of the static `sitemap-0.xml` confirming blog/`/resources/blog`/`/admin`/`/auth` are absent (R4-F4).
- Re-run `e2e/blog.spec.ts --project=chromium` with `E2E_BASE_URL=https://spicebushmontessori.org` (§12 model; fresh `E2E_ADMIN_SESSION`, revoked after — R2-F4; the publish→200 transition asserted in THIS post-deploy run — R4-F24).
- Submit `sitemap-blog.xml` in Search Console — the recovery mechanism for the unwound 301s (R1-F26).

**Rollback paths:**
- PR-4 regression → revert the PR; `/blog` returns to a 301 stub; DB rows and admin page remain. **(Reliable only with git CI stopped — a stray `testing`-branch push could otherwise race or undo the revert; R2-F38.)**
- PR-0a / PR-1 / PR-2 regression → revert; no public impact.
- Import problems (PR-3) → `DELETE FROM content WHERE type='blog' AND slug IN (…the six…) AND author_email IS NULL;` — the NULL guard ensures owner-edited posts are never deleted. Rollback does not resurrect the seed rows 015 deleted (the markdown remains in tree until PR-5 and in git forever). Fixes ship as a corrected 016, never by editing an applied migration.
- Admin emergency: flip any post to Draft in `/admin/blog` — off the index within ≤ 5 minutes, direct URL 404s as the entry cache expires; no deploy.

---

## 16. Risks & Open Questions

**Owner input required**
1. **Step 0 audit confirmation (blocking):** expected result is 6 seed rows — handled by 015's reconciliation. Escalation reserved for rows matching neither the seed shape nor the six clean slugs, a seed row diverging from the markdown, or a pre-existing clean-slug row (R3-F16). **Also blocking: the SEO settings read (R2-F16), and the Netlify build-settings change (`stop_builds=true` — R2-F38).**
2. **Other legacy URL shapes (R1-F25):** did the pre-Astro site serve posts at URL shapes beyond `/resources/blog/<slug>` and the seed-era date-prefixed slugs? Check old-site archives / Search Console (R3-F12); if confirmed, add redirect entries to PR-4. (Note: the single-hop `/resources/blog/[slug]` optimization was reverted to a trivial 2-hop 301 — R4-F8 — because these URLs are unverified to have ever existed; re-add a single-hop only on Search Console evidence.)
3. **`E2E_ADMIN_SESSION` provisioning (R2-F4):** a freshly minted session cookie immediately before each gate run; never recorded; revoked (or expired within 12h) after. If genuinely impossible, the E2E gate is documented as excluding the core authoring journey, with a manual test script in the runbook.

**Resolved in earlier rounds (were open questions)**
4. ~~Testing-site DB~~ — one Netlify site, one Neon DB (R1-F49).
5. ~~File-6 slug~~ — confirmed from the Step 0 DB audit (R1-F24).
6. ~~Prod blog rows unverified~~ — seed rows are the expected case; 015 reconciles them (R1-F27).
7. **Broken prod sitemap/robots origin** — pre-existing site-wide bug with its own issue; the `PUBLIC_SITE_URL` correction (all contexts — R2-F41) + the PR-4 build-env fix (R4-F31) are hard PR-4 blockers.

**Accepted risks (no action beyond what's planned)**
8. Unwound 301s: browsers revalidate (`no-cache`, verified); recovery lag is Googlebot recrawl only, mitigated by sitemap submission (R1-F26).
9. Cross-instance staleness: index and edits lag ≤ 5 minutes; new post URLs immediate. Surfaced in admin UI.
10. Two admins editing the same post → last-write-wins (existing platform semantics); `createOnly` removes the worst case; noted in the spec.
11. Markdown learning curve — mitigated by the help block, link normalization, heading normalization (demotion + clamp, NO anchors — R4-F6), the save-then-Preview loop (R2-F13), and client-side publish validation. Rich editor is a V2 item only if owners struggle.
12. **Create collision (R2-F12):** with the blocking `setCustomValidity` check, the residual state-losing 400 is **genuinely concurrent-only** — two admins creating simultaneously, or a slug created by someone else after the page's server-rendered slug list was emitted. Accepted in `docs/specs/blog.md`; revisit autosave only if owners actually lose work.
13. **Single-user body-image-alt 400 (corrected scope — R4-F7):** with the body-image client scanner cut, a single owner who pastes `![](url)` or `![photo](url)` and clicks Publish gets a server 400 (the client no longer pre-catches body-image alt quality; it is server-enforced). The error flash is focused and names the offending image; no draft-row state is destroyed (the row was already saved or is being created with valid title+slug). Accepted as the cost of keeping the client module at faq.astro's complexity class. (This corrects the round-3 "concurrent-collision-only" residual to "concurrent collision AND single-user body-image-alt.")
14. The flow E2E (test 24) writes a short-lived **draft** to the production DB with an orphan-sweep pre-step and guaranteed cleanup verified through an uncached surface (R2-F31/R4-F24/F25); the publish→200 transition is asserted only in the post-deploy run so a pre-merge crash cannot leave a stray public row — accepted.

**Deferred findings (recorded, not implemented)**
- **R1-F14 (autosave backup cleared on error redirects):** mooted — autosave removed in round 1.
- **R1-F17 (single top-of-page error flash doesn't identify which collapsed form failed):** deferred. Client mirrors + the rare residual errors (concurrent collision names the slug; body-image-alt names the image) make per-form targeting low-value; the error flash is `role="alert"`, focused once, never auto-dismissed. Revisit if owners report confusion.
- **R2-F18 (untruncated meta descriptions; thin index title/description):** deferred. Search engines truncate gracefully; the six excerpts are short; owners control excerpt length and `seoDescription`; `/blog` joins `SEO_MANAGED_PAGES` (tunable in `/admin/seo`). A length cap would be new behavior beyond any gate. Revisit with V2 SEO polish (alongside BlogPosting JSON-LD).
- **R4-F13 (featured-image thumbnail preview in the editor):** deferred V2. A genuine owner-UX improvement on the most visual field, but additive UI with its own load/error/empty states and a11y, raised at round 4; the house staff/media clone source ships URL-string-only, so the text-box-only field is not a regression from norms. Recorded as high-value V2 — render an `<img>` thumbnail of `data.image` with onload/onerror states.

**Builder verifications (assumptions to confirm during implementation, each with a fallback)**
18. `new Response(null, { status: 404 })` from `blog/[slug].astro` renders the branded `404.astro` on the Netlify adapter — E2E test 20 asserts; fallback `Astro.rewrite('/404')`.
19. `marked` v16 `parse()` synchronous with `async: false`; walkTokens + renderer-override signatures confirmed at import; pinned by unit tests 3–4. **The renderer's `previousDepth` clamp state is created fresh inside `renderPostBody` per call, not at module scope (R4-F22)** — verified by the two-consecutive-call unit test (test 3).
20. `isomorphic-dompurify` initializes in the Netlify Functions runtime without bloating the bundle — PR-1 deploy; fallback Rollup-externals pattern.
21. `/api/media/upload` response shape `{ success, url, photoSlug }` (verified) — the blog widget wires the same fields, and its **error response shape** is confirmed so the failure-branch live-region message (R3-F21) fires on a real error.
22. `ExternalLinkTargetBehavior` covers `set:html` links — else `afterSanitizeAttributes` hook for `rel="noopener noreferrer"`.
23. Dollar-quote tag for 015 absent from all bodies — checked during transcription.
24. Astro processes (bundles) the `blog.astro` `<script>` so it can import `blog-admin-client.ts` — verified at PR-2 build time; fallback: a tiny `is:inline` bootstrap importing the module via a `/src`-bundled entry.
25. The `@astrojs/sitemap` `filter` option excludes the blog/`resources/blog`/`admin`/`auth` URLs from `sitemap-0.xml` as configured — E2E test 23 + the launch `grep` assert (R3-F8/R4-F4); fallback: set Astro `trailingSlash:'never'` and verify the static sitemap then emits slashless forms agreeing with the canonical and blog sitemap.
26. **The corrected SSR deploy mechanism (`cd app && npx netlify deploy --prod`, no `--dir`) uploads the SSR function via the adapter manifest in CI (R4-F26/F27)** — verified by the SSR-function-upload verification deploy run through the actual `deploy.yml` workflow (NOT a local CLI, which is masked by gitignored linked state); fallback: temporarily re-arm Netlify git-CI on a pinned launch branch and re-verify.

---

## 17. Revision History

### Round 1 (2026-06-05) — stress review, 45 findings resolved, 2 deferred

**Reversals of v1 design decisions:**
- **Autosave/restore removed** (R1-F10; moots deferred R1-F14): the feature's largest bespoke client artifact had no admin-surface precedent and self-nullified in its primary scenario. Replaced with client-side conditional-required validation (§5.4); the slug-collision warning retained (R1-F11).
- **Migration 015 rewritten around verified seed rows** (R1-F27, critical): 015 deletes seed rows then inserts, in one transaction (R1-F52); the seed script's `'blog'` entry removed (R1-F28); Step 0 became confirmation (R1-F30) with body-diff reconciliation (R1-F24).
- **`PUBLIC_SITE_URL` fix promoted to hard PR-4 blocker; v1's custom sitemap origin precedence deleted** (R1-F22/F47/F8): one shared resolver serves robots.txt, the sitemap, and ogImage; deploy mechanism pinned (R1-F50).
- **E2E execution model written down** (R1-F39/F49): CI runs no Playwright; local dev-server gate run pre-merge, prod run post-deploy, baseline recorded, stale `content-db-direct.spec.ts` reconciled (R1-F45).
- **Ordering/`ContentEntry`** (R1-F7/F9): slug-DESC tiebreak via one shared comparator; `updatedAt` dropped; sitemap `lastmod` omitted; admin status filter removed; the 12:00/12:01 trick dropped.

**Security:** read-path slug-shape + sitemap XML-escaping (R1-F1); featured-image URL scheme incl. ogImage (R1-F2); origin-check CSRF fail-open (R1-F3); corrected 401/403 auth criteria (R1-F4); `parseRedirectPath` backslash fix (R1-F5); content size caps (R1-F6).

**Owner-UX:** static `?saved=new` + friendly copy (R1-F15); no saved-banner-on-error (R1-F16); upload input-event + "save to keep" + copy-address (R1-F18/F20); `www.` normalization + fragments + link-rule help (R1-F19/F46); slug-typo recovery + softened delete confirm (R1-F21).

**A11y:** required-attribute rule (R1-F32); flash roles + no auto-dismiss on errors (R1-F33); announcement mechanisms (R1-F34); forest-canopy link color + badge pairings (R1-F35); unconditional a11y E2E list additions (R1-F36); CI-aligned imageAlt validation (R1-F37); describedby summary pattern (R1-F38).

**Testing/narrative:** deterministic index assertion (R1-F43); coverage include + named branches (R1-F44); draft invisibility via SQL-pinning + HTTP-level authoring-flow test (R1-F41/F42); URI vectors (R1-F46); prod-origin canonical assertions (R1-F22); 301-cache model rewritten (R1-F26); `preloadCommonData` dead-code (R1-F53); preview eager-render threshold (R1-F13); categories/tags scaffolding deleted (R1-F12); legacy `/resources/blog/<slug>` + date-prefixed URLs (R1-F24/F25).

### Round 2 (2026-06-05) — stress review, 40 findings resolved, 1 deferred

**Theme: round 1's fixes were right but incompletely carried — round 2 closed the gaps between what the plan claimed and what it specified.**

**Security (R2-F1–F4):** backslash-as-slash applied uniformly (sanitizer/write/read) with `'/\evil.com'` vectors; explicit-status requirement; `ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` pinned false; `E2E_ADMIN_SESSION` secret-handling + honest unit-only origin-check note. **Trust boundary/data (R2-F7/F20/F21/F24):** one read-path image check replacing the partial template re-check; empty-string semantics with `||` meta fallbacks; PR-2→015 freeze + pre-flight + remediation; corrected file-6 image path. **Owner-UX (R2-F8–F14):** tight-textarea + trim; client validation init-at-load with native mirrors and blocking collision; new-tab editor links; open-on-save; top-level status select. **SEO (R2-F15–F17/F19):** twitter:image/og:image:alt/article:published_time; indexability asserted with audited settings rows; slashless sitemap with exact `<loc>`s; date-prefix slug prohibition. **A11y (R2-F26–F30):** body-image alt at publish + heading clamp; concrete `.blog-body` link assertion; focus-on-load error flash with corrected roles-don't-announce note; functional fragment ids; live-region discipline. **Testing/gates (R2-F5/F6/F31/F32/F35–F37):** narrowed coverage include + in-lib sitemap logic + manual coverage step; data-path-only empty-state with Container prohibition; chromium-pinned E2E with worker-unique slugs + uncached cleanup; 401/303 to E2E; extracted client-validation + legacy-redirect helper, unit-pinned. **Ops (R2-F38/F40/F41):** git-CI neutralization + SSR-function verification (Option A) + base=app correction; `env:get --context production` + host echo; all-contexts `PUBLIC_SITE_URL` + `npm run dev` gate. **Deferred:** R2-F18.

### Round 3 (2026-06-05) — stress review, 24 findings resolved, 3 deferred

**Theme: round 2 closed claim-vs-spec gaps; round 3 closes the remaining trust-boundary inconsistencies, single-user data-loss paths, SEO sitemap-correctness gaps, ops cwd/function-upload traps, and test-harness mismatches — and corrects records where the plan asserted more than it delivered.**

**Security (R3-F2/F3):** body-content link/image URLs made HTTPS-only (dropping `http:` from `ALLOWED_URI_REGEXP`) to unify the body trust boundary with the featured-image policy, with `http:` body vectors added; the `id`/DOM-clobbering note corrected to match the actual config (`SANITIZE_NAMED_PROPS` left default-off, residual recorded as accepted — later DELETED by R4-F1). **Owner-UX/data-loss (R3-F6/F14/F21/F22):** body-image alt client-mirrored (later cut by R4-F7); edit-form image-input prefill `value={post.image}`; upload live region announces failure + copy fallback; error-flash focus gated to once with `?error=` stripped. **SEO (R3-F8/F9/F10/F11/F12/F13/F18):** static-sitemap `filter` excluding blog + redirected resources/blog; independent static-sitemap origin verification; single-hop `/resources/blog/<date-slug>` (later reverted by R4-F8); corrected slug-strategy framing + Search Console step; ISO `article:published_time`; undated-row comparator. **Data/migration (R3-F15/F16):** date-format pinning; pre-existing CLEAN-slug audit. **Testing (R3-F25/F26/F27/F31):** corrected handler-integration mock set; shape-correct a11y lists; scoped heading-hierarchy gate; form-path-303-vs-JSON-400 by request shape. **Ops (R3-F5/F28/F29/F30/F32):** smooth-scroll fix isolated to PR-0a; build-vs-deploy cwd split pinned; SSR-function verification a prerequisite for the chosen mechanism; per-merge auto-deploy reconciled; false base=app claim corrected. **Deferred:** R3-F7, R3-F23, R3-F24.

### Round 4 (2026-06-05) — stress review, 29 findings resolved, 1 deferred

**Theme: round 4 is dominated by SCOPE CUTS. The additive critics in rounds 2–3 grew five unscoped features (in-post heading anchors, a body-image client scanner, a single-hop legacy redirect page, a one-line ISO helper, and a coverage-include widening), each dragging test/abstraction/security debt. Round 4 removes them, which collapses several "accepted residuals" entirely. It also corrects a CRITICAL false SSR-function-upload mechanism that would have 404'd the entire launch, pins a silent-unpublish bug on the edit-form status select, and closes a cluster of a11y/SEO/test/ops completeness gaps.**

**Scope cuts (the dominant theme):**
- **In-post heading anchors CUT (R4-F6, high)** — never in the locked IN list; documentation-grade for a ~3-posts/year school blog; and the root of a security residual (author-controlled `id`) plus two deferrals. Removed: heading-id generation from the renderer, `id` from `ALLOWED_ATTR`, `#`/fragment hrefs from `ALLOWED_URI_REGEXP`, the anchor help copy (§5.7), and interactive anchors in the preview. KEPT: the h1→h2 demotion and heading-skip clamp. **This cut RESOLVES R4-F1 by removal, not mitigation.**
- **R4-F1 (author-controlled `id` reaches the PUBLIC post page) resolved VIA the R4-F6 cut.** The round-3 config kept author-supplied raw-HTML ids on both the admin preview AND the public page (the round-3 note understated the scope as admin-only), because marked passes raw HTML verbatim and `SANITIZE_NAMED_PROPS` was off. The finding's suggested `SANITIZE_NAMED_PROPS`/id-hook fix is dead complexity for a feature being deleted — once `id` leaves `ALLOWED_ATTR` and the renderer emits no ids, DOMPurify strips ALL author ids. **The round-3 "accepted DOM-clobbering residual" record and its `SANITIZE_NAMED_PROPS` note are DELETED;** a unit vector asserts a raw `<h2 id="x">`/`<a id="x">` retains no attacker id on the public render.
- **Body-image-alt client scanner CUT (R4-F7, high)** — `blog-admin-client.ts` had grown into a parallel validation engine with no admin-surface precedent (verified: faq.astro's `<script>` uses ONLY `.required =` toggling). Trimmed to native attributes (`minlength`, `pattern`); the conditional-`required` toggle AND the slug-collision block kept. **Brings the module back to faq.astro's complexity class.** The **single-user body-image-alt 303 returns** — the residual is corrected to "concurrent collision AND single-user body-image-alt" (§16.13).
- **`/resources/blog/[slug]` reduced to a trivial 3-line 301 (R4-F8, medium; reverses R3-F11)** — the single-hop optimization built a net-new page + helper coupling + a brittle E2E to save one 301 hop on URLs unverified to have ever existed. Now `Astro.redirect('/blog/'+slug, 301)`; the date-prefix fallback strips on the second hop; test 23's single-hop assertion dropped.
- **Coverage `include` kept at `src/lib/**` only (R4-F9, low; reverses R2-F5's content.ts addition)** — gating the 559-line shared endpoint for ~40 lines of blog code is the maintainability accretion this plan is judged on. The ~40 lines are evidenced by the handler-integration test as named-branch evidence. **The round-3 "narrowed coverage include" label was wrong (it was a widening); corrected to the unchanged `src/lib/**`.**
- **`articlePublishedTimeIso` helper inlined (R4-F10, low)** — a one-line `{date}T12:00:00Z` concat did not warrant a named, separately-tested helper. Inlined at the Layout call site; its unit test dropped; the assertion folded into E2E test 19/21.

**Owner-UX (high/medium):**
- **Edit-form status `<select>` pinned to `selected={post.status}` (R4-F11, high)** — the plan pinned the image prefill loudly but never the status select, pointing a builder toward a silent-unpublish bug (a typo-edit of a published post unpublishes it with a success flash). Now mirrors faq.astro:642-647; "default Draft" applies to the add-form only; proven by §12.18.
- **Saved-flash copy split by draft-vs-published state (R4-F12, medium)** — the static `?saved=new` literal gave draft and published saves the IDENTICAL message, reinforcing the most common owner mistake. The page resolves the saved slug's status and renders state-specific copy.

**A11y (medium):**
- **Non-link metadata text contrast pinned (R4-F18, medium)** — only `.blog-body a` was pinned; the date/byline/excerpt used a failing token. Now `text-earth-brown/80` (≈ 6.4:1) with a deterministic `getComputedStyle` assertion; the shared contrast test does NOT discharge this gate.
- **Minimal `.blog-body` styling for allowlisted block elements (R4-F19, medium)** — blockquote/code/pre/table render borderless/semantics-lost without a typography plugin. Chose minimal CSS over dropping the tags.
- **Live-region must NOT be `display:none`/hidden (R4-F14, low)** — the cloned staff node carries a `hidden` class; content in a display:none live region is not announced. Remove `hidden`; §12.12 asserts the node is not display:none at write time.

**SEO (low):**
- **`twitter:image:alt` added (R4-F16, low)** — Twitter/X does not read `og:image:alt`; with `summary_large_image` the card alt comes from `twitter:image:alt`. One line; added to launch curls + E2E test 19.
- **Static sitemap `filter` extended to exclude `/admin`, `/admin/*`, `/auth/*` (R4-F4, low)** — the live `sitemap-0.xml` already advertises the admin surface + auth endpoints (pre-existing disclosure filed as an issue at Step 0); PR-4 re-drives crawler attention and would enumerate `/admin/blog`. Near-zero cost.

**Testing (high/medium/low):**
- **`/blog` empty-state breaks the heading-hierarchy E2E + the gate is coupled to live prod DB (R4-F20, high)** — the empty-state 1→3 skip fails the gate, and the gate depended on the import landing ≥1 published post. Keep `/blog` OUT of the heading-hierarchy list (assert its order behind a posts-exist precondition); add only the post route; pin the gate's 6-published-posts DB precondition.
- **`format:check` added to every PR's gate (R4-F21, medium)** — CI runs five gates incl. `format:check`; the `prettier-ignore` + hand-authored files can pass lint+typecheck+unit yet block at `format:check`. Added to §14 and PR-2 acceptance.
- **Renderer per-call state independence (R4-F22, medium)** — the admin list server-renders `renderPostBody` for every post in one request; module-scope `previousDepth` would continue across posts. Pinned fresh-per-call; a two-consecutive-call unit test added.
- **Coverage/E2E gates are manual-only with unfalsifiable evidence (R4-F23, medium)** — CI runs neither. Require the PR to attach the json-summary artifact; ROADMAP states gates 3/4 are satisfied via recorded manual runs with attached artifacts, not automated CI.
- **Flow test writes a published post to PROD during the LOCAL pre-merge run (R4-F24, medium)** — a hard crash between publish and cleanup leaves a stray published row that goes public on PR-4 deploy. The pre-merge run creates a DRAFT and asserts publish→200 ONLY post-deploy; an `e2e-flow-%` orphan-sweep pre-step reaps prior crashes; documented as a mandatory runbook pre-step.
- **Flow-test cleanup "or SQL" path is unwired (R4-F25, low)** — the SQL fallback needs a pg connection the spec never wires. Pinned to the single uncached admin-read mechanism; the "or SQL" alternative dropped.

**Ops (critical/high/medium):**
- **CRITICAL: the SSR-function-upload mechanism was false (R4-F26)** — the round-3 claim that `netlify deploy --prod --dir=app/dist` from repo root "discovers app/.netlify/functions … operator can't break it" is false on every clause: `netlify.toml` `[functions] directory = "netlify/functions"` is a non-existent repo-root path; the adapter writes `app/.netlify/functions/ssr.zip`; `app/dist` has no `.netlify` functions; the correct local `.netlify/netlify.toml` is gitignored (absent in CI); and the committed `deploy.yml` deploys `--dir=app/dist` from repo root with no `cd app`, so CI uploads a STATIC-ONLY deploy that 404s every SSR route. Fix: deploy via `cd app && npx netlify deploy --prod` (no `--dir`, adapter manifest consumed); the misleading sentence DELETED; remediation branch added.
- **deploy.yml's deploy step contradicts the proven mechanism, and Option A was treated as merge-ready (R4-F27, high)** — fixed deploy.yml's deploy step to run from `app/` without `--dir`; the SSR verification must run through the ACTUAL deploy.yml workflow (a local CLI run is masked by gitignored linked state).
- **deploy.md is internally contradictory (R4-F28, high)** — it asserts "No Netlify git integration is used" while Step 0 requires `stop_builds=true` on a git-connected build. Replaced the sentence with the verified reality (git-connected build on branch 'testing' MUST be neutralized via `stop_builds=true`); GitHub Actions deploy.yml is authoritative. **Because `stop_builds=true` is incompatible with relying on git-CI, Option A is now the only deploy mechanism (resolves the F26 A/B choice).**
- **Build-time `PUBLIC_SITE_URL` divergence (R4-F31, medium)** — the static `@astrojs/sitemap` origin is baked at `astro build` time from `process.env.PUBLIC_SITE_URL`; the PR-4 build MUST run with `PUBLIC_SITE_URL=prod`. Also confirmed bare `sitemap()` today means PR-4 introduces the options object for the first time.
- **Two-phase migration bookkeeping (R4-F30, medium)** — `apply-migrations.sh` records `schema_migrations` in a separate psql call; a between-phase crash leaves 015 applied-but-unrecorded. 015's idempotency makes a re-run harmless, with a post-apply `SELECT 1 FROM schema_migrations` check so the operator re-inserts the bookkeeping row.
- **PR-5's file-collection removal lacks a build-time CI gate (R4-F29, medium)** — removing `blogCollection` regenerates Astro content-collection types and PR-5 auto-deploys; made PR-5's gate a full `cd app && npm run build` + typecheck in CI plus an assertion that no component imports the blog file collection.
- **PR-1 auto-deploys shared-endpoint changes to all 13 collections (R4-F32, low)** — the origin check/`_raw`/`parseRedirectPath`/`action=delete` additions enter every existing admin save/delete. Added a regression assertion that an existing collection still saves AND deletes (incl. the header-absent fail-open case).
- **Origin-check correctness on the Netlify adapter unpinned (R4-F5, low)** — `new URL(request.url).origin` must resolve to the public origin or a same-origin admin save is falsely rejected. Added a PR-1 verification-deploy step; no security change (SameSite=Lax is the primary CSRF defense).

**Security test completeness (medium):**
- **Raw-inline-HTML XSS vectors added, asserted directly against `renderPostBody` (R4-F2, medium)** — marked passes raw inline HTML verbatim, so the realistic hostile input is raw HTML the owner pastes, not markdown-syntax vectors. DOMPurify is the sole barrier. Added the raw-HTML matrix and documented that the body trust boundary is arbitrary HTML.

**Findings where the suggested fix was adjusted (claim right, fix refined):**
- **R4-F1:** resolved via the R4-F6 cut (drop `id` + renderer ids), not the suggested `SANITIZE_NAMED_PROPS`/id-hook.
- **R4-F8/F9/F10:** reversals of earlier-round additions (R3-F11, R2-F5-content.ts, R3-F13) — the earlier rationale (hop-count / coverage-evidence / ISO helper) is outweighed by the unscoped cost.
- **R4-F19:** chose minimal `.blog-body` CSS over dropping the block-element tags, to keep the taught capability honest.
- **R4-F26:** pinned to `cd app && npx netlify deploy --prod` (Option A) rather than re-arming git-CI (Option B), because `stop_builds=true` is locked; git-CI re-arming is recorded only as the documented remediation branch.

**Deferred:** R4-F13 (featured-image thumbnail — high-value V2).

### Completeness pass (2026-06-05) — durable canonical artifact + three completeness gaps closed

This pass did not run a new stress review; it made the post-Round-4 plan **durable, internally consistent, and build-ready** by applying the Round 3 and Round 4 deltas (which previously lived only as changelog prose) into the section bodies, and writing the result to `docs/plans/blog-implementation-plan.md` — the single canonical build-run playbook (locked decisions + key constraints restated at the top in §0). The three completeness gaps closed:

1. **Canonical-artifact gap (critical):** the only committed plan content was either the wrong 8-phase TipTap/AI/ticker/RSS plan on `spec/blog-cms` (with its matching `docs/specs/blog-cms.md`), which violates every locked OUT decision, or changelog prose for Rounds 3–4. **Resolved:** the R3+R4 deltas are now applied into the §1–§16 bodies (not just listed in §17); the durable artifact is this file; the wrong `spec/blog-cms` plan/spec are declared superseded and that branch abandoned (header note); the lean `docs/specs/blog.md` is authored in PR-1 with its sanitizer block copied verbatim from §8.

2. **Deploy-mechanism gap (critical):** earlier drafts carried the false `netlify deploy --prod --dir=app/dist` / "from repo root" / "base=app discovery" mechanism (R4-F26 verified it uploads a static-only deploy that 404s every SSR route, taking down the launch). **Resolved:** every instance in §9, §13.7, §13.8, §14 Step-0, §15, and builder-verification 26 now reads `cd app && npx netlify deploy --prod` (no `--dir`); the `deploy.yml` patch (run the deploy step from `app/` without `--dir`) is a Step-0 hard blocker; the SSR-upload verification is a hard PR-4 prerequisite run through the actual workflow; the wrong CLAUDE.md/netlify.toml `base=app` claim is corrected (§13.7). (The repo's `.github/workflows/deploy.yml` already runs `cd app && npx netlify deploy --prod --auth=$NETLIFY_AUTH_TOKEN --site=$NETLIFY_SITE_ID` — verified, no `--dir`.)

3. **Sanitizer-config gap (high):** earlier §8 configs carried `id` in `ALLOWED_ATTR`, `#` in `ALLOWED_URI_REGEXP`, and heading-id generation — all cut by R4-F6 — while §13.2 directs that exact block be copied verbatim into the spec (which would reintroduce the author-controlled-id XSS/DOM-clobbering surface). **Resolved:** §8 reflects the post-R4 config (`ALLOWED_ATTR = ['href','src','alt','title']`, `ALLOWED_URI_REGEXP` without `#` or `http:`, renderer with only h1→h2 demotion + skip clamp + fresh-per-call `previousDepth`); the heading-anchor help copy and fragment-link vectors are removed; unit tests 3/4 expect ids stripped and `[anchor](#top)` stripped; the R4-F1 raw-id vector and R4-F2 raw-HTML matrix are added; §13.2 directs copying the corrected block.
