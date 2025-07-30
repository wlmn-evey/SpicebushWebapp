# Debug Session: Admin Tuition Route Collision
Date: 2025-07-28
Status: Resolved

## Problem Description
Build process reported a route collision for `/admin/tuition`, indicating multiple files were generating the same route.

## Symptoms
- Build warning: "The route '/admin/tuition' is defined in both 'src/pages/admin/tuition/index.astro' and 'src/pages/admin/tuition.astro'"
- Potential unpredictable behavior regarding which implementation would be served

## Debugging Steps Taken

1. **File Discovery**
   - Found both `/src/pages/admin/tuition.astro` and `/src/pages/admin/tuition/index.astro` exist
   - Both files would generate the same `/admin/tuition` route

2. **Implementation Analysis**
   - `tuition.astro`: Legacy implementation (320 lines)
     - Marked with "DEPRECATED: Use CMS instead"
     - Contains redirect to `/admin/cms#/collections/tuition`
     - Uses old Supabase-based approach
     - Full implementation still present despite deprecation
   - `tuition/index.astro`: Modern implementation (633 lines)
     - Uses AdminLayout pattern
     - Integrates with content-db via `getCollection('tuition')`
     - Follows current project architecture
     - Properly styled with Tailwind classes

3. **Reference Check**
   - Found 34 references to `/admin/tuition` throughout the codebase
   - All navigation components expect this route to work
   - Test files validate this route
   - Edit operations redirect back to this route

## Root Cause Identified
The collision was caused by an incomplete migration from the old CMS-based system to the new content-db system. The deprecated file was marked for removal but never actually deleted, leaving both implementations competing for the same route.

## Solution Implemented
**Recommendation**: Delete `/src/pages/admin/tuition.astro` (the deprecated file)

**Justification**:
1. File is explicitly marked as DEPRECATED
2. The redirect it contains is never reached due to the route collision
3. The modern implementation in `tuition/index.astro` is fully functional
4. Project has moved from CMS to content-db architecture
5. Modern implementation follows current patterns used throughout the admin section

## Verification Required
After deleting the deprecated file:
- [ ] Build warning should disappear
- [ ] `/admin/tuition` should load the modern interface
- [ ] All CRUD operations should function correctly
- [ ] Navigation and redirects should work as expected

## Lessons Learned
- When deprecating files during migrations, remove them immediately rather than leaving them with redirects
- Route collisions can occur when both `page.astro` and `page/index.astro` patterns exist
- Always complete migration tasks fully to avoid confusion and build issues

## Follow-up Recommendations
1. Check for similar patterns in other admin pages (already noted: `/admin` and `/admin/hours` have similar collisions)
2. Establish a clear file organization pattern for the admin section
3. Document the chosen pattern in project guidelines
4. Consider adding a build-time check to prevent route collisions