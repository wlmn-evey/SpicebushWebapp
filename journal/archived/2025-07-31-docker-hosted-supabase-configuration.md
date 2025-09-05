# Docker Configuration for Hosted Supabase

**Date**: 2025-07-31
**Summary**: Fixed Docker configuration to properly connect to hosted Supabase instance instead of attempting to run local Supabase containers

## Problem Identified

The Docker setup was experiencing database connection errors because:
1. The `docker-compose.dev.yml` file was configured to run a complete local Supabase stack
2. Environment variables were not being passed to the Docker container
3. The main `docker-compose.yml` had been simplified but lacked proper environment variable configuration
4. No health check endpoint existed for Docker container monitoring

## Root Cause Analysis

The investigation revealed that when running Docker, the system was:
- Using `docker-compose.dev.yml` which spins up local Supabase services
- Not passing the hosted Supabase credentials from `.env.local` to the container
- Missing the `/api/health` endpoint referenced in the health check

## Solution Implemented

### 1. Updated docker-compose.yml
Added comprehensive environment variable configuration to pass all Supabase and database credentials:
```yaml
environment:
  - NODE_ENV=development
  # Supabase hosted instance configuration
  - PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
  - PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
  - PUBLIC_SUPABASE_PUBLIC_KEY=${PUBLIC_SUPABASE_PUBLIC_KEY}
  - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  # Database connection
  - DB_HOST=${DB_HOST}
  - DB_PORT=${DB_PORT}
  - DB_USER=${DB_USER}
  - DB_PASSWORD=${DB_PASSWORD}
  - DB_DATABASE=${DB_DATABASE}
  # Read-only database connection
  - DB_READONLY_HOST=${DB_READONLY_HOST}
  - DB_READONLY_PORT=${DB_READONLY_PORT}
  - DB_READONLY_DATABASE=${DB_READONLY_DATABASE}
  - DB_READONLY_USER=${DB_READONLY_USER}
  - DB_READONLY_PASSWORD=${DB_READONLY_PASSWORD}
  # Strapi CMS
  - PUBLIC_STRAPI_URL=${PUBLIC_STRAPI_URL}
```

### 2. Created docker-hosted.sh Script
Created a startup script that:
- Explicitly uses the simple `docker-compose.yml` (not the dev version)
- Sources environment variables from `.env.local`
- Verifies critical variables are set before starting
- Provides clear error messages if configuration is missing

### 3. Created Health Check Endpoint
Created `/src/pages/api/health.ts` that:
- Returns a 200 OK status when the application is running
- Provides JSON response with status and timestamp
- Can be extended to include additional health checks (e.g., database connectivity)

## Configuration Clarification

### docker-compose.yml (Simple/Hosted)
- Uses only 2 services: app and mailhog
- Connects to hosted Supabase instance
- Suitable for development with external Supabase

### docker-compose.dev.yml (Complex/Local)
- Runs complete local Supabase stack (7+ services)
- Uses local database and authentication
- Suitable for offline development or testing

## Usage Instructions

To run the application with hosted Supabase:
```bash
cd app
./docker-hosted.sh
```

This ensures:
- Correct Docker configuration is used
- Environment variables are properly loaded
- Connection to hosted Supabase instance
- Health checks work properly

## Files Modified

1. `/app/docker-compose.yml` - Added environment variable configuration
2. `/app/docker-hosted.sh` - Created startup script for hosted configuration
3. `/app/src/pages/api/health.ts` - Created health check endpoint

## Verification Steps

1. Run `./docker-hosted.sh` from the app directory
2. Verify container starts without database errors
3. Check health endpoint: `curl http://localhost:4321/api/health`
4. Verify site loads at `http://localhost:4321`

## Next Steps

- Monitor container logs for any remaining connection issues
- Test database queries to ensure proper connectivity
- Consider adding more comprehensive health checks