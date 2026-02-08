# Production Deployment Guide (Netlify + Neon)
*Last Updated: February 8, 2026*

This guide reflects the current scope only.

## Architecture
- Frontend + SSR: Astro
- Backend platform: Netlify
- Database: Neon via Netlify DB
- Admin auth: Netlify-compatible magic-link sessions

## In Scope
- Coming soon mode with admin bypass
- Admin modules for Hours, Staff, Tuition, Settings
- Donation and enrollment as external links from DB settings

## Out of Scope (Current Phase)
- Public blog features
- Newsletter features
- Stripe/payment flows

## Required Environment Variables
Set these in Netlify Site Settings -> Environment Variables.

- `NETLIFY_DATABASE_URL`: Neon/Postgres connection string
- `PUBLIC_SITE_URL`: Canonical site URL
- `COMING_SOON_MODE`: Optional override (`true`/`false`)
- `AUTH_PROVIDER`: set to `netlify-magic-link`

For admin login email delivery, configure one provider:
- `UNIONE_API_KEY` (+ optional `UNIONE_REGION`)
- or `RESEND_API_KEY`
- or `SENDGRID_API_KEY`
- or `POSTMARK_SERVER_TOKEN`

Optional sender identity:
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`

## Pre-Deploy Checklist
1. Confirm migration is applied in target DB:
   - `cd app && npm run db:migrate`
2. Confirm critical seed data is present:
   - `cd app && npm run db:seed`
   - `cd app && npm run test:db`
3. Confirm admin allow-list config is set:
   - `ADMIN_EMAILS` should be explicitly configured.
   - `ADMIN_DOMAINS` should be configured only if broad domain-based access is intentional.
4. Confirm coming soon behavior and bypass expectations for the target environment.
5. Run quality checks:
   - `cd app && npm run lint -- --max-warnings=0`
   - `cd app && npm run typecheck`
   - `cd app && npm run test -- --run`
   - `cd app && npm run build`
6. Run remote smoke checks against preview URL:
   - `cd app && E2E_BASE_URL=https://<preview-url> npm run test:smoke -- --project=chromium --workers=1`
   - `cd app && E2E_BASE_URL=https://<preview-url> npm run test:comprehensive -- --project=chromium --workers=1`
7. Confirm Netlify build configuration points to the app workspace:
   - Base directory should resolve to `app`
   - Build command should resolve to `npm run build`
   - Publish directory should resolve to `dist` (when base is `app`)

## Remote Security Spot Checks
Run these against preview URL before promoting to production:

```bash
curl -i https://<preview-url>/api/admin/settings
curl -i https://<preview-url>/api/admin/content
curl -i https://<preview-url>/api/test-email
curl -i https://<preview-url>/api/email/send
```

Expected:
- Admin routes should not be publicly accessible (401/403/redirect to auth).
- Test and email endpoints should require admin authentication.

Also verify redirect behavior:

```bash
curl -I https://<preview-url>/blog
curl -I https://<preview-url>/donate
curl -I https://<preview-url>/enrollment
```

Expected:
- Redirects should land on `/contact` (temporary behavior for current phase).

## Deploy Steps (Netlify)
1. Push changes to the deployment branch.
2. Trigger/observe Netlify build.
3. Verify runtime env vars are present in Netlify.
4. Validate production site behavior after deploy.

## Post-Deploy Verification
- Public routes render correctly.
- Coming soon mode behaves as expected.
- Admin bypass works only for authorized admins.
- Admin magic-link login sends and validates correctly.
- Admin pages load and save for Hours, Staff, Tuition, Settings.
- Donate and enrollment routes resolve via configured external links (or temporary `/contact` behavior if links are not configured yet).

## Rollback
If deployment fails validation:
1. Restore prior successful deploy in Netlify.
2. Confirm env vars/migration state.
3. Re-run checks and redeploy.
