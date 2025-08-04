# Debug Session: Docker Environment Startup Errors
Date: 2025-07-31
Status: Resolved - Issues Identified

## Problem Statement
User reported errors when opening the site in Docker. Multiple containers were failing to start or continuously restarting.

## Symptoms
- app-app-1 container: Restarting continuously
- app-supabase-auth-1 container: Restarting continuously  
- app-supabase-storage-1 container: Restarting continuously
- app-supabase-kong-1 container: Never started
- Site showing infinite redirect loop when accessed

## Investigation Summary
Conducted systematic investigation of each failing container and discovered multiple interconnected issues:

1. **App Container**: Missing @astrojs/netlify module despite being in package.json
2. **Auth Container**: Database permission errors - auth user doesn't own tables
3. **Storage Container**: Missing storage schema tables
4. **Database Init**: Conflicting file names and directories instead of files
5. **Site Access**: Infinite redirect loop due to catch-all route

## Root Causes Identified

### 1. Missing NPM Package
- @astrojs/netlify adapter is imported in astro.config.mjs
- Package is listed in package.json but not installed in Docker container
- Causes immediate crash on startup

### 2. Database Initialization Issues
- Multiple files with same prefix (01-auth-schema.sql, 01-storage-init.sql)
- Empty directories named as SQL files (jwt.sql, realtime.sql are directories)
- Storage schema not initialized before storage container starts

### 3. Permission Problems
- supabase_auth_admin user created but doesn't own auth schema tables
- Causes auth container migrations to fail

### 4. Routing Issue
- src/pages/[...path].astro contains unconditional redirect to '/'
- Creates infinite redirect loop for all requests

### 5. Platform Compatibility
- mailhog image is linux/amd64 running on arm64 host (warning only)

## Comprehensive Issue List

1. **Critical - App Won't Start**
   - Missing @astrojs/netlify in Docker container
   - Fix: Either install package or use dev-specific config

2. **Critical - Auth System Broken**
   - Auth migrations fail due to permissions
   - Fix: Grant proper ownership in SQL scripts

3. **Critical - Storage System Broken**
   - Storage tables don't exist when container starts
   - Fix: Rename storage init to run before services start

4. **Critical - Site Inaccessible**
   - Infinite redirect loop on all pages
   - Fix: Remove or fix catch-all route

5. **High - Database Init Conflicts**
   - Multiple 01-*.sql files
   - Empty directories instead of SQL files
   - Fix: Clean up and properly order init files

6. **Medium - Container Dependencies**
   - Kong container never starts (depends on failing auth)
   - Fix: Will resolve when auth is fixed

7. **Low - Platform Warning**
   - mailhog image architecture mismatch
   - Fix: Use multi-platform image or ignore warning

## Next Steps
Created detailed fix instructions for each specialized agent to resolve these issues. The fixes need to be applied in order:

1. Fix database initialization files first
2. Fix auth permissions 
3. Fix npm dependencies
4. Fix routing issue
5. Verify all services start correctly

## Lessons Learned
- Docker initialization order is critical for dependent services
- File naming conflicts in init directories cause silent failures
- Missing dependencies in Docker can be hard to debug without proper logging
- Catch-all routes need careful implementation to avoid loops

## Cleanup
- Removed temporary test files
- Kept debug/issue-2025-07-31-docker-startup-errors.md for reference
- All diagnostic information preserved in this journal entry