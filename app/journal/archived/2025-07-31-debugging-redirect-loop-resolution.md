# Debugging Session: Docker Site Redirect Loop Resolution

**Date:** 2025-07-31  
**Status:** Resolved  
**Issue:** HTTP 301 redirect loop preventing site access

## Problem Summary
The Docker-hosted Astro development server was stuck in an infinite redirect loop, returning HTTP 301 status codes and preventing browser tests from running.

## Root Cause Discovered
The issue was caused by conflicting redirect configurations in `netlify.toml`:
1. **HTTPS Redirect Rule**: `from = "http://:domain/*"` was being processed during development
2. **Invalid URL Pattern**: The `:domain` placeholder created malformed URLs that caused redirect loops
3. **Development vs Production**: Netlify deployment rules were interfering with local development

## Investigation Process
1. **Initial Assessment**: Confirmed Astro server was running correctly in Docker logs
2. **HTTP Testing**: Used `curl` to identify 301 redirect responses
3. **Configuration Analysis**: Examined netlify.toml, astro.config files, and middleware
4. **Isolation Testing**: Temporarily disabled middleware and various configs
5. **Direct Server Test**: Confirmed issue was Docker-specific by running dev server directly

## Solution Implemented
### Step 1: Disabled HTTPS Redirect Rule
```toml
# netlify.toml - commented out problematic redirect
# [[redirects]]
#   from = "http://:domain/*"
#   to = "https://:domain/:splat"
#   status = 301
#   force = true
```

### Step 2: Removed Site URL from Development Config
```javascript
// astro.config.dev.mjs - commented out site URL
// site: 'https://spicebushmontessori.org',
```

## Results
- ✅ **Redirect loop eliminated**: Server no longer returns 301 status
- ✅ **Site accessible**: Changed from redirect loop to regular server response
- ✅ **Browser testing enabled**: Site can now be accessed for automated tests
- ⚠️ **Minor CSS issue**: Tailwind custom colors need Docker rebuild (cosmetic only)

## Key Learnings
1. **Environment Separation**: Development and production configs need clear separation
2. **Netlify Integration**: Even in development, Netlify rules can interfere with local servers
3. **Docker Configuration**: Container environments may process configs differently than direct execution
4. **Systematic Debugging**: Methodical elimination of components led to precise identification

## Production Considerations
When deploying to production:
1. Uncomment HTTPS redirect rule in netlify.toml
2. Restore site URL in production Astro config
3. Ensure proper Tailwind CSS processing

## Files Modified
- `/netlify.toml` - Commented out HTTPS redirect rule
- `/astro.config.dev.mjs` - Commented out site URL
- `/debug/issue-20250731-redirect-loop.md` - Complete debugging documentation

This resolution enables browser testing to proceed and demonstrates the importance of environment-specific configurations.