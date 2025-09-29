# Hours Widget Database Fix - July 30, 2025

## Issue Summary
The hours widget was failing to load data because the 'hours' collection was configured to fetch from the database, but the hours data exists only as markdown files in `/src/content/hours/`.

## Root Cause
In `/src/lib/content-db-direct.ts`, the `DATABASE_COLLECTIONS` array included 'hours', which caused the system to attempt database queries for hours data. Since hours data is stored as markdown files (one for each day of the week), these queries would fail.

## Solution Applied
Removed 'hours' from the `DATABASE_COLLECTIONS` array in `/src/lib/content-db-direct.ts` (line 184).

### Technical Details
1. **Data Flow**: 
   - HoursWidget.astro imports from `@lib/content-db`
   - content-db.ts re-exports functions from content-cache.ts
   - content-cache.ts calls getCollectionDirect from content-db-direct.ts
   - When 'hours' is in DATABASE_COLLECTIONS, it tries to query the database
   - When 'hours' is NOT in DATABASE_COLLECTIONS, it returns an empty array, allowing Astro's content system to handle the markdown files

2. **Markdown Files Present**:
   - /src/content/hours/monday.md
   - /src/content/hours/tuesday.md
   - /src/content/hours/wednesday.md
   - /src/content/hours/thursday.md
   - /src/content/hours/friday.md
   - /src/content/hours/saturday.md
   - /src/content/hours/sunday.md

3. **Collection Schema**: Hours collection is properly defined in `/src/content/config.ts` with schema validation.

## Code Change
```typescript
// Before:
const DATABASE_COLLECTIONS = [
  'blog',
  'staff', 
  'announcements',
  'events',
  'tuition',
  'settings',
  'hours',  // <-- This was causing the issue
  'testimonials',
  'school-info'
];

// After:
const DATABASE_COLLECTIONS = [
  'blog',
  'staff', 
  'announcements',
  'events',
  'tuition',
  'settings',
  'testimonials',
  'school-info'
];
```

## Verification Steps
1. The hours widget should now load data from markdown files
2. Check that the widget displays all days of the week with proper hours
3. Verify no database errors appear in the console for hours collection

## Related Components
- `/src/components/HoursWidget.astro` - The main hours widget component
- `/src/content/config.ts` - Content collection definitions
- `/src/lib/content-db.ts` - Content database adapter
- `/src/lib/content-cache.ts` - Caching layer
- `/src/lib/content-db-direct.ts` - Direct database access (where fix was applied)