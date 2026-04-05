# ADR-004: Magic-Link Auth over Third-Party Auth Providers

**Date**: 2026-02-08
**Status**: Accepted

## Context

The application went through multiple authentication providers over its history:

1. **Clerk** (July-September 2025): Used `createClerkClient` for backend auth and surfaced user email to pages. Encountered bundling issues on Netlify (commit `dc57d30`, September 2025).
2. **Auth0** (February 2026): Added as an alternative provider (commit `0027a49`), with runtime credential detection (commit `4cb8a45`). Provided a more standard OAuth flow but added another vendor dependency.
3. **Custom magic-link**: Built during the February 2026 refactor as part of the Netlify+Neon simplification effort.

Each third-party provider added SDK dependencies, configuration complexity, and vendor lock-in for what is fundamentally a simple need: a small number of school administrators need to log into an admin panel.

## Decision

Implement custom magic-link authentication with database-backed sessions. The system uses SHA-256 hashed tokens stored in PostgreSQL, cookie-based session validation (`sbms-admin-session`), and email-delivered login links. Authentication state is set in Astro middleware (`locals.isAdmin`, `locals.userId`, `locals.userEmail`).

## Consequences

- **Easier**: Full control over the auth flow. No vendor SDK to bundle, configure, or pay for. Auth behavior is transparent and debuggable in application code.
- **Easier**: Works natively with the Netlify+Neon stack without additional integrations or redirect configurations.
- **Easier**: Session validation is a simple database lookup in middleware, with no external API calls on every request.
- **Harder**: Security is entirely our responsibility: rate limiting login attempts, token expiration, session invalidation, and secure cookie handling must all be implemented and maintained.
- **Harder**: No built-in features like MFA, social login, or user management dashboards that third-party providers offer out of the box.
- **Note**: Legacy Auth0 code still exists in the codebase (tracked as P3-13 in the audit backlog). The Netlify Auth0 extension remains a future option if auth needs grow beyond what magic-link provides.
