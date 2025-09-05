# Bug #048 Investigation - Docker HTTP Request Hang

**Date**: 2025-07-30
**Bug ID**: 048
**Severity**: CRITICAL
**Status**: Under Investigation

## Issue Summary

After fixing Bug #047 (DB_READONLY environment variables), the application now starts successfully but HTTP requests hang indefinitely when running in Docker. The browser connection to http://localhost:4321 never receives a response.

## Investigation Progress

### 1. Bug Documentation Created
- Created comprehensive bug report at `/app/docs/bug-catcher/048-docker-http-request-hang.md`
- Updated BUG_TRACKER_MASTER.md to include Bug #047 (fixed) and Bug #048 (new)

### 2. Initial Analysis
From examining the codebase:
- Dockerfile.dev properly includes `--host 0.0.0.0 --port 4321` in the CMD
- astro.config.mjs is configured for server mode with node adapter
- Environment variables are now properly accessible (Bug #047 fix confirmed)

### 3. Diagnostic Script Created
Created `/app/test-bug-048.js` to systematically test:
1. Docker environment detection
2. Network interfaces
3. Basic HTTP server creation
4. Astro process status
5. Port binding verification
6. Astro endpoint connectivity
7. Common issues (memory, zombies)

## Potential Root Causes

1. **Astro Dev Server Binding**: Despite the --host flag, Astro might still be binding to localhost
2. **Middleware Blocking**: Request processing might be hanging in middleware
3. **Database Query on Startup**: The content-db-direct.ts connection might be blocking
4. **Network Configuration**: Docker network routing issues
5. **Resource Constraints**: Memory or CPU limitations

## Next Steps

1. Run the diagnostic script inside the Docker container
2. Add verbose logging to track request flow
3. Test with a minimal Astro page (no database calls)
4. Check if production build works vs dev server
5. Verify the exact command being executed by the container

## Related Issues
- Bug #047: DB_READONLY Environment Variables (FIXED - led to discovering this issue)
- Bug #032: Docker Container Missing Dependencies (FIXED)
- Bug #002: Server 500 Errors (FIXED - similar hanging symptoms)

## Temporary Workaround
None identified yet. Local development without Docker may work as an alternative.

## Resolution Strategy
Once root cause is identified:
1. Implement targeted fix
2. Add tests to prevent regression
3. Document the solution
4. Update Docker development guide