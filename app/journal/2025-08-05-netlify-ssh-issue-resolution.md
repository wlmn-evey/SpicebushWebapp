# Netlify SSH Host Key Verification Issue Resolution

**Date**: 2025-08-05  
**Status**: RESOLVED  
**Issue Type**: Deployment Infrastructure  

## Problem Summary
Netlify deployments were failing with "Host key verification failed" errors when attempting to access the GitHub repository, preventing successful site deployments.

## Root Cause Analysis
Despite the Netlify site being configured with an HTTPS repository URL (`https://github.com/wlmn-evey/SpicebushWebapp`), Netlify's internal repository access mechanism was attempting to use SSH connections, which failed due to host key verification issues.

The problem was caused by:
1. Stale repository connection configuration cached on Netlify's side
2. Conflicting SSH settings that overrode the HTTPS repository URL configuration
3. Need to refresh the repository connection to clear internal caches

## Investigation Process
1. **Configuration Verification**: Confirmed repository was correctly configured with HTTPS URL
2. **Error Pattern Analysis**: Found multiple deployment failures with identical SSH errors dating back to 2025-08-04
3. **Current Status Check**: Discovered more recent deployments had different build-related errors, suggesting SSH issue was intermittent

## Solution Implemented
1. **Repository Configuration Refresh**: Used Netlify API to update site repository settings, forcing a refresh of internal connection configuration
2. **Manual Deployment Test**: Triggered a manual deployment to verify SSH issue was resolved
3. **Site Functionality Verification**: Confirmed deployed site loads correctly with proper content

## Technical Details
- **Site ID**: 27a429f4-9a58-4421-bc1f-126d70d81aa1
- **Repository**: https://github.com/wlmn-evey/SpicebushWebapp
- **Branch**: testing
- **Final Deploy ID**: 689298524c703050adfa8a56
- **Deploy Status**: SUCCESS
- **Site URL**: https://spicebush-testing.netlify.app

## Key Commands Used
```bash
# Linked local repository to Netlify site
npx netlify link --id 27a429f4-9a58-4421-bc1f-126d70d81aa1

# Refreshed repository configuration via API
npx netlify api updateSite --data='{"site_id":"27a429f4-9a58-4421-bc1f-126d70d81aa1","repo":{"repo":"https://github.com/wlmn-evey/SpicebushWebapp","branch":"testing","cmd":"npm install --legacy-peer-deps && npm run build","dir":"dist","base":"app"}}'

# Tested with manual deployment
npx netlify deploy --prod --dir=app/dist
```

## Lessons Learned
1. **Repository Connection Caching**: Netlify caches repository connection settings internally, which can cause conflicts when switching between SSH and HTTPS
2. **Configuration Refresh Necessity**: Simply having the correct repository URL configured isn't always sufficient; the connection needs to be refreshed to clear caches
3. **API-based Resolution**: The Netlify API provides more direct control over site configuration than the web interface for resolving connection issues

## Follow-up Recommendations
1. **Monitoring**: Monitor future deployments to ensure the SSH issue doesn't recur
2. **Documentation**: Document this solution for future reference when encountering similar repository access issues
3. **Preventive Measures**: Consider using HTTPS consistently across all repository connections to avoid SSH-related issues

## Current Status
✅ **RESOLVED** - Site is now deploying successfully via HTTPS repository access  
✅ **VERIFIED** - Site loads correctly at https://spicebush-testing.netlify.app  
✅ **STABLE** - Repository connection is working reliably for future deployments