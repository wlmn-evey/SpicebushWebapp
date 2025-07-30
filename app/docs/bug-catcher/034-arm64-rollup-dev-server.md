---
id: 034
title: "ARM64 Rollup Dev Server Failure"
severity: critical
status: open
category: infrastructure
affected_components: ["Docker", "Development Environment", "Build Tools"]
related_bugs: [032, 026]
discovered_date: 2025-07-29
environment: [development]
platform: ["ARM64", "Apple Silicon", "M1", "M2"]
---

# Bug #034: ARM64 Rollup Dev Server Failure

## Description
The development server fails to start on ARM64 architecture (Apple Silicon) due to missing platform-specific rollup binaries. This occurs after successfully fixing the npm dependencies issue (Bug #032).

## Symptoms
- Error: `Cannot find module @rollup/rollup-linux-arm64-musl`
- Development server crashes on startup
- Only affects ARM64/Apple Silicon machines
- Docker container builds successfully but app won't run

## Error Messages
```
Error: Cannot find module @rollup/rollup-linux-arm64-musl
Possible solutions:
- npm install @rollup/rollup-linux-arm64-musl
```

## Steps to Reproduce
1. Build Docker container on Apple Silicon Mac
2. Run `docker-compose up`
3. Container starts but dev server crashes with rollup error

## Root Cause
- Astro/Vite uses rollup for bundling
- Platform-specific binaries needed for ARM64
- Version mismatches between requested and available packages
- Docker volume mounting prevents runtime installation

## Affected Files
- `Dockerfile.dev`
- `docker-entrypoint.sh`
- `package.json` (indirectly through Astro dependencies)

## Proposed Solutions

### Solution 1: Force x86 Emulation (Quick Fix)
```yaml
# docker-compose.yml
services:
  app:
    platform: linux/amd64  # Force x86 emulation
```

### Solution 2: Install Correct ARM64 Binary
```dockerfile
# Dockerfile.dev
RUN npm install @rollup/rollup-linux-arm64-musl@4.24.0 || \
    npm install @rollup/rollup-linux-arm64-gnu@4.24.0 || \
    echo "Rollup ARM64 binary installation attempted"
```

### Solution 3: Multi-Architecture Build
```dockerfile
# Dockerfile.dev
FROM --platform=$BUILDPLATFORM node:20-alpine AS base
ARG TARGETPLATFORM

RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      npm install @rollup/rollup-linux-arm64-musl; \
    fi
```

## Impact
- Blocks all development on Apple Silicon machines
- Prevents testing and verification of other bug fixes
- Critical infrastructure issue

## Testing Requirements
- Verify dev server starts successfully
- Check that hot reload works
- Ensure no performance degradation
- Test on both ARM64 and x86 platforms

## Priority Justification
Critical - This is a complete blocker for development on Apple Silicon machines, which are increasingly common development platforms. Without fixing this, no other bugs can be properly tested or verified.