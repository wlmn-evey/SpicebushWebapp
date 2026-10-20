# ADR-001: Astro SSR as Application Framework

**Date**: 2025-07-28
**Status**: Accepted

## Context

Spicebush Montessori School needed a website that serves both as a public-facing content site (hours, staff, tuition, camp information) and as a CMS-driven admin panel for school administrators. The site is content-heavy with relatively few interactive elements, but dynamic functionality (admin authentication, database-driven content, camp mode routing) rules out a purely static build.

## Decision

Use Astro 5 with `output: 'server'` (full server-side rendering) as the application framework. Interactive components (tuition calculator, admin panel widgets) use React islands via Astro's partial hydration model. Tailwind CSS 3 provides styling with a custom brand theme.

**Update (2026-10):** Upgraded from Astro 5 to Astro 7 (`@astrojs/netlify` 8, `@astrojs/react` 7) to clear the SSR security advisories tracked in #122; no 5.x or 6.x release fixes all of them. Tailwind CSS 3 now runs through PostCSS because `@astrojs/tailwind` does not support Astro 6+. The decision itself (Astro SSR + React islands + Tailwind 3) is unchanged.

## Consequences

- **Easier**: Content pages are fast and lightweight since most ship zero JavaScript. The islands architecture means React is only loaded where interactivity is actually needed. Astro's file-based routing and `.astro` component model make content pages straightforward to build.
- **Easier**: Middleware pipeline (auth gating, camp mode routing, coming-soon gate) integrates naturally with Astro's SSR request lifecycle.
- **Harder**: Full SSR mode means every request hits a serverless function, increasing hosting complexity compared to a static site. Requires an SSR-capable hosting provider.
- **Harder**: The Astro ecosystem is smaller than Next.js or Remix, so some patterns (e.g., complex form handling, API routes) require more manual implementation.
- **Trade-off**: Mixing `.astro` pages with React islands means two component models coexist, which can be confusing for contributors unfamiliar with Astro.
