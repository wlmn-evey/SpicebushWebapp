# Dependency Map

## Runtime Dependencies
- `astro`
- `@astrojs/netlify`
- `@astrojs/react`
- `@astrojs/sitemap`
- `react`, `react-dom`
- `pg`
- `sharp`
- TipTap 3 (`@tiptap/*`), `marked`, `isomorphic-dompurify`, `jose`, `nanoid`, `csv-parse`, `lucide-astro`

## Tooling Dependencies
These live in `devDependencies`: nothing in `src/` or `netlify/functions/` imports them at runtime.
- `typescript`, `@types/pg`
- `eslint` 10 (flat config, `app/eslint.config.js`) + `typescript-eslint` + `eslint-plugin-astro` 3 + `eslint-plugin-jsx-a11y-x`
  - `eslint-plugin-jsx-a11y-x` (es-tooling fork) replaces `eslint-plugin-jsx-a11y`, whose peer range stops at ESLint 9; `eslint-plugin-astro`'s `jsx-a11y-recommended` config accepts either.
  - `eslint-plugin-astro` 3 / `astro-eslint-parser` 3 declare Node `^22.22.3 || ^24.16.0`. Older Node 22 releases still run them but npm prints EBADENGINE warnings; CI uses the latest Node 22.
- `prettier` + `prettier-plugin-astro` (held at 0.14.x: 1.x reformats ~65 `.astro` files, do that as its own formatting-only PR)
- `vitest` 5 + `@vitest/coverage-v8` + `@vitest/ui` (keep all three on the same exact version; vitest pins its peers exactly) + `jsdom` / `happy-dom`
- `@astrojs/check` (for `npm run typecheck`)
  - `@emnapi/runtime` is listed explicitly: it is a required peer of `@napi-rs/wasm-runtime` (via `@astrojs/language-server`), but npm marks it optional because `sharp`'s wasm build also pulls it, and then skips installing it — `astro check` fails with "Cannot find package '@emnapi/runtime'" without it.
- `@playwright/test` + `@axe-core/playwright`
- `netlify-cli` is **not** installed. Use `npx netlify-cli@27 <command>` (the deploy/env scripts in `app/scripts/` already do). Installing it locally pulled in most of the `npm audit` high/critical findings (issue #43).
- `tailwindcss` 3 + `postcss` + `autoprefixer` (build-time CSS; see `postcss.config.mjs`)
- `@netlify/functions` (type-only `Handler` import in `netlify/functions/*`)

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

## Security audit gate

The Security workflow blocks on high/critical advisories in production dependencies (`npm audit --omit=dev`) via `app/scripts/audit-gate.mjs`. An advisory can be tolerated only through `app/audit-allowlist.json`, and only if:

- no patched release exists (if one does, upgrade, or pin the nested copy with `overrides` — e.g. `ipx`'s `sharp` is forced to the root `sharp` 0.35.5), and
- the package is verified absent from the deployed SSR function (`app/.netlify/v1/functions/ssr` after `npm run build`).

Every entry has a reason and an `expires` date (~90 days). Once it expires the gate fails until someone re-checks upstream and either removes the entry or extends it. Entries that no longer match anything show as warnings; delete them.

As of 2026-10-20 the allowlist holds `braces` (GHSA-vfj7-8cjw-p6xm) and `node-forge` (GHSA-86w9-cpqp-85rv). Both reach production deps only through `@astrojs/netlify`'s local dev-server tooling (`@netlify/vite-plugin` → `@netlify/dev`).
