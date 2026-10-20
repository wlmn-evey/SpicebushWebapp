# Spicebush Webapp (`app/`)

Astro frontend and Netlify runtime for the Spicebush Montessori site.

## Active Architecture
- Frontend + SSR: Astro
- Backend platform: Netlify
- Database: Neon via Netlify DB (`NETLIFY_DATABASE_URL`)
- Admin auth: Netlify-compatible magic-link sessions
- Transactional email: SendGrid (with Unione fallback during migration)
- Core admin modules: Hours, Staff, Tuition, Settings, Blog, Donations, Camp, Ticker
- Donations: on-site Stripe Checkout (`/donate`) with webhook + queued thank-you emails

## Current Product Scope
- Kept:
  - Coming soon mode + admin bypass
  - Hours widget and backend management
  - Staff and tuition management
  - DB-backed blog (`/blog`, `/blog/[slug]`) authored in `/admin/blog` (TipTap editor, ADR-009/011)
- Removed/deferred:
  - On-site mailing list capture / newsletter

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
npm run test:email
```

## Documentation
- Canonical project docs: `../docs/`
- Product requirements: `../docs/PRD.md`
- High-level roadmap: `../docs/roadmap.md`
