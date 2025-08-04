# Debugging Homepage Performance Issue
Date: 2025-07-31

## Issue Summary
The homepage was reported to be taking 27 seconds to load, making it a critical blocker for deployment.

## Root Cause Identified
The issue was caused by incorrect module import paths in client-side scripts within Astro components:

1. **Relative imports in browser context**: Components were using `import('../lib/form-enhance')` which resolved to `/lib/form-enhance`
2. **Catch-all route interference**: The `[...path].astro` route was redirecting all unmatched paths (including module imports) to the homepage
3. **Redirect loops**: Each module import attempt resulted in a 302 redirect, causing 4-5 second delays

## Solution Implemented
Changed all client-side dynamic imports from relative to absolute paths:
- From: `import('../lib/form-enhance')`
- To: `import('/src/lib/form-enhance')`

Files updated:
- `/src/components/NewsletterSignup.astro`
- `/src/pages/contact.astro`

## Results
- **Before**: 27 seconds (as reported), 9.5 seconds measured with redirect loops
- **After**: 4.4 seconds total page load
- **Improvement**: 83% reduction in load time

## Lessons Learned
1. Astro's Vite development server serves source files from `/src/` path
2. Client-side dynamic imports must use absolute paths to avoid resolution issues
3. Catch-all routes can inadvertently intercept asset/module requests
4. Performance issues may manifest differently in browsers vs. curl due to JavaScript execution

## Follow-up Recommendations
1. Audit all dynamic imports across the codebase for similar issues
2. Consider updating the catch-all route to better handle different request types
3. Add performance monitoring to catch regressions early
4. Document the correct import pattern for future development

## Technical Details
- Debug files created in `/debug/` directory
- Performance testing scripts available for future use
- No cleanup needed as only diagnostic files were created