# Bug #048: Missing Collections Performance Issue Fix

## Issue
Pages taking 25+ seconds to load due to repeated errors about missing `photos` and `coming-soon` collections.

## Root Cause Analysis
The application uses a hybrid content system:
1. Some content (blog, staff, etc.) is stored in PostgreSQL database
2. Other content (photos, coming-soon) exists only as markdown files in the filesystem
3. The content-db-direct module tries to fetch ALL collections from PostgreSQL, causing errors for markdown-only collections

## Solution Approach
Make collection access conditional/optional by:
1. Creating a list of database-backed collections
2. For markdown-only collections, return empty array or null instead of querying database
3. Components that need markdown content should use Astro's native content collections directly

## Implementation Completed

### 1. Updated `content-db-direct.ts`
- Added `DATABASE_COLLECTIONS` whitelist containing only database-backed collections
- Modified `getCollection()` to return empty array for non-database collections
- Modified `getEntry()` to return null for non-database collections
- This prevents unnecessary database queries and eliminates errors

### 2. Updated `/admin/index.astro`
- Import Astro's native `getCollection` as `getAstroCollection`
- Use `getAstroCollection('photos')` instead of database query
- Updated photo stats to use `priority` field instead of non-existent `featured` field

### 3. Updated `AdminPreviewBar.astro`
- Added try-catch blocks to handle missing collections gracefully
- First attempts to get coming-soon status from database settings
- Falls back to markdown config if database fails
- Prevents errors when collections don't exist

## Results
- Eliminated "collection does not exist" errors
- Should dramatically improve page load times from 25+ seconds to normal speeds
- Maintains backward compatibility
- No data migration required

## Why This Approach
- Safest: No data migration required
- Simple: Minimal code changes (< 50 lines total)
- Compatible: Doesn't break existing functionality
- Performance: Eliminates unnecessary database queries
- Maintainable: Clear separation between database and markdown content