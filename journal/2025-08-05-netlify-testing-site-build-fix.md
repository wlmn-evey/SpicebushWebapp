# Netlify Testing Site Build Failure Analysis and Fix

**Date**: 2025-08-05  
**Deploy ID**: 68924a34313a7f0008c93934  
**Site ID**: 27a429f4-9a58-4421-bc1f-126d70d81aa1  
**Site Name**: spicebush-testing  

## Problem Analysis

### Issue Identified
The Netlify testing site deployment was failing with error:
```
Failed during stage 'building site': Build script returned non-zero exit code: 2
```

### Root Cause
The testing site was configured to build from the repository root directory, but:

1. **Root package.json** - Only contained test dependencies, no Astro build scripts
2. **App package.json** - Located in `/app/` subdirectory, contains proper build configuration
3. **Missing base directive** - No `base = "app"` configuration in netlify.toml for root-level builds

### Directory Structure Issue
```
SpicebushWebapp/
├── package.json          # ❌ No build scripts
├── app/
│   ├── package.json      # ✅ Has "build": "astro build"
│   ├── netlify.toml      # ✅ Configured but for app-level deployment
│   └── src/              # ✅ Astro source files
└── netlify.toml          # ❌ Missing (needed for root-level deployment)
```

## Solution Implemented

### 1. Created Root-Level netlify.toml
Created `/netlify.toml` with:
```toml
[build]
  base = "app"
  command = "npm run build"
  publish = "dist"
  environment = { NODE_VERSION = "20", NPM_FLAGS = "--prefix=/dev/null" }
```

### 2. Updated App-Level netlify.toml
Added `base = "app"` directive to `/app/netlify.toml` for consistency.

### 3. Site Configuration Context
- **Main site** (f65d1828-9206-42f8-9b59-5ada4336f8b7): Uses `/app/netlify.toml`
- **Testing site** (27a429f4-9a58-4421-bc1f-126d70d81aa1): Uses root `/netlify.toml`

## Expected Outcome

The next deployment should:
1. Use the correct base directory (`app/`)
2. Find the proper package.json with build scripts
3. Execute `npm run build` successfully
4. Deploy the generated `dist/` folder

## Verification Steps

1. Trigger a new deployment to testing site
2. Check build logs for successful `npm run build` execution
3. Verify site loads at https://spicebush-testing.netlify.app

## Files Modified

- `/netlify.toml` - Created new configuration for testing site
- `/app/netlify.toml` - Added base directory directive

## Technical Notes

- Testing site uses branch-deploy context for `testing` branch
- Both configurations include security headers and CSP policies
- Build uses Node.js 20 as specified in environment settings