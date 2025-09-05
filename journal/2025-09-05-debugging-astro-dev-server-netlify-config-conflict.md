# Debugging: Astro Dev Server Netlify Configuration Conflict
Date: 2025-09-05
Status: Resolved

## Problem Summary
The Astro dev server was failing to start with the error "Base directory does not exist: /app/app". This was preventing local development from working.

## Root Cause Identified
Configuration conflict between two netlify.toml files:
- **Parent directory**: `/Users/eveywinters/CascadeProjects/SpicebushWebapp/netlify.toml` sets `base = "app"`  
- **App directory**: `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/netlify.toml` had no base setting

When running the dev server from within the app directory, Netlify combined both configurations, causing it to look for "app/app" directory which didn't exist.

## Solution Implemented
Added `base = "."` to the [build] section of the app's netlify.toml file at line 5. This overrides the parent's base setting when running from within the app directory.

### Files Modified
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/netlify.toml` - Added base directory override

### Change Details
```toml
[build]
  # Base directory (override parent config when running from app directory)
  base = "."
  
  # Build command that includes environment variables
  command = "chmod +x build-with-env.sh && ./build-with-env.sh"
```

## Testing Results
- ✅ Dev server starts successfully from app directory
- ✅ No more "Base directory does not exist" errors
- ⚠️ Netlify deployments from repository root still need verification

## Lessons Learned
1. **Multiple netlify.toml files can conflict**: When Netlify finds multiple config files in the directory hierarchy, they can interfere with each other
2. **Base directory resolution is relative**: The `base` setting is resolved relative to the current working directory, not the repository root
3. **Development vs deployment contexts**: Configuration that works for deployment may not work for local development if working directories differ

## Follow-up Actions Needed
- Verify that Netlify deployments from the repository root still work correctly
- Consider consolidating netlify.toml configurations if possible
- Document the dual-configuration setup for future reference

## Technical Details
- **Error**: `Base directory does not exist: /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/app`
- **Resolution**: Override parent config with `base = "."`
- **Tools Used**: Systematic debugging, file inspection, configuration analysis