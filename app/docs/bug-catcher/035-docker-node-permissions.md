---
id: 035
title: "Docker Node Modules Permission Error"
severity: critical
status: open
category: infrastructure
affected_components: ["Docker", "Development Environment"]
related_bugs: [032, 034]
discovered_date: 2025-07-29
environment: [development]
---

# Bug #035: Docker Node Modules Permission Error

## Description
The development environment fails to start due to permission issues with the node_modules directory. The npm install process runs as root, but the application runs as the node user, causing permission denied errors when Astro tries to create its cache directories.

## Symptoms
- Error: `EACCES: permission denied, mkdir '/app/node_modules/.astro'`
- Container stuck in restart loop
- Dev server cannot start
- http://localhost:4321 inaccessible

## Error Messages
```
[EACCES: permission denied, mkdir '/app/node_modules/.astro'] {
  errno: -13,
  code: 'EACCES',
  syscall: 'mkdir',
  path: '/app/node_modules/.astro'
}
```

## Steps to Reproduce
1. Build Docker container with current Dockerfile.dev
2. Run `docker-compose up`
3. Container starts but crashes with permission error
4. Container enters restart loop

## Root Cause
- npm install runs as root user in Dockerfile
- Application runs as node user (UID 1000)
- node_modules directory owned by root:root
- Node user cannot write to root-owned directories

## Affected Files
- `Dockerfile.dev` - Missing ownership correction after npm install

## Proposed Solution

### Quick Fix
```dockerfile
# After npm install in Dockerfile.dev
RUN npm ci --prefer-offline --no-audit --no-fund && \
    chown -R node:node /app
```

### Alternative Fix
```dockerfile
# Run npm install as node user
USER node
RUN npm ci --prefer-offline --no-audit --no-fund
```

## Impact
- Complete blocker for development environment
- Prevents all testing and development work
- Critical infrastructure issue

## Testing Requirements
- Verify container builds successfully
- Ensure dev server starts without permission errors
- Confirm http://localhost:4321 is accessible
- Test that Astro can create cache directories

## Priority Justification
Critical - This is the final blocker preventing a functional development environment. Without fixing this, no other bugs can be tested or verified. The fix is trivial but essential.