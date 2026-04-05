# Architecture Specification

Spicebush Montessori School website -- an Astro 5 SSR application deployed on Netlify with a Neon PostgreSQL database. The site serves as the public face for the school plus a CMS-driven admin panel for content, camp, tuition, media, and analytics management.

Live site: https://spicebushmontessori.org

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Astro 5 (^5.2.5) | `output: 'server'` (SSR) |
| Adapter | `@astrojs/netlify` | Deployed as Netlify Functions |
| Styling | Tailwind CSS 3 | Custom brand theme |
| Icons | `lucide-astro` | |
| React | Selective islands | `TuitionCalculator.tsx`, admin components |
| Database | Neon PostgreSQL | Via `NETLIFY_DATABASE_URL`, accessed through `pg` client |
| Auth | Magic-link admin sessions | Cookie-based validation |
| Email | Configurable provider | Resend, SendGrid, Postmark, or Unione -- externalized at build via Rollup |

---

## Project Structure

```
SpicebushWebapp/              (repo root -- deploy from here)
  app/                        (Astro application)
    src/
      pages/                  (file-based routing, kebab-case)
        admin/                (13 admin pages, auth-gated)
        api/                  (REST endpoints)
        auth/                 (sign-in flow)
      components/             (PascalCase .astro and .tsx)
        admin/                (admin-specific components)
        camp/                 (camp-specific components)
      lib/                    (shared business logic, camelCase)
        db/                   (database facade -- namespaced modules)
        auth/                 (auth providers and session management)
      layouts/                (Layout.astro, AdminLayout.astro, NetlifyAuthLayout.astro)
      styles/                 (global.css with Tailwind)
      utils/                  (utility functions)
    db/
      migrations/             (14 SQL migrations, numbered 001-014)
    e2e/                      (Playwright E2E tests)
    public/                   (static assets, images)
  docs/                       (canonical documentation)
  scripts/                    (operational helpers)
```

---

## Path Aliases

```
@/          -> src/
@components -> src/components/
@layouts    -> src/layouts/
@lib        -> src/lib/
@utils      -> src/utils/
@styles     -> src/styles/
```

---

## Build Pipeline

- **Build command**: `npm run build` (from `app/`)
- **Output**: `app/dist/`
- **Deploy**: `npx netlify deploy --prod --dir=app/dist` (from repo root, NOT `app/`)
- **Netlify config**: `netlify.toml` has `base=app`, so deploying from `app/` causes path doubling
- **Externalized packages**: `resend`, `@sendgrid/mail`, `postmark` are marked as Rollup externals and resolved at runtime on Netlify, not at build time

---

## Middleware Pipeline

Defined in `src/middleware.ts`. Request handling chain:

```
Auth check -> Coming-soon gate -> Camp mode routing -> Page render
```

### Auth

- Validates admin session from the `sbms-admin-session` cookie
- Sets `locals.isAdmin`, `locals.userId`, `locals.userEmail` on every request

### Protected Route Prefixes

- `/admin`
- `/api/admin`
- `/api/cms`
- `/api/media/upload`
- `/api/storage/stats`

### Coming-Soon and Camp Mode

- Both evaluations are cached with a 30-second TTL
- Camp mode redirects `/camp` to `/camp-coming-soon` when camp is inactive (non-admin visitors)
- Camp mode redirects `/camp-coming-soon` to `/camp` when camp is active
- Admins can see camp pages in prep mode regardless of public visibility

---

## Database Access Pattern

All DB access goes through a unified facade at `@lib/db`:

```typescript
import { db } from '@lib/db';

// Namespaced modules:
db.content.getAllSettings()
db.camp.getPublishedCampWeeks()
db.analytics.recordAnalyticsEvent(...)
db.announcements.getActiveAnnouncements()
db.communications.getRecentMessages()
db.contact.getContactSubmissions()
db.adSpend.getAdSpendSummary()
db.cache                        // cache utilities
db.raw.getServiceClient()       // escape hatch for direct queries
```

Low-level SQL uses `queryFirst()` and `queryRows()` from `@lib/db/client`.

---

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `NETLIFY_DATABASE_URL` | Neon PostgreSQL connection string |
| `PUBLIC_SITE_URL` | Canonical site URL |
| `AUTH_PROVIDER` | Set to `netlify-magic-link` |

### Optional

| Variable | Purpose |
|----------|---------|
| `COMING_SOON_MODE` | Override coming-soon gate (`true`/`false`) |
| `ADMIN_EMAILS` | Explicit admin allow-list |
| `ADMIN_DOMAINS` | Domain-based admin access (use cautiously) |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |

### Email Provider (configure one)

| Variable | Provider |
|----------|----------|
| `UNIONE_API_KEY` (+ optional `UNIONE_REGION`) | Unione |
| `RESEND_API_KEY` | Resend |
| `SENDGRID_API_KEY` | SendGrid |
| `POSTMARK_SERVER_TOKEN` | Postmark |

### Deploy / CI

| Variable | Purpose |
|----------|---------|
| `NETLIFY_SITE_ID` | Netlify site identifier |
| `NETLIFY_AUTH_TOKEN` | Netlify deploy token |

---

## Brand and Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `forest-canopy` | `#3E6D51` | Primary green, headings, buttons |
| `moss-green` | `#5A8065` | Secondary green, hover states |
| `sunlight-gold` | `#F89406` | CTAs, accents, badges |
| `earth-brown` | `#2E2E2E` | Body text |
| `stone-beige` | `#F7F2DC` | Background sections |
| `cloud-gray` | `#ECEFF1` | Subtle backgrounds |

### Fonts

- **Sans (body)**: Nunito
- **Heading**: Poppins

### Layout Pattern

```html
<div class="container mx-auto px-4">
  <!-- content -->
</div>
```

---

## Known Gotchas

1. **CSS global max-width rule**: `global.css` applies `* { max-width: 100%; }` to all elements. Any element needing to exceed its parent width (decorative SVGs, absolute-positioned overlays) must explicitly set `max-width: none`.

2. **SVG stretching**: SVGs with `preserveAspectRatio="none"` need explicit width values to stretch properly. Using `width: auto` will not work.

3. **Deploy path**: Deploy from the repo root, not from `app/`. The Netlify dashboard has `base=app`, so running the deploy CLI from inside `app/` causes path doubling.

---

## Coding Conventions

- TypeScript strict mode, 2-space indent
- Components: PascalCase (`CampPromoModule.astro`)
- Pages: kebab-case (`camp-coming-soon.astro`)
- Utilities: camelCase in `src/lib/` and `src/utils/`
- Tests: `*.test.ts` co-located with source or under `src/test/`
- Commit prefixes: `feat(scope):`, `fix(scope):`, `[BUILD-FIX]`
- ESLint config: `app/.eslintrc.json` with `eslint-plugin-astro` and `eslint-plugin-jsx-a11y`
