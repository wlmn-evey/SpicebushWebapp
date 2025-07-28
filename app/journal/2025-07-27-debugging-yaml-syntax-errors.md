# Debugging Session: YAML Syntax Errors in Admin Panel
Date: 2025-07-27

## Problem Description
Users were encountering "YAMLSyntaxError" messages when trying to access content management areas in the admin panel. The errors were appearing across multiple content sections.

## Debugging Steps Taken
1. Checked `/src/pages/admin/cms.astro` - Found it uses inline JavaScript configuration, not YAML
2. Examined `/public/js/simple-cms-backend.js` - No YAML parsing logic found
3. Discovered legacy file `/public/admin/index.html` with problematic configuration
4. Searched entire src directory for YAML references - none found
5. Tested routing behavior - confirmed static file is still accessible

## Root Cause Identified
The issue was caused by a legacy `/public/admin/index.html` file that still exists in the public directory. This file contains:
```javascript
CMS.init({
  config: {
    load_config_file: true,
    local_backend: true
  }
});
```

The `load_config_file: true` setting instructs Decap CMS to look for a `config.yml` file that doesn't exist, causing YAML parsing errors.

## Solution Implemented
The solution requires removing the legacy admin/index.html file to ensure all admin traffic goes through the proper `/admin/cms` route which has inline configuration.

## Lessons Learned
1. Legacy files in public directories can cause unexpected conflicts with new implementations
2. Static files bypass Astro routing and can be accessed directly
3. Browser caching can cause users to continue accessing old URLs
4. When migrating from file-based to inline configuration, ensure all old configuration files are removed

## Follow-up Recommendations
1. Implement a cleanup task to remove all legacy CMS files
2. Consider adding redirects for old admin URLs to prevent confusion
3. Document the new admin URL structure for users
4. Add a check in the deployment process to prevent legacy files from being deployed

## Related Files
- Debug log: `/debug/issue-2025-07-27-yaml-syntax-errors.md`
- Main CMS page: `/src/pages/admin/cms.astro`
- Legacy file to remove: `/public/admin/index.html`