# ADR-002: Netlify as Backend Platform

**Date**: 2025-07-28
**Status**: Accepted

## Context

The application uses Astro SSR and needs a hosting platform that supports server-side rendering, serverless functions, environment variable management, and straightforward deployment. The team wanted simple git-push deployments without managing infrastructure.

## Decision

Deploy on Netlify using the `@astrojs/netlify` adapter. Astro SSR pages and API routes run as Netlify Functions. Deployment is done via the Netlify CLI (`npx netlify deploy --prod --dir=app/dist`) from the repository root, with `base=app` configured in `netlify.toml`.

## Consequences

- **Easier**: Git-push deploys and CLI-based promotion are simple and reliable. Built-in support for serverless functions, environment variables, and preview deploys.
- **Easier**: Netlify's DB integration provides a managed connection to Neon PostgreSQL via `NETLIFY_DATABASE_URL`, reducing database configuration overhead.
- **Easier**: Form handling (coming-soon page) and function bundling work out of the box with minimal configuration.
- **Harder**: Some Netlify-specific patterns are required (e.g., `netlify.toml` base path configuration, external package resolution at runtime for email providers). Deploying from the wrong directory causes path-doubling bugs.
- **Harder**: Vendor lock-in for deployment pipeline and some integrations (Netlify DB, Netlify Auth0 extension). Migrating to another platform would require reworking the adapter and deployment process.
- **Trade-off**: Email packages (`resend`, `@sendgrid/mail`, `postmark`) must be externalized in the Rollup config because they resolve at Netlify Functions runtime, not at build time.
