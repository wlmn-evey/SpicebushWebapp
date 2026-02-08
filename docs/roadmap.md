# Spicebush Project Roadmap
*Last Updated: February 8, 2026*

This is the high-level sequence for delivery. Detailed tasks live in `docs/refactor-master-plan.md`.

## Current Runtime Direction
- Platform: Netlify
- Database: Neon through Netlify DB
- Auth: Netlify-compatible magic-link admin sessions
- Core admin modules: Hours, Staff, Tuition, Settings

## Phase 1: Stabilize and Simplify (In Progress)
- Keep and harden essential features:
  - Hours widget + hours management backend
  - Staff management
  - Tuition calculator + tuition management
  - Coming soon mode with admin bypass toggle
- Remove/defer non-essential features:
  - Blog UI (redirect remains in place)
  - Newsletter
  - Stripe/payments
- Finish codebase hygiene:
  - Type safety and lint quality gates
  - Documentation consolidation
  - Archive stale implementation plans

## Phase 2: Admin and Operations Hardening
- Finalize admin auth rollout in all environments
- Verify migration + email delivery for login links
- Complete DB-backed external links for donate/enrollment
- Improve admin UX for core modules (Hours/Staff/Tuition/Settings)
- Add/expand automated test coverage for admin and API paths

## Phase 3: Controlled Feature Reintroduction (Deferred)
- Media management refactor after admin media UI exists
- Optional reintroduction candidates:
  - Blog
  - Newsletter
  - Payments
- Reintroduced features must pass security + maintainability gates before launch

## Quality Gates
- `cd app && npm run lint -- --max-warnings=0`
- `cd app && npm run typecheck`
- `cd app && npm run test`
- `cd app && npm run test:e2e`
