---
id: 047
title: "DB_READONLY Environment Variables Not Accessible in Astro"
severity: critical
status: open
category: configuration
affected_pages: ["all pages using content-db-direct.ts"]
discovered_date: 2025-07-30
environment: [docker, development]
---

# Bug 047: DB_READONLY Environment Variables Not Accessible in Astro

## Description
The application throws "DB_READONLY_USER environment variable is required" errors when running in Docker, even though the environment variables are set in the container. The issue is that Astro/Vite requires environment variables to be prefixed with `PUBLIC_` to be accessible in the browser context.

## Current Behavior
- Error: "DB_READONLY_USER environment variable is required" on every page load
- Environment variables are set in docker-compose.yml and visible in container
- But import.meta.env doesn't see them without PUBLIC_ prefix

## Expected Behavior
- Database connection should work with the configured environment variables
- No errors when loading pages

## Root Cause
The content-db-direct.ts file uses `import.meta.env[key]` which in Astro only exposes variables prefixed with `PUBLIC_`. The current DB_READONLY_* variables are not prefixed.

## Impact
- **User Impact**: Complete site failure - no pages load
- **Development Impact**: Docker environment is unusable
- **Business Impact**: Cannot deploy or test the containerized application

## Technical Details
Environment variables in container:
- DB_READONLY_HOST=supabase-db
- DB_READONLY_PORT=5432
- DB_READONLY_DATABASE=postgres
- DB_READONLY_USER=postgres
- DB_READONLY_PASSWORD=your-super-secret-and-long-postgres-password

But import.meta.env cannot access these without PUBLIC_ prefix.

## Possible Solutions
1. Rename all DB_READONLY_* vars to PUBLIC_DB_READONLY_* (security concern)
2. Use server-side only database connections (better security)
3. Pass environment variables differently for server context