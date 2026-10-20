# CLAUDE.md

Spicebush Montessori School website — Astro 7 SSR on Netlify, Neon PostgreSQL, magic-link admin auth.
Live: https://spicebushmontessori.org

## Commands

All commands run from `app/` unless noted.

```bash
npm run dev                     # Astro dev server
npm run build                   # Produces app/dist/
npm run lint                    # ESLint (TS + Astro)
npm run lint:fix                # Auto-fix
npm run format:check            # Prettier check
npm run format                  # Prettier write
npm run test                    # Vitest
npm run test:e2e                # Playwright E2E
npm run test:smoke              # Quick smoke tests
npm run db:migrate              # Apply migrations
npm run db:seed                 # Seed critical data

# Deploy from REPO ROOT, not app/
npx netlify-cli@27 deploy --prod --dir=app/dist   # netlify-cli is not an app dependency; npx fetches the pinned major
```

## Workflow Rules

- **Lint and typecheck after every change, before committing.** `npm run lint -- --max-warnings=0 && npm run typecheck`
- **Use worktrees for non-trivial changes.** Main branch stays clean.
- **No direct merges to main.** Every change goes through a pull request.
- **All issues go into GitHub Issues.** No local bug files, no inline tracking. If it's worth doing, it's worth tracking.
- **Every PR must update affected docs.** If behavior, APIs, config, or architecture change, the PR includes doc updates. A PR that changes how something works but not how it's documented is incomplete.
- **Run single test files, not the full suite,** during development. Full suite before commit.

## Stack (One-Liners)

- We use Astro SSR, not Next.js or static site generation
- We use Netlify for hosting, not Vercel
- We use Neon PostgreSQL via `NETLIFY_DATABASE_URL`, not Supabase
- We use custom magic-link auth, not Auth0 or Clerk
- We use Tailwind CSS 3 via PostCSS (`postcss.config.mjs`), not CSS modules or styled-components. `@astrojs/tailwind` was dropped in the Astro 7 upgrade (it does not support Astro 6+)
- We use React islands selectively (TuitionCalculator), not as the primary renderer
- Email providers: SendGrid + Unione, both called via REST (`fetch`) — no email SDK packages are installed.
- Blog: DB-backed via /admin/blog; posts are content rows with type='blog'. V2 authoring is a TipTap WYSIWYG editor storing sanitized HTML in data.body (ADR-009; `blog-html.ts` STRICT_CONFIG_V2 is the render-time trust boundary)
- Donations: on-site Stripe Checkout (`api/donations/checkout.ts`), confirmed by the `api/webhooks/stripe.ts` webhook; thank-you emails are queued and sent by `netlify/functions/process-donation-email-jobs.ts`. Tuition/other payments are not handled on-site.
- Out of scope: newsletter

## Path Aliases

```
@/          → src/          @components → src/components/
@layouts    → src/layouts/   @lib        → src/lib/
@utils      → src/utils/     @styles     → src/styles/
```

## Database Access

All DB access through the facade at `@lib/db`:

```typescript
import { db } from "@lib/db";
// db.content, db.camp, db.analytics, db.announcements,
// db.communications, db.contact, db.adSpend, db.cache, db.raw
```

Low-level: `queryFirst()` and `queryRows()` from `@lib/db/client`.

## Gotchas

- **CSS `* { max-width: 100% }`** in `global.css` clamps ALL elements. Override with `max-width: none` when needed.
- **Deploy from repo root, not `app/`.** Deploying from repo root with `--dir=app/dist` is the working, current path; there is no `base=app` in the committed `netlify.toml`. The repo-root deploy empirically uploads the SSR function and prod serves SSR.
- **SVGs with `preserveAspectRatio="none"`** need explicit width values (`width: auto` won't work).
- **Node >= 22.22.0 is required** (Astro 7, `@astrojs/react` 7). Older Node 22 releases print EBADENGINE warnings and are unsupported.
- **Never read server secrets with a bare `import.meta.env.SECRET`.** Astro inlines it at build time (Vite loads `.env.local`), so a local build bakes the secret into the SSR bundle. Read `process.env` at runtime; for dev-only `.env` access, gate static reads behind `import.meta.env.DEV` (see `src/lib/db/env.ts`). Dynamic `import.meta.env[key]` throws in `astro dev`.
- **Content collections live in `src/content.config.ts`** (glob loaders). Entries are keyed by `entry.id`; the legacy `entry.slug` is gone.

## Conventions (Beyond Linter)

- Components: PascalCase. Pages: kebab-case. Utilities: camelCase.
- Commit prefixes: `feat(scope):`, `fix(scope):`, `[BUILD-FIX]`
- Fonts: Nunito (body), Poppins (headings)
- Brand colors are in `tailwind.config.mjs` under `forest-canopy`, `moss-green`, `sunlight-gold`, `earth-brown`, `stone-beige`, `cloud-gray`

## Documentation

Canonical docs live in `docs/`:

- **PRD**: `docs/PRD.md`
- **Roadmap**: `docs/roadmap.md`
- **Specs**: `docs/specs/` (architecture, data-model, auth, camp-system, email, api, blog)
- **ADRs**: `docs/adr/` (11 architecture decision records)
- **Runbooks**: `docs/runbooks/` (deploy, rollback, blog-html-conversion, scheduled-publish, ticker)

## Agents

13 custom agents in `.claude/agents/` — includes domain-specific agents for content verification, UX advocacy, SEO, deployment, debugging, and code review.

## Compact Instructions

When compacting, preserve:

- Current task description and acceptance criteria
- List of files modified in this session
- Unresolved blockers or open questions
- Any conventions learned during this session
