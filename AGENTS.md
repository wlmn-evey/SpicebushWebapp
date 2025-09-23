# Repository Guidelines

## Project Structure & Module Organization
- app/: Astro app (core site). Key paths: `app/src/pages/`, `app/src/components/`, `app/src/lib/`, `app/tests/`.
- scripts/: Strapi and deployment helpers (e.g., `scripts/netlify-build.sh`).
- src/: Legacy/shared services. Note: Strapi code moved under `deprecated/strapi/`.
- docs/, journal/, debug/: Operational notes and reports.

## Build, Test, and Development Commands
- Dev (Netlify, root): `npm run dev` — runs local Netlify dev with functions/proxy.
- Dev (Astro app): `cd app && npm run dev` — fast local app server.
- Build: `cd app && npm run build` — outputs to `app/dist/`.
- Lint/Format: `cd app && npm run lint && npm run format:check`.
- Unit/Integration: `cd app && npm run test` or `npm run test:coverage`.
- E2E (Playwright): `cd app && npm run test:e2e` (add `--ui` for runner).
- Deploy (Netlify): root `npm run deploy`, or `cd app && npm run deploy:staging`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; TypeScript preferred in app/.
- Linting/Formatting: ESLint + Prettier (`app/.eslintrc.json`, `.prettierrc`).
- Components: PascalCase in `app/src/components` (e.g., `Button.tsx`).
- Pages: kebab-case route files in `app/src/pages` (e.g., `tuition-policy.astro`).
- Utilities: camelCase in `app/src/lib` or `app/src/utils`.

## Testing Guidelines
- Frameworks: Vitest (unit/integration under `app/src/test/`) and Playwright (E2E under `app/e2e/` or `app/tests/`).
- Naming: `*.test.ts` or `*.spec.ts`. Keep tests close to code or under `app/src/test`.
- Run locally: `cd app && npm run test && npm run test:e2e`.
- Aim for meaningful coverage; add tests with new/changed logic and routes.

## Commit & Pull Request Guidelines
- Commits: Conventional prefix + scope when helpful, e.g. `feat(auth): add magic link flow`, `fix(netlify): correct build dir`. Existing patterns include `feat:`, `fix:`, `docs:`, `debug:` and bracketed tags like `[BUILD-FIX]`.
- PRs: Clear description, linked issues, screenshots for UI, and a summary of test results. Include Netlify preview link if applicable.

## Security & Configuration Tips
- Do not commit secrets. Use `app/.env.local` (copy from `app/.env.example`) and Netlify environment variables.
- Validate env before running: `cd app && npm run setup:dev` then update values.
- External CMS: Historical Strapi helpers now in `deprecated/strapi/`; keep any future API URLs configurable via env.
