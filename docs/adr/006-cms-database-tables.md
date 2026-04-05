# ADR-006: CMS as Database Tables over Headless CMS

**Date**: 2025-07-30
**Status**: Accepted

## Context

The school website needs content management for pages, settings, announcements, FAQ entries, testimonials, staff profiles, camp information, and tuition data. Options included adopting a headless CMS service (Contentful, Sanity, Strapi) or building content management directly into the application using the existing database.

The site's content model is relatively small and domain-specific (school hours, camp weeks, tuition tiers) rather than generic blog-style content. A headless CMS would provide a polished editing UI but would add another service dependency, require mapping between CMS schemas and application data models, and introduce API latency for every content read.

## Decision

Store all managed content in PostgreSQL tables (`content`, `settings`, `admin_settings`, plus domain-specific tables for camp weeks, tuition, staff, etc.) and build a custom admin panel at `/admin/*` for editing. Content is accessed through the `db.*` facade with namespaced modules (`db.content`, `db.camp`, `db.announcements`, etc.).

## Consequences

- **Easier**: No external CMS service to configure, pay for, or keep in sync. Content and application data live in the same database, enabling joins and transactional consistency.
- **Easier**: The content model exactly matches application needs. No impedance mismatch between CMS schemas and what the application actually renders.
- **Easier**: Content reads are direct database queries with no external API calls, reducing latency and eliminating a runtime dependency.
- **Harder**: The admin UI must be built and maintained in-house. Every new content type requires both a database migration and corresponding admin page/API routes.
- **Harder**: No built-in content versioning, preview drafts, or role-based editorial workflows that mature CMS platforms provide.
- **Trade-off**: Non-technical staff need the custom admin panel to be intuitive enough for content editing. The admin UX is limited by what the team builds rather than what a dedicated CMS product offers.
