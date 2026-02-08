# Dependency Map

## Runtime Dependencies
- `astro`
- `@astrojs/netlify`
- `@astrojs/react`
- `@astrojs/tailwind`
- `@astrojs/sitemap`
- `react`, `react-dom`
- `pg`
- `sharp`

## Tooling Dependencies
- `typescript`
- `eslint` + `@typescript-eslint/*` + `eslint-plugin-astro`
- `prettier` + `prettier-plugin-astro`
- `vitest` + `jsdom`
- `@playwright/test`
- `netlify-cli`

## Critical Coupling Points
- DB access layer: `app/src/lib/db/*` plus migration scripts in `app/scripts/`.
- Admin routes: `app/src/pages/admin/*` and `app/src/pages/api/admin/*`.
- Coming soon mode and bypass: middleware + settings APIs.
- Hours widget behavior: `app/src/components/HoursWidget.astro` and related settings/content records.

## Update Workflow
1. Update dependency versions in `app/package.json`.
2. Run `cd app && npm install`.
3. Validate with:
   - `npm run lint -- --max-warnings=0`
   - `npm run typecheck`
   - `npm run test -- --run`
4. For runtime-impacting updates, also run `npm run test:e2e`.

## Rules
- Keep auth/database dependencies aligned with Netlify + Neon architecture.
- Avoid reintroducing removed feature dependencies for payments, public blog, or mailing-list capture.
