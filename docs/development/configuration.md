# Configuration Rules

## Source of Truth
- Backend platform: Netlify
- Database: Neon via Netlify DB connection string
- Runtime: Astro with Netlify adapter

## Environment Rules
- Prefer `NETLIFY_DATABASE_URL`.
- `DATABASE_URL` is a fallback only.
- Do not add provider-specific auth/database env vars that are no longer in scope.
- Keep secrets out of git; use `.env.local` locally and Netlify environment variables in deployed environments.

## Development Workflow
- Root workflow: `npm run dev` (Netlify dev).
- App-only workflow: `cd app && npm run dev`.
- DB migrations: `cd app && npm run db:migrate`.

## What Not to Reintroduce
- Legacy third-party client/auth configuration.
- Legacy Stripe/payment flows.
- On-site mailing-list capture flow.
- Duplicate setup paths that conflict with active docs.

## Incident Documentation
- Put active incident/debug notes in `docs/incidents/`.
- Keep `docs/` focused on current architecture and operations.
