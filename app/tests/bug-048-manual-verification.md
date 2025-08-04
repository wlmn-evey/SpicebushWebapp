# Bug #048 Manual Verification Checklist

## Overview
Bug #048 caused pages to take 25+ seconds to load due to repeated database queries for non-existent collections (`photos` and `coming-soon`). The fix implements a whitelist in `content-db-direct.ts` to prevent unnecessary database queries.

## Prerequisites
- [ ] Application is running locally (`npm run dev`)
- [ ] Browser developer tools open (Console tab visible)
- [ ] Database is accessible

## Verification Steps

### 1. Performance Verification

#### Homepage Load Time
- [ ] Navigate to http://localhost:4321/
- [ ] Page loads in **less than 5 seconds**
- [ ] No spinning loader for extended periods
- [ ] Content appears promptly

#### Admin Dashboard Load Time  
- [ ] Navigate to http://localhost:4321/admin
- [ ] Page loads in **less than 5 seconds**
- [ ] Photo statistics load correctly (or show appropriate message)
- [ ] All admin features are accessible

### 2. Console Error Verification

#### Check for Collection Errors
- [ ] Open browser console (F12)
- [ ] Refresh the homepage
- [ ] **NO errors** containing:
  - "relation \"public.photos\" does not exist"
  - "relation \"public.coming-soon\" does not exist"
  - "collection does not exist"
  
#### Expected Console Output
- [ ] You should see messages like:
  - "Collection 'photos' is not database-backed, returning empty array"
  - "Collection 'coming-soon' is not database-backed, returning null for entry"
- [ ] These are **informational logs**, not errors

### 3. Functionality Verification

#### Database-Backed Collections Still Work
- [ ] Navigate to /blog - Blog posts display correctly
- [ ] Navigate to /about - Staff members display correctly
- [ ] Check footer - Announcements/hours display if configured

#### Markdown Collections Still Work
- [ ] Navigate to pages that use markdown content
- [ ] Content displays correctly even though not in database
- [ ] No errors about missing content

### 4. Network Tab Verification

#### Check Database Requests
- [ ] Open Network tab in developer tools
- [ ] Filter by XHR/Fetch requests
- [ ] Refresh page
- [ ] **Verify**: No repeated failed requests for photos/coming-soon
- [ ] **Verify**: Reasonable number of total requests (< 50)

### 5. Admin Features Verification

#### Photo Management
- [ ] Navigate to /admin
- [ ] Photo section displays correctly
- [ ] If photos exist in markdown, they should be counted
- [ ] No database errors when accessing photo features

#### Coming Soon Toggle
- [ ] Admin preview bar shows coming soon status
- [ ] Toggle works without errors
- [ ] Status persists correctly

## Performance Metrics

### Before Fix
- Page load time: **25+ seconds**
- Console errors: Multiple "relation does not exist" errors
- Database queries: Hundreds of failed queries
- User experience: Unusable

### After Fix (Expected)
- Page load time: **< 2 seconds** (typically)
- Console errors: None related to collections
- Database queries: Only for valid collections
- User experience: Smooth and responsive

## Test Commands

### Automated Tests
```bash
# Run all Bug #048 tests
./test-bug-048.sh

# Or run individual test suites
npm test tests/bug-048-performance-fix.test.ts
npm test tests/bug-048-performance-benchmark.test.ts  
npm test tests/bug-048-integration.test.ts
```

### Manual Performance Test
```bash
# Time page load from command line
time curl -s http://localhost:4321 > /dev/null

# Should complete in < 2 seconds
```

## Troubleshooting

If pages still load slowly:
1. Check that `content-db-direct.ts` has the `DATABASE_COLLECTIONS` whitelist
2. Verify the whitelist includes only database-backed collections
3. Check for other performance issues (large images, slow queries, etc.)
4. Review browser console for any remaining errors

## Sign-off

- [ ] All automated tests pass
- [ ] Manual verification complete
- [ ] Performance is acceptable (< 5 second loads)
- [ ] No collection-related errors in console
- [ ] Admin functionality works correctly

**Bug #048 Status**: ✅ FIXED / ❌ NOT FIXED

**Verified by**: _____________  
**Date**: _____________  
**Notes**: _____________