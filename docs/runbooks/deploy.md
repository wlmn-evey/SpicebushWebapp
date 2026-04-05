# Production Deployment Runbook

*Spicebush Montessori -- Astro 5 SSR on Netlify + Neon PostgreSQL*

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

### 2b. Admin Allow-List Config

1. Confirm `ADMIN_EMAILS` is set in Netlify environment variables.
2. Confirm `ADMIN_DOMAINS` is set only if broad domain-based access is intentional.

### 2c. Coming-Soon Behavior

1. Confirm `COMING_SOON_MODE` env var matches the intended state for this deploy (`true`, `false`, or unset for DB-driven).
2. Verify admin bypass expectations (admins should see all pages regardless of coming-soon state).

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

### Option A: Push to Deployment Branch

```bash
git push origin <branch>:main
```

Netlify will detect the push and trigger a build automatically.

### Option B: CLI Deploy from Repo Root

**CRITICAL: Run from the repository root, NOT from `app/`.** The `netlify.toml` has `base=app`, so deploying from `app/` causes path doubling.

```bash
# From repo root
npx netlify deploy --prod --dir=app/dist
```

### Preflight Script (Optional)

```bash
cd app && NETLIFY_SITE_ID=<site-id> npm run predeploy:production
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

| Setting           | Value          |
|-------------------|----------------|
| Base directory    | `app`          |
| Build command     | `npm run build`|
| Publish directory | `dist`         |
| Node version      | `20`           |

Environment variables required in Netlify:

- `NETLIFY_DATABASE_URL` -- Neon PostgreSQL connection string
- `PUBLIC_SITE_URL` -- canonical site URL (e.g., `https://spicebushmontessori.org`)
- `AUTH_PROVIDER` -- set to `netlify-magic-link`
- `ADMIN_EMAILS` -- comma-separated list of allowed admin emails
- `ADMIN_DOMAINS` -- (optional) domain-based admin access
- `COMING_SOON_MODE` -- (optional) override for coming-soon gate
- One email provider key: `UNIONE_API_KEY`, `RESEND_API_KEY`, `SENDGRID_API_KEY`, or `POSTMARK_SERVER_TOKEN`
