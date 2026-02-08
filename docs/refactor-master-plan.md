# Refactor Master Plan (Netlify + Neon)
*Last Updated: February 8, 2026*

## Objective
Stabilize and simplify the codebase so it is easy to maintain and extend, while preserving the core business features:
- Hours widget and hours backend management
- Staff/teacher management
- Tuition calculator and tuition data management
- Coming soon mode with admin bypass

## Source of Truth
This is the canonical planning document for active refactor work.

## Current Architecture Decisions
- Backend platform: Netlify
- Database: Neon via Netlify DB (`NETLIFY_DATABASE_URL`)
- Admin auth: Netlify-compatible DB-backed magic links + hashed sessions
- Admin surfaces: `Hours`, `Staff`, `Tuition`, `Settings`

## Active Product Scope
- Keep:
  - Coming soon page + toggle mode
  - Admin bypass for coming soon mode (cookie-based preview)
  - Donation and enrollment as external-link placeholders from settings
- Remove for now:
  - Stripe payment flows
  - Newsletter functionality
  - Blog UI/features (redirect to contact retained where configured)

## Completed Foundation Work
- Unified DB runtime around Postgres pool client (`app/src/lib/db/client.ts`)
- Migrated core admin/CMS APIs to SQL-backed access
- Replaced Clerk runtime auth with Netlify-compatible magic-link session flow
- Added admin auth schema migration:
  - `app/supabase/migrations/20260208_netlify_admin_auth.sql`
- Documentation cleanup in progress (planning docs consolidated into this file)
- Baseline quality checks currently clean:
  - `cd app && npm run lint -- --max-warnings=0`
  - `cd app && npm run typecheck`

## Open Refactor Backlog
1. Apply migration `app/supabase/migrations/20260208_netlify_admin_auth.sql` in all environments.
2. Ensure production email delivery is configured for admin login links.
3. Replace temporary `/donate -> /contact` redirect with DB-configured `donation_external_link`.
4. Replace temporary `/enrollment -> /contact` redirect with DB-configured `enrollment_external_link`.
5. Keep media pipeline as-is, then refactor media endpoints when admin media UI exists:
   - `app/src/pages/api/media/upload.ts`
   - `app/src/pages/api/cms/media.ts`
6. Decide whether to keep built-in magic-link auth long-term or migrate to Netlify Auth0 extension later.
7. Remove remaining newsletter-specific data/settings references that are no longer in active scope.

## Deferred (Explicitly Out of Scope for Current Refactor)
- Blog re-introduction (content should remain stored; public blog UI remains removed/redirected)
- Stripe/payment re-introduction
- Newsletter re-introduction

## Documentation Hygiene
- Historical plans and one-off notes that conflict with current scope should be removed.
- Incident/debug notes should be stored in `docs/incidents/`.
- `docs/roadmap.md` should remain high-level; this file owns execution details.
