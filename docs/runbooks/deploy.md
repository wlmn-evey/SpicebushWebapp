# Production Deployment Runbook

_Spicebush Montessori -- Astro 5 SSR on Netlify + Neon PostgreSQL_

---

## 1. Prerequisites

Before starting, confirm:

- [ ] You have `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` available
- [ ] You are on the correct branch and all changes are committed
- [ ] Node 20+ is installed locally
- [ ] Working directory is the repo root (`SpicebushWebapp/`)

---

## 2. Pre-Deploy Checklist

### 2a. Migration Parity Check

```bash
cd app && NETLIFY_SITE_ID=<site-id> npm run db:check:migrations:netlify -- production
```

- If the check **passes**: continue to step 2b.
- If **pending migrations** exist: apply them, then verify.

```bash
cd app && NETLIFY_SITE_ID=<site-id> npm run db:seed:netlify -- production
cd app && npm run test:db
```

> **Blog content is NOT seeded.** `'blog'` was removed from `CONTENT_COLLECTIONS` in `app/scripts/insert-critical-data.js`, so neither `db:seed` nor `db:seed:netlify` creates, updates, or touches any `type='blog'` rows. Blog content is owned by the DB / admin panel and imported once via migration 015 (see § 2d). Re-running seed after migration 015 will not re-introduce the date-prefixed seed duplicates that 015 removed.

### 2b. Admin Allow-List Config

1. Confirm `ADMIN_EMAILS` is set in Netlify environment variables.
2. Confirm `ADMIN_DOMAINS` is set only if broad domain-based access is intentional.

### 2c. Coming-Soon Behavior

1. Confirm `COMING_SOON_MODE` env var matches the intended state for this deploy (`true`, `false`, or unset for DB-driven).
2. Verify admin bypass expectations (admins should see all pages regardless of coming-soon state).

### 2d. Migration 015 — legacy blog import (one-time, manual, rollout-only)

Migration 015 (`app/db/migrations/015_import_legacy_blog_posts.sql`) imports the 6 legacy blog posts into the `content` table. It is a **one-time data migration**, applied **manually via `npm run db:migrate` at rollout** — it is **NOT** part of the deploy path and is **NOT** run by CI. The build authors the file; the operator applies it once, supervised. Skip this subsection on routine deploys after the blog is live.

**015 reconciles, then imports:** it first deletes the 6 seed-created date-prefixed rows (`author_email='seed@spicebushmontessori.org'`, slugs matching `^\d{4}-\d{2}-\d{2}-`), then inserts the 6 posts under clean slugs with `author_email = NULL` (the rollback discriminator). The inserts use `ON CONFLICT (type, slug) DO NOTHING`, so they never clobber an owner-edited or owner-created row that already occupies a clean slug.

#### Step 1 — Applies 014 + 015 together (review 014 first)

Production `schema_migrations` tops out at **013**; `014_retention_cleanup.sql` is on disk but **unapplied**. The runner (`apply-migrations.sh`) applies pending migrations in filename order, so a `db:migrate` run will apply **014 then 015** in sequence.

> **The operator MUST review `app/db/migrations/014_retention_cleanup.sql` before applying.** It deletes auth tokens and sessions expired for more than 30 days, and analytics events older than 12 months. Confirm this cleanup is acceptable on production before proceeding.

#### Step 2 — Mandatory pre-flight re-audit (immediately before applying 015)

The Step-0 content audit can be days stale by rollout, so re-run it right before applying. Against the production DB:

```sql
SELECT type, slug, status, author_email, created_at, updated_at,
       data ? 'featured_image' AS has_featured_image,
       data ? 'image' AS has_image,
       length(data->>'body') AS body_len
  FROM content WHERE type IN ('blog','cms_blog') ORDER BY slug;
```

**STOP and reconcile manually** if either is true:

- Any `type='blog'` row no longer matches the seed shape (the expected state is **6 rows**, all `author_email='seed@spicebushmontessori.org'`, all date-prefixed slugs); OR
- Any **clean-slug** `type='blog'` row exists (an owner-created row matching one of the six clean slugs would be silently skipped by `ON CONFLICT DO NOTHING`, leaving a stale body). Reconcile that row's body against the markdown source before applying.

#### Step 3 — PR-2 edit-window remediation

Once the `/admin/blog` authoring page (PR-2) is live, the owner/tester can see the 6 seed rows with date-prefixed slugs. **A single admin edit sets `author_email` to the admin's session email**, which removes that row from 015's `DELETE` predicate — the clean-slug `INSERT` then lands alongside the edited row (7 rows, one duplicate). The PR-2 freeze note ("do not edit or delete the legacy seed rows until the PR-3 import is verified") is intended to prevent this. If it happened anyway:

- Compare the edited date-prefixed row against its markdown source.
- Confirm the clean-slug imported row supersedes it (carry over any divergent admin edits into the clean-slug row).
- Delete the date-prefixed row manually.

#### Step 4 — Execution

From `app/`:

```bash
NETLIFY_DATABASE_URL="$(npx netlify env:get NETLIFY_DATABASE_URL --context production)" npm run db:migrate
```

`--context production` is **MANDATORY** — `env:get` defaults to the dev context, and this site carries context-divergent values.

#### Step 5 — Confirm the target host

`apply-migrations.sh` now prints `Target DB host: <host>` before applying. **The operator MUST confirm it is the Neon production pooler host** before letting the run proceed.

#### Step 6 — Post-apply bookkeeping check

The version-recording `INSERT` is a separate `psql` call from the apply (non-atomic), so a between-phase crash can leave 015 applied-but-unrecorded. After applying:

```sql
SELECT 1 FROM schema_migrations WHERE version='015_import_legacy_blog_posts.sql';
```

If it returns no row but the import is present, **re-insert the bookkeeping row** rather than re-running blindly:

```sql
INSERT INTO schema_migrations (version) VALUES ('015_import_legacy_blog_posts.sql');
```

(015 is idempotent — a blind re-run is harmless — but re-inserting the bookkeeping row is the clean fix.)

#### Step 7 — Import verification

Against the production DB after applying:

```sql
SELECT count(*) FROM content WHERE type='blog';                                   -- expect exactly 6
SELECT count(*) FROM content WHERE type='blog'
  AND author_email='seed@spicebushmontessori.org';                               -- expect 0
SELECT slug, status, data->>'date', created_at, author_email FROM content
  WHERE type='blog' ORDER BY data->>'date' DESC, slug DESC;                       -- clean slugs, NULL author_email
SELECT slug, length(data->>'body') FROM content WHERE type='blog';               -- all bodies non-trivial
SELECT slug, data->>'image' FROM content WHERE type='blog';                      -- all 6 set; each resolves to a file in app/public
```

Then re-run `npm run db:seed` against a **scratch** DB and confirm **zero** `type='blog'` rows are created or modified (blog was removed from `CONTENT_COLLECTIONS`). Finally, verify the 6 posts render in `/admin/blog`.

#### Step 8 — Rollback

```sql
DELETE FROM content WHERE type='blog'
  AND slug IN ('nurturing-growth-gardening-program','exploring-summer-camp',
               'embracing-neurodiversity-adhd','embracing-holistic-development',
               'exploring-universe-within-cosmic-curriculum','welcome-to-our-new-blog')
  AND author_email IS NULL;
```

**Caveats:**

- The `author_email IS NULL` guard ensures owner-edited posts (whose `author_email` is the admin's email) are **never** deleted.
- Rollback does **not** resurrect the seed rows 015 deleted — the markdown source remains in git, so a re-apply re-imports cleanly.
- Fixes ship as a corrected **016**, never by editing an already-applied 015.

---

## 3. Quality Gates

Run all four checks from `app/`. All must pass before deploying.

```bash
# Lint (zero warnings allowed)
cd app && npm run lint -- --max-warnings=0

# TypeScript type checking
cd app && npm run typecheck

# Unit/integration tests
cd app && npm run test -- --run

# Production build
cd app && npm run build
```

If any gate fails, fix the issue and re-run from the beginning of this section.

---

## 4. Remote Smoke Checks

Deploy a preview first, then run tests against the preview URL.

### 4a. Smoke Tests

```bash
cd app && E2E_BASE_URL=https://<preview-url> npm run test:smoke -- --project=chromium --workers=1
```

### 4b. Comprehensive Tests

```bash
cd app && E2E_BASE_URL=https://<preview-url> npm run test:comprehensive -- --project=chromium --workers=1
```

---

## 5. Security Spot Checks

Run these against the preview URL before promoting to production.

### 5a. Admin Route Protection

All admin routes must return 401, 403, or redirect to auth when accessed without a session.

```bash
curl -i https://<preview-url>/api/admin/settings
curl -i https://<preview-url>/api/admin/content
curl -i https://<preview-url>/api/test-email
curl -i https://<preview-url>/api/email/send
```

### 5b. Redirect Behavior

These routes should redirect to `/contact` (current-phase temporary behavior).

```bash
curl -I https://<preview-url>/blog
curl -I https://<preview-url>/donate
curl -I https://<preview-url>/enrollment
```

---

## 6. Deploy

### Automatic (CI/CD — standard path)

Merging a PR to `main` triggers the `deploy.yml` GitHub Actions workflow, which:

1. Builds the app (`cd app && npm run build`)
2. Deploys to Netlify via CLI (`npx netlify deploy --prod --dir=app/dist`)

No Netlify git integration is used — GitHub Actions owns the build and deploy pipeline.

> **Verified:** the repo-root `npx netlify deploy --prod --dir=app/dist` empirically uploads the SSR function and prod serves SSR (probed 2026-06-06: `/contact` → 200, `/admin` → 302). The workflow is correct as-is — no deploy-command patch and no SSR-function-upload verification-deploy gate are needed.

**Required GitHub secrets:**

- `NETLIFY_SITE_ID` — Netlify site UUID
- `NETLIFY_AUTH_TOKEN` — Netlify personal access token

### Manual CLI Deploy (emergency or ad-hoc)

**CRITICAL: Run from the repository root, NOT from `app/`.** Deploying from the repo root with `--dir=app/dist` is the working, current path; the committed `netlify.toml` has **no `base` key** (`[build] command="npm run build"`, `publish="dist"`).

```bash
# Build first
cd app && npm run build

# Deploy from repo root
cd .. && npx netlify deploy --prod --dir=app/dist
```

---

## 7. Post-Deploy Verification

Complete each item against the live production URL.

- [ ] **Public routes** render correctly (home, about, contact, camp pages)
- [ ] **Coming-soon mode** behaves as expected for the current configuration
- [ ] **Admin bypass** works -- admins can access gated pages in coming-soon or camp-prep mode
- [ ] **Magic-link login** -- request a login link, receive the email, follow the link, confirm session is established
- [ ] **Admin pages** load and save correctly (Hours, Staff, Tuition, Settings, Camp, Announcements, etc.)
- [ ] **Donate/enrollment routes** resolve correctly (external links from DB settings, or `/contact` fallback)
- [ ] **Camp mode** -- if active, `/camp` renders; if inactive, non-admins are redirected to `/camp-coming-soon`

---

## 8. Netlify Build Configuration Reference

These settings must match in the Netlify dashboard (Site Settings > Build & Deploy):

| Setting           | Value           |
| ----------------- | --------------- |
| Base directory    | `app`           |
| Build command     | `npm run build` |
| Publish directory | `dist`          |
| Node version      | `20`            |

Environment variables required in Netlify:

- `NETLIFY_DATABASE_URL` -- Neon PostgreSQL connection string
- `PUBLIC_SITE_URL` -- canonical site URL (e.g., `https://spicebushmontessori.org`)
- `AUTH_PROVIDER` -- set to `netlify-magic-link`
- `ADMIN_EMAILS` -- comma-separated list of allowed admin emails
- `ADMIN_DOMAINS` -- (optional) domain-based admin access
- `COMING_SOON_MODE` -- (optional) override for coming-soon gate
- One email provider key: `UNIONE_API_KEY`, `RESEND_API_KEY`, `SENDGRID_API_KEY`, or `POSTMARK_SERVER_TOKEN`

---

## 9. Blog V1 Launch (rollout boundary — supervised, performed at launch)

The blog code, pages, sitemap, SEO meta, and tests ship in PR-4, but the public switch is
flipped only at the supervised launch. The PR build does **not** execute any of the steps in
§9.1. Apply migrations 014 + 015 (the migration procedure and seed defusal are in §2 above)
**before** the launch deploy so the 6 clean-slug rows exist when `/blog` goes live.

### 9.1 Rollout-boundary actions (NOT performed by the build — execute supervised at launch)

1. **Set the canonical origin (build-env requirement, R4-F31).** The static `@astrojs/sitemap`
   origin and per-post canonical/OG origins are baked from `PUBLIC_SITE_URL` at `astro build`
   time. The production build **must** run with `PUBLIC_SITE_URL=https://spicebushmontessori.org`:
   ```bash
   npx netlify env:set PUBLIC_SITE_URL https://spicebushmontessori.org
   ```
   (all contexts; currently the production context is `https://spicebush-testing.netlify.app`,
   which is the confirmed canonicals bug.)
2. **Neutralize the competing git-CI deploy path.** The Netlify production branch is `testing`
   (a live competing deploy path). Set `stop_builds=true` so the authoritative `deploy.yml`
   (repo-root `npx netlify deploy --prod --dir=app/dist`) is the only deploy path:
   ```
   build_settings.stop_builds = true
   ```
   The existing `deploy.yml` is the working, authoritative deploy mechanism — do **not** add a
   deploy-command patch or an SSR-function-upload verification-deploy gate.
3. **Apply migrations 014 + 015** to prod (review 014 first — prod `schema_migrations` tops out
   at 013; 014 is on disk but unapplied). Run the mandatory pre-flight re-audit (§2) immediately
   before applying.
4. Deploy via `deploy.yml`, then run §9.2 and the manual E2E gate (§9.3).

### 9.2 Launch-verification curl checklist (against `https://spicebushmontessori.org`)

```bash
SITE=https://spicebushmontessori.org

# Status matrix
curl -sI "$SITE/blog"                                            # 200
curl -sI "$SITE/blog/nurturing-growth-gardening-program"        # 200 (repeat for each clean slug)
curl -sI "$SITE/blog/2024-05-20-nurturing-growth-gardening-program"  # 301 → /blog/<clean>
curl -sI "$SITE/blog/2024-01-01-nonexistent"                    # 404 (date-prefixed miss, NOT a redirect)
curl -sI "$SITE/resources/blog"                                 # 301 → /blog
curl -sI "$SITE/resources/blog/nurturing-growth-gardening-program"  # 301 → /blog/<slug>
curl -sI "$SITE/blog/this-does-not-exist"                       # 404 (branded)

# Per-post SEO meta (prod origin; twitter:image = the post's featured image, NOT the default logo)
curl -s "$SITE/blog/nurturing-growth-gardening-program" \
  | grep -E 'rel="canonical"|og:url|og:image|twitter:image|og:image:alt|twitter:image:alt|article:published_time|name="robots"'
#   - canonical / og:url / og:image start with https://spicebushmontessori.org
#   - twitter:image contains /images/blog/feature-image-wf-flame-lily-1.webp (NOT SpicebushLogo)
#   - twitter:image:alt present; og:image:alt present; article:published_time is ISO
#   - robots = "index, follow"; no <meta name="googlebot" ... noindex> (also check /blog)
curl -s "$SITE/blog" | grep -E 'name="robots"|googlebot'        # index,follow; no googlebot-noindex

# Robots three-state — Layout now emits index / soft noindex,follow / hard noindex,nofollow via
# resolveSeoMetadata.googlebotContent (PR1b). Both meta tags always agree.
#   • Indexable (blog list/post, marketing pages): robots="index, follow", NO googlebot tag.
#   • Soft thin/dup routes — paginated pages (?/page/N), tag filters, below-threshold categories
#     (added in PR2): robots="noindex, follow" AND googlebot="noindex, follow".
#   • Hard noindex (site-wide kill switch or a per-page DB override): both tags "noindex, nofollow".
# INVERSE spot-check — a known hard-noindex NON-blog page must STILL be hard noindex after the
# refactor (proves googlebotContent didn't weaken hard noindex anywhere site-wide).
# PRECONDITION: this proves something only if the target is genuinely hard-noindex in prod RIGHT NOW.
# /contact-success was verified hard-noindex (both tags "noindex, nofollow") at PR1b time, but that
# rests on a per-page override row in the prod SEO config (set in /admin/seo), NOT on committed code —
# so confirm the row still exists, OR substitute any page you know carries a saved hard-noindex
# override. Note `grep` prints nothing AND exits 0 on a miss, so empty output ≠ pass: you must SEE
# both "noindex, nofollow" lines. If the page now renders "index, follow", the override was removed —
# that's a config drift, not a refactor regression.
curl -s "$SITE/contact-success" | grep -E 'name="robots"|googlebot'  # BOTH "noindex, nofollow"

# PR2 discovery routes (status + robots + self-canonical). Slugs below are REAL live-corpus values
# (categories: Education×3, Philosophy/Programs/Nature×2 = indexable; Values/Inclusion/News×1 = soft;
# tags are ALWAYS soft). taxonomySlug lowercases + hyphenates, so the URL is the canonical slug.
curl -sI "$SITE/blog/category/education"                         # 200 (indexable, ≥2 members)
curl -s  "$SITE/blog/category/education" | grep -E 'name="robots"|googlebot|rel="canonical"'
#   → robots="index, follow", NO googlebot tag, canonical = $SITE/blog/category/education (SELF, not /blog)
curl -s  "$SITE/blog/category/values"   | grep -E 'name="robots"|googlebot'  # BOTH "noindex, follow" (1 member → soft)
curl -s  "$SITE/blog/tag/inclusion"     | grep -E 'name="robots"|googlebot'  # BOTH "noindex, follow" (tags always soft)
curl -sI "$SITE/blog/category/Education"                         # 404 (capital → non-canonical param, no dup content)
curl -sI "$SITE/blog/page/1"                                     # 301 → /blog (page 1 is the index)
curl -sI "$SITE/blog/page/9"                                     # 404 (out of range on the 1-page corpus)
curl -sI "$SITE/blog/page/abc"                                   # 404 (non-integer param)

# Sitemap + robots (prod origin, exact slashless <loc>, draft-free)
curl -s "$SITE/sitemap-blog.xml"                                # 200, XML; <loc>$SITE/blog</loc> and <loc>$SITE/blog/<slug></loc>; ≥6 posts; no drafts
curl -s "$SITE/robots.txt" | grep sitemap-blog                  # Sitemap: $SITE/sitemap-blog.xml

# Static sitemap must EXCLUDE blog / resources-blog / admin / auth
curl -s "$SITE/sitemap-0.xml" | grep -E '/blog|/resources/blog|/admin|/auth'   # expect NO matches
```

### 9.3 Manual E2E gate (CI runs no Playwright — R4-F23)

E2E green is a **recorded manual step with attached artifacts** (json/html report), not a CI gate.
Coverage is likewise a recorded manual `npm run test:coverage` step with a json-summary artifact.

- **Pinned gate command:** `npx playwright test e2e/blog.spec.ts --project=chromium`
  (the repo has 7 projects, `fullyParallel: true`, no `webServer`; an unpinned run executes the
  authoring flow 7× against the single DB).
- **`E2E_ADMIN_SESSION` secret lifecycle:** provision a fresh admin session cookie immediately
  before the run; **NEVER record the cookie value** in the PR, issues, or any committed file
  (use `read -s` / an env file outside the repo); revoke it after the run (or accept the 12h-TTL
  expiry). The origin check is exercised by unit tests, not this flow.
- **`e2e-flow-%` orphan-sweep pre-step:** the authoring flow sweeps leftover `e2e-flow-%` drafts
  before creating its own; keep that pre-step so an interrupted prior run cannot strand rows.
- **Draft-only pre-merge / publish-only post-deploy (R4-F24):** in the pre-merge/build context the
  authoring flow creates a DRAFT only — the publish→200 transition is asserted ONLY in the
  post-deploy run (set `E2E_POST_DEPLOY=1` and point `E2E_BASE_URL` at prod). A crash between
  publish and cleanup must not strand a public published row pre-merge.
- **Baseline honesty at PR creation (R1-F45):** record the current `npm run test:e2e` pass/fail
  counts in the PR description; if the suite is red at baseline, scope the PR-4 E2E gate to the
  named green set (`blog.spec.ts` + the a11y additions) and file a GitHub issue tracking the
  pre-existing failures, linked from the PR (track, do not fix here). The baseline cannot be taken
  during the build (the default Playwright config targets the live `testing` site — a rollout-only
  surface per §9.1); take it at PR creation against that recorded gate.
- **Search Console:** submit `sitemap-blog.xml` after launch (recovery for the unwound 301s).
