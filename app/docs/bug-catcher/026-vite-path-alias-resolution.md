---
id: 026
title: Vite Path Alias Resolution Failure in Docker
severity: critical
status: partially_fixed
category: infrastructure
created: 2025-07-28
lastUpdated: 2025-07-29
notes: "Vite path aliases already configured in astro.config.mjs. Docker still has issues with DB env vars."
affectedComponents:
  - Docker environment
  - Vite configuration
  - Module imports
relatedBugs: [013]
---

# Vite Path Alias Resolution Failure in Docker

## Summary
The Docker container for the main app is failing because Vite cannot resolve TypeScript path aliases (e.g., `@lib/content-db`). This causes the entire application to fail with 500 errors.

## Current Behavior
- App container shows repeated errors: `Cannot find module '@lib/content-db'`
- The application returns 500 Internal Server Error on all requests
- Container health check is failing
- Path aliases defined in tsconfig.json are not being resolved by Vite in the Docker environment

## Expected Behavior
- Path aliases should resolve correctly in both local and Docker environments
- The application should start successfully without import errors

## Root Cause
The astro.config.mjs file lacks Vite resolve configuration for path aliases. While tsconfig.json defines the aliases, Vite needs its own configuration to resolve them during bundling.

## Impact
- **User Impact**: Complete application failure - no pages load
- **Development Impact**: Docker development environment is unusable
- **Business Impact**: Cannot deploy or test using Docker

## Reproduction Steps
1. Run `docker-compose up`
2. Check logs with `docker logs app-app-1`
3. Try to access http://localhost:4321
4. Observe 500 error and import failures in logs

## Technical Details
```
Error: Cannot find module '@lib/content-db' imported from '/app/src/components/Header.astro'
Stack trace:
  at fetchModule (file:///app/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:46813:19)
```

## Proposed Solution
Update astro.config.mjs to include Vite resolve configuration:

```javascript
vite: {
  resolve: {
    alias: {
      '@': '/app/src',
      '@components': '/app/src/components',
      '@layouts': '/app/src/layouts',
      '@lib': '/app/src/lib',
      '@utils': '/app/src/utils',
      '@styles': '/app/src/styles',
      '@content': '/app/src/content'
    }
  },
  define: {
    'process.env': {}
  }
}
```

## Workaround
None available - this is a blocking issue for Docker deployment.

## Testing Notes
After fix implementation:
1. Rebuild Docker containers
2. Verify no import errors in logs
3. Confirm application loads successfully
4. Test all pages that use path aliases