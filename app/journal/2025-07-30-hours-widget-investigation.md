# Hours Widget Investigation Report

**Date:** July 30, 2025
**Task:** Investigate hours widget not properly running
**Status:** Issue Identified - Database Connection Problem

## Executive Summary

The hours widget is not displaying hours data because it's receiving empty data from the content collection system. The root cause is that the application is trying to fetch data from a PostgreSQL database (Supabase) but the database connection is not properly configured in the current development environment.

## Test Results

### 1. Widget Presence and Rendering
✅ **Widget HTML is rendered** on all pages tested:
- Home page
- Contact page  
- About page
- Admissions page

### 2. Data Loading Issue
❌ **No hours data is being loaded**:
- `dataLength: 0` - The widget receives an empty array
- Widget shows fallback/default hours instead of database content
- All 7 days are displayed but using hardcoded fallback data

### 3. JavaScript Functionality
✅ **Client-side JavaScript is working**:
- Current time displays correctly
- Legend shows properly
- Visual bars render (using fallback data)
- No critical JavaScript errors preventing execution

### 4. Console Errors Observed
⚠️ **Module loading errors**:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html"
```
This appears to be related to the `/lib/form-enhance` module on the contact page.

### 5. Database Connection Issue
❌ **Database environment variables not accessible**:
- The application expects `DB_READONLY_USER` and `DB_READONLY_PASSWORD` 
- These are set in docker-compose.yml but not accessible to Astro
- Bug #047 documents this issue in detail

## Root Cause Analysis

The hours widget issue is caused by a chain of problems:

1. **Primary Issue**: The `getCollection('hours')` function in `content-db.ts` delegates to `content-db-direct.ts`
2. **Database Connection**: `content-db-direct.ts` tries to connect to PostgreSQL but fails due to missing environment variables
3. **Fallback Behavior**: When database connection fails, the system returns empty data
4. **Widget Response**: The HoursWidget component receives empty data and uses hardcoded fallback hours

## Current Data Flow

```
HoursWidget.astro
  └─> getCollection('hours') from @lib/content-db
      └─> content-cache.ts
          └─> getCollectionDirect() from content-db-direct.ts
              └─> PostgreSQL connection (FAILS - env vars not accessible)
                  └─> Returns empty array []
```

## Hours Content Files

The hours markdown files exist at `/src/content/hours/`:
- monday.md through sunday.md
- Each file contains proper frontmatter with hours data
- But these files are not being used due to the database-first architecture

## Impact Assessment

1. **User Experience**: Users see generic fallback hours instead of actual school hours
2. **Data Accuracy**: Displayed hours may not match actual school schedule
3. **Consistency**: Hours data in markdown files is not being utilized

## Key Finding

The `hours` collection is configured in `DATABASE_COLLECTIONS` array in `content-db-direct.ts`, which forces it to try fetching from the PostgreSQL database. Since the database connection fails due to environment variable issues, it returns an empty array instead of reading from the existing markdown files.

## Debug Mode Results

When running with `?debug=true`:
- Data source: "content-collection" 
- Days loaded: 0
- Holidays found: 0
- API requests: Only fetches holidays from date.nager.at API
- No database connection attempts visible in network tab

## Recommendations

### Immediate Fix (Quick)
1. **Option A**: Remove `'hours'` from the `DATABASE_COLLECTIONS` array in `content-db-direct.ts` to force it to read from markdown files
2. **Option B**: Set up proper database connection with environment variables (more complex)

### Suggested Quick Fix

Edit `/src/lib/content-db-direct.ts` line 184:
```typescript
const DATABASE_COLLECTIONS = [
  'blog',
  'staff', 
  'announcements',
  'events',
  'tuition',
  'settings',
  // 'hours',  // Comment out or remove this line
  'testimonials',
  'school-info'
];
```

This will make the system skip the database for hours and allow the markdown files in `/src/content/hours/` to be used instead.

### Long-term Solution
1. **Implement proper fallback logic**: Modify the content system to try database first, then fall back to markdown files
2. **Fix environment variable access**: Ensure database credentials are available in server context without exposing them
3. **Unify data sources**: Decide on a single source of truth for each content type

## Test Evidence

### Screenshot Analysis
- `hours-widget-home-page.png`: Shows widget with 7 days displayed but using fallback data
- Widget styling and layout render correctly
- Current time indicator works properly

### Browser Console Logs
```
Widget data: {
  "hasDataAttribute": true,
  "dataLength": 0,  // ← Empty data array
  "loadingVisible": false,
  "hoursListVisible": true,
  "hoursListItems": 7,
  "currentTimeDisplayed": "1:03 PM",
  "debugMode": false
}
```

## Related Issues

- **Bug #047**: DB_READONLY environment variables not accessible in Astro
- **Bug #048**: Astro content collections not loading properly in Docker
- Previous debugging sessions documented similar data loading issues

## Next Steps

1. Decide on data source strategy (database vs markdown files)
2. Implement proper environment variable handling for database connection
3. Add fallback logic to use markdown files when database is unavailable
4. Test the solution in both Docker and local development environments
5. Update documentation to clarify the data flow for hours content

## Files Involved

- `/src/components/HoursWidget.astro` - The widget component
- `/src/lib/content-db.ts` - Content database adapter
- `/src/lib/content-db-direct.ts` - Direct database connection
- `/src/content/hours/*.md` - Hours markdown files (not currently used)
- `/docker-compose.yml` - Environment variable configuration