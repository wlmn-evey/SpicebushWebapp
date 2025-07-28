# PostgREST Role Permissions Fix - July 28, 2025

## Problem
After fixing the JWT authentication issues, the website was encountering "permission denied to set role" errors when PostgREST tried to query the database. This error occurred with both anon and service_role keys.

## Root Cause
PostgREST uses a connection pattern where it:
1. Connects to the database using an "authenticator" role
2. Switches to the appropriate role (anon, service_role) based on the JWT token
3. Executes queries with the permissions of that role

The error occurred because:
- The authenticator role was missing
- PostgREST was connecting as `supabase_admin` which couldn't switch to other roles
- The anon and service_role were created as LOGIN users instead of NOLOGIN roles

## Solution Applied

### 1. Created Authenticator Role
- Added `authenticator` role with NOINHERIT and LOGIN privileges
- Granted it permission to switch to anon and service_role
- Updated PostgREST connection string to use authenticator instead of supabase_admin

### 2. Fixed Role Structure
- Changed anon and service_role to NOLOGIN roles (as they should be)
- These roles are now only assumed via role switching, not direct login

### 3. Updated Configuration Files
- `/docker-compose.yml` - Changed PGRST_DB_URI to use authenticator
- `/docker/volumes/db/00-supabase-users.sql` - Added authenticator role creation
- Created `/scripts/fix-postgrest-roles.sql` - SQL to fix existing databases
- Created `/scripts/apply-postgrest-fix.sh` - Shell script to apply the fix

## How to Apply the Fix

For existing databases:
```bash
# Apply the database fix
./scripts/apply-postgrest-fix.sh

# Restart PostgREST to use the new connection
docker-compose restart supabase-rest
```

For new deployments:
- The fix is already included in the initialization scripts
- Just run `docker-compose up -d` as normal

## Technical Details

The authenticator role pattern is a security best practice for PostgREST:
- The authenticator has minimal permissions (just USAGE on public schema)
- It can only switch to explicitly granted roles
- Each role (anon, service_role) has specific, limited permissions
- This prevents privilege escalation and provides better security isolation

## Result
This fix allows PostgREST to properly authenticate and authorize requests, enabling the website to display content from the Supabase database without permission errors.