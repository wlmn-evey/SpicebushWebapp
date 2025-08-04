# Debug Session: Homepage 27-Second Load Time
Date: 2025-07-31
Status: Resolved

## Problem Statement
The homepage is taking 27 seconds to load, which is critically unacceptable for production deployment.

## Symptoms
- Homepage load time: 27 seconds
- Unknown if consistent or intermittent
- Unknown if affecting all pages or just homepage
- Critical blocker for deployment

## Hypotheses
1. Database query performance issues (N+1 queries, missing indexes, slow queries)
2. External API calls blocking page load
3. Large unoptimized assets (images, JS bundles, CSS)
4. Server-side rendering performance issues
5. Docker container resource constraints
6. Network/DNS resolution issues
7. Memory leaks or excessive garbage collection

## Investigation Log

### Test 1: Basic curl performance test
Result: Homepage loads in 3.3 seconds via curl
Conclusion: Issue is more severe in browsers than in curl

### Test 2: Browser performance test with Playwright
Result: 
- Total page load: 9.5 seconds
- Main culprit: `/lib/form-enhance` request taking 4.5 seconds
- 25 resources loaded total

### Test 3: Check network request for /lib/form-enhance
Result: Returns HTTP 302 redirect to `/`
Conclusion: The catch-all route is intercepting asset requests

### Test 4: Examine catch-all route
Result: Found `src/pages/[...path].astro` with:
```astro
return Astro.redirect('/');
```
This is redirecting ALL unmatched routes to homepage, including static assets!

## Root Cause
The performance issue was caused by incorrect module import paths in client-side scripts:
1. Components were using relative imports like `../lib/form-enhance`
2. These resolved to `/lib/form-enhance` in the browser
3. The catch-all route redirected these to the homepage, causing infinite redirect loops
4. Each failed import attempt added 4-5 seconds to the page load

## Solution
### Step 1: Fix import paths in components
Changed relative imports from:
```javascript
const { enhanceForm } = await import('../lib/form-enhance');
```
To absolute imports:
```javascript
const { enhanceForm } = await import('/src/lib/form-enhance');
```

Applied fixes to:
- `/src/components/NewsletterSignup.astro`
- `/src/pages/contact.astro`

### Step 2: Verify fix
- Import paths now resolve correctly (200 status in 0.018s)
- No more redirect loops
- Page load time reduced from 27s to 4.4s

## Verification
- Before fix: 27 seconds (reported), 9.5 seconds (measured with redirect loops)
- After fix: 4.4 seconds total load time
- No slow resources detected (all under 500ms)
- All module imports loading correctly

## Lessons Learned
- Always use absolute paths for client-side dynamic imports in Astro
- Catch-all routes can interfere with asset loading if not properly configured
- Browser DevTools network tab is essential for diagnosing performance issues