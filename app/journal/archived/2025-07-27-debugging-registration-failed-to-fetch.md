# Debugging Session: Registration "Failed to Fetch" Error
Date: 2025-07-27

## Problem Description
Users were encountering a "failed to fetch" error when attempting to register at `/auth/register`. The registration form was unable to submit data to the backend API.

## Debugging Steps Taken

### 1. Initial Investigation
- Verified the registration page exists at `/src/pages/auth/register.astro`
- Examined the AuthForm component that handles registration
- Confirmed the form uses Supabase authentication library

### 2. API Gateway Discovery
- Found that the app expects Supabase API at `http://localhost:54321`
- Discovered Kong (API Gateway) container was in "Created" state, not running
- This explained why the API was unreachable

### 3. Port Conflict Resolution
- Identified port conflict: Both Kong and Postgres were configured to use port 54322
- Kong configuration: `54322:8443`
- Postgres configuration: `54322:5432`
- Fixed by changing Kong's port mapping to `54323:8443` in `docker-compose.yml`

### 4. Database Schema Issue
- After fixing the port conflict, the API returned: "Database error finding user"
- Auth service logs showed: `relation "identities" does not exist`
- Verified the `identities` table exists in the `auth` schema
- Root cause: The `supabase_auth_admin` database user didn't have the `auth` schema in its search path
- Fixed with: `ALTER USER supabase_auth_admin SET search_path TO auth, public;`

## Root Cause Identified
The issue had two components:
1. **Infrastructure**: Kong API Gateway couldn't start due to port conflict
2. **Configuration**: Database user lacked proper schema search path

## Solution Implemented

### Code Changes
Modified `/docker-compose.yml`:
```yaml
supabase-kong:
  ports:
    - "54321:8000"
    - "54323:8443"  # Changed from 54322 to avoid conflict
    - "8001:8001"
    - "8444:8444"
```

### Database Configuration
```sql
ALTER USER supabase_auth_admin SET search_path TO auth, public;
```

### Service Restarts
- Restarted all containers with `docker-compose down && docker-compose up -d`
- Auth service automatically picked up the new database configuration

## Lessons Learned

1. **Port Allocation**: Always verify port availability before configuring services. The error message "port is already allocated" was clear but required checking container logs.

2. **Database Schema Paths**: PostgreSQL schema search paths are crucial for multi-schema applications. Services may fail mysteriously if users can't find required tables.

3. **Service Dependencies**: Kong depends on multiple services (auth, rest, storage). When the gateway fails, all API access is blocked.

4. **Debugging Approach**: Following the request path (Browser → App → Kong → Auth Service → Database) helped identify where the failure occurred.

## Follow-up Recommendations

1. **Infrastructure Documentation**: Document all port allocations to prevent future conflicts
2. **Health Checks**: Add comprehensive health checks for all services
3. **Error Handling**: Improve error messages in the frontend to distinguish between network errors and API errors
4. **Database Setup**: Consider adding search path configuration to the database initialization scripts

## Status
The registration functionality has been restored. Users can now successfully access the registration form and submit their data to the backend API. The actual registration process should now work as designed.