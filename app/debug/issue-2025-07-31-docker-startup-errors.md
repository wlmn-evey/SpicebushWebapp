# Debug Session: Docker Environment Startup Errors
Date: 2025-07-31
Status: Active

## Problem Statement
User reports errors when opening the site in Docker. Need to identify all startup and runtime errors.

## Symptoms
- Errors appear when opening the site in Docker
- Specific symptoms to be determined through investigation

## Hypotheses
1. Missing dependencies or incorrect package versions
2. Environment configuration issues
3. Database connection problems
4. Port conflicts or networking issues
5. Volume mounting problems
6. Missing or misconfigured environment variables

## Investigation Log
### Test 1: Docker Environment Startup
Result: Multiple containers started but auth container failing
Key findings:
- mailhog container: Platform warning (linux/amd64 vs linux/arm64/v8) but running
- supabase-db container: Healthy
- supabase-auth container: Failing with "ERROR: must be owner of table users"
- app container: Started but has some vite module runner warnings
- Site responds with 301 redirect on curl

### Test 2: Auth Container Investigation
The supabase-auth container is repeatedly failing with:
```
ERROR: must be owner of table users (SQLSTATE 42501)
```
This indicates the auth migrations are trying to modify tables but the user doesn't have ownership permissions.

### Test 3: App Container Investigation
The app container is failing to start with:
```
Cannot find module '@astrojs/netlify' imported from '/app/astro.config.mjs'
```
This is causing the app container to continuously restart.

### Test 4: Container Status Check
Current container statuses:
- app-supabase-kong-1: Created (not started)
- app-supabase-storage-1: Restarting continuously
- app-app-1: Restarting continuously
- app-supabase-auth-1: Restarting continuously
- app-supabase-rest-1: Running
- app-supabase-db-1: Running (healthy)
- app-mailhog-1: Running

### Test 5: Site Access Test
When attempting to access the site at http://localhost:4321/:
- Getting infinite redirect loop (301 redirects to itself)
- Found issue in src/pages/[...path].astro which unconditionally redirects to '/'

### Test 6: Storage Container Investigation
The storage container is failing with:
```
Error: Migration failed. Reason: relation "storage.objects" does not exist
```
The storage schema initialization SQL exists but has naming conflicts.

### Test 7: Database Init Files Investigation
Found issues in docker/volumes/db/:
- Multiple files named 01-*.sql (auth-schema and storage-init)
- Directories named jwt.sql, realtime.sql, etc. instead of files
- The docker-compose.yml comments indicate these should be files but they're directories

## Root Cause
Multiple critical issues preventing Docker startup:

1. **Missing npm package**: @astrojs/netlify is not installed in the Docker container despite being in package.json
2. **Database initialization order conflict**: Multiple 01-*.sql files causing initialization problems
3. **Auth permissions issue**: supabase_auth_admin user doesn't have ownership of auth tables
4. **Storage schema not created**: Storage container expects tables that aren't created due to init order
5. **Infinite redirect loop**: Catch-all route [...path].astro redirects everything to '/'
6. **Platform compatibility**: mailhog image is linux/amd64 but running on arm64 (warning only)

## Solution
### Critical Fixes Required

#### Step 1: Fix npm dependencies in Docker
Agent: code-reviewer
Instructions: 
- Verify if @astrojs/netlify is needed for development mode
- If not needed, create a development-specific astro config
- If needed, ensure it's installed in the Docker image

#### Step 2: Fix database initialization files
Agent: database-migration-specialist
Instructions:
- Rename 01-storage-init.sql to 02-storage-init.sql to fix ordering conflict
- Remove empty directories (jwt.sql, realtime.sql, etc.) that should be files
- Ensure proper execution order for all SQL files

#### Step 3: Fix auth permissions
Agent: database-migration-specialist
Instructions:
- Update 01-auth-schema.sql to ensure proper ownership
- Add ALTER TABLE commands to grant ownership to supabase_auth_admin

#### Step 4: Fix infinite redirect
Agent: frontend-developer
Instructions:
- Remove or fix the catch-all route in src/pages/[...path].astro
- Implement proper 404 handling instead of redirecting everything

#### Step 5: Update Docker configuration
Agent: devops-engineer
Instructions:
- Consider using platform-specific images or multi-platform builds
- Add proper health checks for all services
- Ensure proper dependency ordering

## Verification
- [ ] All Docker containers start without errors
- [ ] No infinite redirect loops
- [ ] Auth system initializes properly
- [ ] Storage system initializes properly
- [ ] Site loads correctly at http://localhost:4321