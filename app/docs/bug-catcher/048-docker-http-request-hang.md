---
id: 048
title: "Application Hangs on HTTP Requests in Docker"
severity: critical
status: open
category: infrastructure
affected_pages: ["all pages"]
discovered_date: 2025-07-30
environment: [docker]
---

# Bug 048: Application Hangs on HTTP Requests in Docker

## Description
After fixing Bug #047 (DB_READONLY environment variables), the application now starts successfully but HTTP requests hang indefinitely. The Docker container appears healthy, but when trying to access any page (e.g., http://localhost:4321), the browser connection hangs and never receives a response.

## Current Behavior
- Docker containers start successfully with no errors
- Database connection is established (confirmed by Bug #047 fix)
- Health checks may be passing
- HTTP requests to port 4321 hang indefinitely
- No error messages in logs - just silent hanging

## Expected Behavior
- Pages should load normally when accessed via browser
- HTTP requests should receive responses within reasonable time
- Error messages should appear if there are issues

## Symptoms
1. Browser shows loading spinner indefinitely
2. No response headers received
3. No errors in Docker logs
4. Application appears to start normally

## Potential Root Causes
1. **Astro Dev Server Binding**: The dev server might be binding to localhost instead of 0.0.0.0
2. **Network Configuration**: Docker network routing issues
3. **Middleware Blocking**: Some middleware might be blocking requests
4. **Database Query Hanging**: Initial database queries might be hanging
5. **Missing Environment Variables**: Other required env vars might be missing
6. **Port Mapping Issues**: Docker port mapping might be incorrect

## Impact
- **User Impact**: Complete site failure - no pages can be accessed
- **Development Impact**: Cannot test or develop using Docker
- **Business Impact**: Cannot deploy containerized application

## Debugging Steps Taken
1. Confirmed DB_READONLY variables are now accessible (Bug #047 fixed)
2. Database connection appears to work
3. Application starts without errors
4. Issue occurs when HTTP requests are made

## Next Debugging Steps
1. Check if Astro dev server is binding to correct host (0.0.0.0 vs localhost)
2. Test direct container access vs through Docker port mapping
3. Add request logging to see if requests reach the application
4. Check for hanging database queries or middleware
5. Verify all required environment variables are set
6. Test with production build vs dev server

## Related Bugs
- Bug #047: DB_READONLY Environment Variables (fixed, but may have revealed this issue)
- Bug #032: Docker Container Missing Dependencies (fixed)
- Bug #002: Server 500 Errors (fixed, but similar symptoms)

## Temporary Workarounds
None identified yet. Local development without Docker may work.

## Permanent Fix
To be determined after root cause analysis.