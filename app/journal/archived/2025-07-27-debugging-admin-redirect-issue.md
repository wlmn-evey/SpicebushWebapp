# Debugging Session: Admin Login Redirect Issue
Date: 2025-07-27

## Problem Description
The admin login button on the coming soon page was redirecting back to the same page instead of going to /admin. Users clicking "Admin Login" were stuck in a redirect loop.

## Symptoms
- Clicking "Admin Login" button redirected to /coming-soon
- Expected behavior was to navigate to /admin page
- Issue occurred only when coming soon mode was enabled

## Debugging Steps Taken
1. **Examined middleware.ts** - Verified that /admin was in the bypass paths
2. **Checked coming-soon.astro** - Confirmed the link was correctly pointing to /admin
3. **Verified route existence** - Found /admin/index.astro exists
4. **Tested path matching logic** - Confirmed the middleware logic was working correctly
5. **Analyzed admin page** - Discovered client-side auth check that redirects to /auth/login
6. **Identified root cause** - /auth paths were not in the bypass list

## Root Cause Identified
The middleware was correctly allowing /admin to bypass the coming soon redirect. However, the /admin page has client-side authentication that redirects unauthenticated users to /auth/login. Since /auth paths were not in the bypassPaths array, the middleware intercepted this redirect and sent users to /coming-soon instead.

This created a redirect chain: /admin → /auth/login → /coming-soon

## Solution Implemented
Added '/auth' to the bypassPaths array in middleware.ts (line 17). This allows all authentication-related pages to bypass the coming soon redirect.

```typescript
const bypassPaths = [
  '/coming-soon',
  '/coming-soon-comprehensive',
  '/admin',
  '/auth',  // Added this line
  '/api',
  '/uploads',
  '/_image',
  '/favicon.svg',
  '/images/'
];
```

## Lessons Learned
1. **Follow the full redirect chain** - The issue wasn't with the initial /admin bypass but with the subsequent /auth/login redirect
2. **Consider authentication flows** - When debugging admin areas, always check how authentication redirects work
3. **Middleware bypass paths should be comprehensive** - Include all related paths that might be part of a user flow

## Follow-up Recommendations
1. Consider adding comments in middleware.ts explaining why each bypass path is included
2. Test other admin flows to ensure they work correctly with coming soon mode
3. Document the expected behavior when unauthenticated users click "Admin Login"

## Files Modified
- `/src/middleware.ts` - Added '/auth' to bypassPaths array

## Testing Checklist
- [ ] Click "Admin Login" as unauthenticated user - should go to /auth/login
- [ ] Click "Admin Login" as authenticated admin - should go to /admin
- [ ] Verify all /auth/* pages are accessible in coming soon mode
- [ ] Ensure no redirect loops occur