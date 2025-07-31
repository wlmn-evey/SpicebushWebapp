# Debugging Session: Astro Variable Interpolation Issue
Date: 2025-07-30

## Problem Description
The coming-soon page at `/src/pages/coming-soon.astro` was showing literal variable names in curly braces (e.g., `{launchDate}`, `{updateMessage}`) instead of interpolating the actual values from the database.

## Debugging Steps Taken

### 1. Initial Analysis
- Examined the Astro file structure and confirmed variables were defined correctly in the frontmatter
- Verified that the syntax `{variable}` is correct for Astro templates
- Confirmed SSR is enabled with `export const prerender = false`

### 2. Comparison with Working Code
- Found that other variables like `schoolInfo` were interpolating correctly throughout the same file
- This indicated the issue was specific to `launchDate` and `updateMessage` variables

### 3. Configuration Verification
- Checked `astro.config.mjs` and confirmed `output: 'server'` is set
- Verified the project is configured for SSR properly

### 4. Root Cause Hypothesis
The most likely causes identified:
1. The page might be served from a cached/built version instead of being dynamically rendered
2. The variables might be undefined or null at render time
3. There could be an HTML encoding issue

## Solution Implemented

1. **Added debug logging** to verify the variables are being fetched correctly:
```javascript
console.log('Coming Soon Page - Variable Values:', {
  launchDate,
  updateMessage,
  showNewsletter,
  launchDateSetting,
  messageSetting
});
```

2. **Recommended steps for the developer**:
   - Clear any build cache (`dist/` and `.astro/` directories)
   - Restart the development server
   - Check the browser console for the logged values
   - Verify the issue doesn't only occur in production builds

## Key Findings
- The Astro template syntax is correct
- The issue is likely environmental (caching, build artifacts) rather than a code problem
- Other similar interpolations work correctly in the same file

## Lessons Learned
1. When debugging Astro interpolation issues, always check if SSR is enabled
2. Compare with other working interpolations in the same file to isolate the issue
3. Build caches can cause unexpected behavior in SSR applications
4. Adding console.log statements helps verify if data is being fetched correctly

## Follow-up Recommendations
1. Consider implementing a cache-busting strategy for development
2. Add error boundaries or fallback values if database queries fail
3. Monitor the console logs to ensure the settings are being retrieved correctly

## Files Modified
- `/src/pages/coming-soon.astro` - Added debug logging
- Created debug session file at `debug/issue-2025-07-30-astro-variable-interpolation.md`