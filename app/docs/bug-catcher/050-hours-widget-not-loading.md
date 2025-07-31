# Bug #050: Hours Widget Not Loading Data

## Date: 2025-07-30

## Description
The hours widget was not displaying any data - showing an empty array instead of the school hours. The widget appeared on the page but had no hours information.

## Root Cause
Two issues were found:
1. The `hours` collection was incorrectly configured as a database collection in `content-db-direct.ts`
2. The `HoursWidget.astro` component was importing from the database module instead of Astro's content collections

## Solution Implemented
1. Removed 'hours' from the `DATABASE_COLLECTIONS` array in `/src/lib/content-db-direct.ts`
2. Updated `HoursWidget.astro` to import from 'astro:content' instead of '@lib/content-db'

## Results
- ✅ Hours widget now displays all 7 days of the week
- ✅ Hours data loads from markdown files in `/src/content/hours/`
- ✅ Widget shows proper open/close times and extended care information

## Files Modified
- `/src/lib/content-db-direct.ts` - Removed 'hours' from DATABASE_COLLECTIONS
- `/src/components/HoursWidget.astro` - Changed import to use Astro content collections

## Status: RESOLVED