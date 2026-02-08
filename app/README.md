# Spicebush Webapp (`app/`)

Astro frontend and Netlify runtime for the Spicebush Montessori site.

## Active Architecture
- Frontend + SSR: Astro
- Backend platform: Netlify
- Database: Neon via Netlify DB (`NETLIFY_DATABASE_URL`)
- Admin auth: Netlify-compatible magic-link sessions
- Core admin modules: Hours, Staff, Tuition, Settings

## Current Product Scope
- Kept:
  - Coming soon mode + admin bypass
  - Hours widget and backend management
  - Staff and tuition management
- Removed/deferred:
  - Blog UI (redirect behavior retained where configured)
  - On-site mailing list capture
  - Stripe/payments

## Local Development
From repository root:

```bash
npm run dev
```

From `app/` only:

```bash
npm run dev
npm run build
npm run lint -- --max-warnings=0
npm run typecheck
npm run test
npm run test:e2e
```

## Documentation
- Canonical project docs: `../docs/`
- Primary plan: `../docs/refactor-master-plan.md`
- High-level roadmap: `../docs/roadmap.md`
