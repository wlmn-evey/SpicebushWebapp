# Debug Session: Hours Content Management Errors
Date: 2025-07-27
Status: Active

## Problem Statement
Users are reporting errors when trying to access or manage school hours content in the admin panel at /admin/cms#/collections/hours

## Symptoms
- Errors when accessing hours collection
- Issues with CRUD operations on hours entries
- Potential schema mismatches

## Hypotheses
1. Missing or incorrect hours collection configuration in CMS
2. Database schema mismatch for hours content
3. API endpoint issues for hours collection
4. JavaScript errors in CMS frontend
5. Content type mismatch between database and CMS config

## Investigation Log

### Test 1: CMS Configuration Analysis
Result: The CMS configuration in cms.astro shows the hours collection is properly configured with fields: day, open_time, close_time, is_closed
Conclusion: CMS frontend configuration is correct

### Test 2: API Endpoint Analysis
Result: The API endpoints (entries.ts, entry.ts) expect data in a `content` table with type='hours'
Conclusion: API is using the simple unified content table approach

### Test 3: Database Schema Analysis
Result: Found conflicting migration files:
- `20250127_simple_cms_tables.sql`: Creates unified `content` table (what API expects)
- `20250727_cms_tables.sql`: Creates individual tables like `cms_hours`
- `20250629003311_long_fog.sql`: Creates and populates `school_hours` table with actual hours data

Conclusion: There are THREE different table structures for hours data:
1. `content` table (what API expects)
2. `cms_hours` table (from newer migration)
3. `school_hours` table (contains actual data)

### Test 4: API Testing
Result: API returns "Internal server error" when trying to fetch hours entries
Conclusion: The API is failing because it's looking for data in the wrong table

## Root Cause
The root cause is a database schema mismatch. The system has evolved through multiple migration approaches:
1. Original approach used a `school_hours` table with specific columns (day_of_week, start_time, end_time, etc.)
2. Simple CMS migration created a unified `content` table for all CMS data
3. Later CMS migration created individual tables like `cms_hours`

The API code expects the unified `content` table approach, but the actual hours data exists in the `school_hours` table. This mismatch causes the CMS to fail when trying to manage hours.