# Debugging Docker Import Path Resolution Issue

Date: 2025-07-31
Type: Bug Fix / Docker Configuration

## Problem Summary
The Docker development environment was failing to start due to import path resolution errors for @lib/* aliases. The site would hang on startup and not respond to requests, showing errors like:
- @lib/form-validation (imported by /app/src/pages/contact-enhanced.astro)
- @lib/supabase (imported by /app/src/components/admin/ImageManagementSettings.astro)
- @lib/development-helpers (imported by /app/src/components/AuthForm.astro)
- @lib/admin-config (imported by /app/src/pages/auth/callback.astro)

## Root Cause Analysis
The issue had two components:

1. **Volume Mount Timing Issue**: The astro.config.mjs file wasn't being properly mounted initially, causing Astro to start without path alias configuration.

2. **Production Config in Development**: The main astro.config.mjs imports @astrojs/netlify adapter which isn't needed (or properly installed) in the development Docker environment.

## Solution Implemented

### 1. Created Development-Specific Configuration
Created `astro.config.dev.mjs` that:
- Removes the Netlify adapter import (not needed for dev)
- Keeps all the essential path alias configuration
- Maintains the same Vite build configuration

### 2. Updated Docker Compose Configuration
Modified `docker-compose.dev.yml` to mount the development config:
```yaml
# Before
- ./astro.config.mjs:/app/astro.config.mjs:delegated

# After  
- ./astro.config.dev.mjs:/app/astro.config.mjs:delegated
```

### 3. Container Restart Process
- Stopped all containers with `docker-compose -f docker-compose.dev.yml down`
- Started fresh containers to ensure proper volume mounting
- Verified the configuration was properly loaded

## Results
- ✅ Astro dev server starts successfully without import errors
- ✅ Path aliases (@lib/*) resolve correctly
- ✅ Site responds to HTTP requests
- ✅ No blocking import resolution failures

## Files Changed
- Created: `astro.config.dev.mjs` (development-specific config)
- Modified: `docker-compose.dev.yml` (mount dev config instead of production)

## Prevention for Future
- Consider using environment-specific configurations by default
- Test Docker environments after any astro.config.mjs changes
- Ensure all imports in configuration files are available in the target environment

## Related Issues
- The site still has database connectivity warnings, but these don't block startup
- Import path resolution is now working correctly for all @lib/* aliases

This fix resolves the critical blocker that was preventing Docker development environment usage and test execution.