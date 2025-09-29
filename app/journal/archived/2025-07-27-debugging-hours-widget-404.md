# Debugging Session: HoursWidget 404 Error
Date: 2025-07-27

## Problem Description
The HoursWidget component was stuck displaying "Loading hours..." indefinitely with a 404 error in the browser console. This occurred after the widget was recently converted from using Supabase to content collections.

## Symptoms
- Widget showed "Loading hours..." message indefinitely
- 404 error appeared in browser console
- The hours data should have been coming from src/content/hours/*.md files

## Debugging Steps Taken
1. **Examined the source code**: Checked HoursWidget.astro and confirmed it was correctly importing data from content collections and passing it via data attributes
2. **Inspected the compiled output**: Found the compiled JavaScript at `dist/_astro/HoursWidget.astro_astro_type_script_index_0_lang.CKL2i89N.js`
3. **Discovered the issue**: The compiled JavaScript still contained old Supabase import statements and database queries

## Root Cause Identified
The build output in the `dist` folder was stale. While the source code had been updated to use content collections, the compiled JavaScript still contained the old Supabase-based implementation. This caused:
- A 404 error when the browser tried to load the non-existent Supabase module
- The widget to fail data loading and remain stuck on "Loading hours..."

## Solution Implemented
The fix is simple: rebuild the application to regenerate the dist folder with the updated code.

**Required action**: Run `npm run build` to rebuild the application

## Lessons Learned
1. **Always rebuild after major changes**: When converting components from one data source to another (e.g., Supabase to content collections), always remember to rebuild the application
2. **Check compiled output**: When debugging client-side issues, don't just check the source code - also inspect the compiled output in the dist folder
3. **Clear build artifacts**: Consider adding a clean script to package.json that removes the dist folder before building to prevent stale output issues

## Follow-up Recommendations
1. Consider adding a pre-build clean step to the build script to prevent stale output
2. Document the build process for team members to ensure everyone knows to rebuild after significant changes
3. Consider setting up watch mode during development to automatically rebuild on changes