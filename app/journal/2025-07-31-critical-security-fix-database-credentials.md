# Critical Security Fix: Database Credentials Exposure

**Date**: 2025-07-31
**Severity**: CRITICAL
**Status**: RESOLVED

## Issue Description

Database credentials were being exposed to the client-side JavaScript bundle through Vite's `define` configuration in `astro.config.mjs`. The following environment variables were being made available to client-side code:

- `DB_READONLY_HOST`
- `DB_READONLY_PORT`
- `DB_READONLY_DATABASE`
- `DB_READONLY_USER`
- `DB_READONLY_PASSWORD`

This meant that anyone could view these credentials by inspecting the browser's JavaScript source code, creating a severe security vulnerability.

## Root Cause

The `vite.define` configuration in `astro.config.mjs` (lines 23-27) was explicitly exposing these environment variables to the client-side bundle. While `vite.define` is useful for making certain values available during build time, it should never be used for sensitive credentials.

## Solution Applied

Removed all database credential definitions from `vite.define`, keeping only the safe `NODE_ENV` variable. The configuration was updated from:

```javascript
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  // Make specific DB_READONLY vars available during build
  'process.env.DB_READONLY_HOST': JSON.stringify(process.env.DB_READONLY_HOST),
  'process.env.DB_READONLY_PORT': JSON.stringify(process.env.DB_READONLY_PORT),
  'process.env.DB_READONLY_DATABASE': JSON.stringify(process.env.DB_READONLY_DATABASE),
  'process.env.DB_READONLY_USER': JSON.stringify(process.env.DB_READONLY_USER),
  'process.env.DB_READONLY_PASSWORD': JSON.stringify(process.env.DB_READONLY_PASSWORD)
},
```

To:

```javascript
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
},
```

## Impact

- **Before**: Database credentials were exposed in client-side JavaScript bundle
- **After**: Database credentials are only accessible server-side through `import.meta.env`
- **Result**: Critical security vulnerability has been eliminated

## Verification Steps

1. Build the application and inspect the client-side bundle
2. Verify that no database credentials appear in the JavaScript source
3. Confirm that server-side code can still access credentials through `import.meta.env`

## Recommendations

1. **Immediate**: Deploy this fix to all environments as soon as possible
2. **Immediate**: Rotate all database credentials that were previously exposed
3. **Future**: Implement code review checks to prevent similar exposures
4. **Future**: Consider using a secrets management system for sensitive configuration

## Lessons Learned

- Never use `vite.define` for sensitive credentials
- Always distinguish between build-time constants safe for client exposure and server-only secrets
- In Astro, use `import.meta.env` for server-side environment variable access