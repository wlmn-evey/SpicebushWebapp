# Spicebush Documentation

## Canonical Documents

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Product requirements — what the product is, who it serves, features in/out of scope |
| [ROADMAP.md](ROADMAP.md) | Phases, open backlog, audit remediation status, what's next |

## Technical Specs (`specs/`)

| Spec | Purpose |
|------|---------|
| [architecture.md](specs/architecture.md) | Stack, build pipeline, project structure, conventions |
| [data-model.md](specs/data-model.md) | Full database schema (19 tables, 14 migrations) |
| [auth.md](specs/auth.md) | Magic-link auth flow, sessions, protected routes |
| [camp-system.md](specs/camp-system.md) | Camp mode state machine, seat logic, promotions |
| [email.md](specs/email.md) | Email providers, types, templates, routing |
| [api.md](specs/api.md) | All 29 API endpoints with auth requirements |

## Architecture Decision Records (`adr/`)

| ADR | Decision |
|-----|----------|
| [001](adr/001-astro-ssr.md) | Astro SSR as application framework |
| [002](adr/002-netlify-platform.md) | Netlify as backend platform |
| [003](adr/003-neon-postgresql.md) | Neon PostgreSQL over Supabase |
| [004](adr/004-magic-link-auth.md) | Magic-link auth over third-party providers |
| [005](adr/005-transparent-classroom.md) | Transparent Classroom as enrollment system |
| [006](adr/006-cms-database-tables.md) | CMS as database tables over headless CMS |
| [007](adr/007-email-provider-abstraction.md) | Configurable email provider abstraction |

## Runbooks (`runbooks/`)

| Runbook | Purpose |
|---------|---------|
| [deploy.md](runbooks/deploy.md) | Production deployment checklist |
| [rollback.md](runbooks/rollback.md) | Rollback procedures |

## Other Docs

- `development/` — getting started, configuration, dependencies, Docker setup
- `testing/` — testing guide, QA checklist
- `setup/` — quick start guide
- `incidents/` — operational incident notes

## Issue Tracking

All bugs, backlog items, and improvements are tracked in [GitHub Issues](https://github.com/wlmn-evey/SpicebushWebapp/issues).
