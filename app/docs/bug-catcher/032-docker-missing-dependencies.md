---
id: 032
title: Docker Container Missing Multiple Dependencies
severity: critical
status: open
category: infrastructure
created: 2025-07-28
lastUpdated: 2025-07-28
affectedComponents:
  - Docker build process
  - Node modules
  - Package installation
relatedBugs: [013, 026]
---

# Docker Container Missing Multiple Dependencies

## Summary
The Docker container is missing multiple critical npm dependencies despite having node_modules volume mounted. This explains the module resolution failures and indicates a broken build process.

## Current Behavior
- 11+ missing dependencies including core packages
- TypeScript itself is missing
- Database driver (pg) is missing
- Build tools and type definitions absent
- Application cannot start due to missing modules

## Expected Behavior
- All dependencies should be installed during Docker build
- node_modules should contain all required packages
- npm install should complete successfully

## Missing Dependencies
```
- @astrojs/node (server adapter)
- @types/dompurify, @types/marked, @types/pg (type definitions)
- bcryptjs (authentication)
- dotenv (environment variables)
- isomorphic-dompurify (content sanitization)
- marked (markdown parsing)
- pg (PostgreSQL driver)
- typescript (core dependency)
```

## Root Cause
The Docker build process appears to be failing at the npm install stage, possibly due to:
1. Volume mount conflicts with node_modules
2. npm install errors being suppressed
3. Incorrect COPY commands in Dockerfile
4. Permission issues during installation

## Impact
- **User Impact**: Complete application failure
- **Development Impact**: Docker environment unusable
- **Business Impact**: Cannot deploy or develop with Docker

## Proposed Solution
1. Fix Dockerfile npm install process
2. Remove node_modules from volume mounts
3. Ensure proper error handling in build
4. Add health check for dependency installation
5. Consider multi-stage build improvements

## Testing Notes
- Rebuild container and verify npm list shows no errors
- Check that all imports resolve correctly
- Verify application starts successfully
- Test that TypeScript compilation works