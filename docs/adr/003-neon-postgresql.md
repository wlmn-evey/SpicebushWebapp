# ADR-003: Neon PostgreSQL over Supabase

**Date**: 2026-02-08
**Status**: Accepted

## Context

The application originally used Supabase for both database access and authentication. Over time, the Supabase SDK layer added complexity: the facade had to handle both Supabase API reads and direct Postgres fallbacks, environment configuration was fragile, and the auth integration (Supabase Auth) was eventually abandoned in favor of custom solutions. A February 2026 refactor aimed to simplify the stack by removing vendor SDK dependencies from the data layer.

Evidence of the migration path:
- Supabase-backed data helpers existed as of October 2025 (commit `0d08bc0`)
- The refactor master plan (dated February 8, 2026) codified the decision: "Database: Neon via Netlify DB (`NETLIFY_DATABASE_URL`)"
- All DB access was unified around a Postgres pool client (`app/src/lib/db/client.ts`)

## Decision

Migrate from Supabase to Neon PostgreSQL, accessed through Netlify's DB integration. All database access goes through a unified facade (`db.*` namespaced modules) backed by raw SQL queries via `queryFirst` and `queryRows` helpers. No ORM or vendor SDK sits between application code and the database.

## Consequences

- **Easier**: Direct PostgreSQL access with no vendor SDK abstraction. SQL queries are explicit and auditable. No more dual-path reads (Supabase API vs. direct Postgres).
- **Easier**: Single connection string (`NETLIFY_DATABASE_URL`) replaces multiple Supabase environment variables.
- **Easier**: Database schema is managed through migration files, giving full control over the data model.
- **Harder**: Lost Supabase Auth, which was replaced with custom magic-link authentication (see ADR-004). Auth is now fully our responsibility.
- **Harder**: No built-in real-time subscriptions, row-level security policies, or storage buckets that Supabase provided. These features must be built if needed.
- **Trade-off**: Writing raw SQL is more explicit but more verbose than using an ORM. The team accepted this trade-off in favor of transparency and fewer abstraction layers.
