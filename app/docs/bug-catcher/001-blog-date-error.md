---
id: 001
title: "Blog Date toISOString Error"
severity: critical
status: open
category: functionality
affected_pages: ["/blog", "/", "all pages with RecentBlogPosts component"]
related_bugs: [002, 019]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 001: Blog Date toISOString Error

## Description
The blog functionality is completely broken due to a JavaScript error where `date.toISOString is not a function`. This prevents any blog pages from loading and causes the RecentBlogPosts component to fail wherever it's used.

## Steps to Reproduce
1. Navigate to `/blog` or any page containing the RecentBlogPosts component
2. Page fails to load with JavaScript error
3. Browser console shows: `TypeError: date.toISOString is not a function`

## Expected Behavior
- Blog pages should load successfully
- RecentBlogPosts component should display the 3 most recent blog posts
- Dates should be properly formatted and displayed

## Actual Behavior
- Pages containing blog functionality throw JavaScript error
- Blog content is completely inaccessible
- Users see error page or blank content area

## Error Messages/Stack Traces
```
TypeError: date.toISOString is not a function
    at RecentBlogPosts.astro:75
    at blog.astro:132
```

## Affected Files
- `/src/components/RecentBlogPosts.astro` (line 75)
- `/src/pages/blog.astro` (line 132)
- `/src/pages/blog/[slug].astro` (similar date handling)
- Any page importing RecentBlogPosts component

## Potential Causes
1. **Data Type Mismatch**: The `date` field from the database might be returning as a string instead of a Date object
2. **Missing Date Parsing**: Need to parse date strings into Date objects before calling Date methods
3. **Database Schema Issue**: The date field might be stored in an incompatible format
4. **Content Migration Issue**: Dates may have been incorrectly migrated from the previous CMS

## Suggested Fixes

### Option 1: Add Date Parsing (Recommended)
```javascript
// In RecentBlogPosts.astro, before line 75
const dateObj = new Date(date);
<time class="text-sm text-gray-500" datetime={dateObj.toISOString()}>
  {dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}
</time>
```

### Option 2: Safe Date Handling
```javascript
// Create a utility function
function formatDate(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return new Date(); // fallback to current date
  }
  return dateObj;
}

// Use in component
const safeDate = formatDate(date);
<time datetime={safeDate.toISOString()}>
```

### Option 3: Update Database Query
Ensure the database query in `getCollection('blog')` returns proper Date objects or includes date parsing.

## Testing Requirements
1. Verify blog pages load without errors
2. Check that dates display correctly in all formats
3. Test with various date formats from the database
4. Ensure RecentBlogPosts works on all pages where it's used
5. Verify SEO datetime attributes are valid ISO strings

## Related Issues
- Bug #002: Server errors might be partially caused by this blog error
- Bug #019: API endpoint error handling should catch and handle date parsing errors

## Additional Notes
- This is a critical issue as it completely breaks blog functionality
- The fix should include proper error handling to prevent future date-related crashes
- Consider adding date validation during content creation/editing
- May need to audit all date handling throughout the application