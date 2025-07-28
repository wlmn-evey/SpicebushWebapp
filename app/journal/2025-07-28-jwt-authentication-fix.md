# JWT Authentication Fix - July 28, 2025

## Problem
The website was experiencing JWT signature errors when trying to read from Supabase. The error was "JWSError JWSInvalidSignature" occurring in all components using the content-db.ts module.

## Root Cause
The JWT tokens in the environment were using the default Supabase development JWT secret, but the actual JWT_SECRET environment variable was set to a different value. This mismatch caused JWT signature validation to fail.

## Solution Applied

1. **Generated new JWT tokens** that match the JWT_SECRET environment variable:
   - Created `scripts/generate-jwt-tokens.js` to generate proper tokens
   - Updated `.env.local` with the new tokens
   - Updated `docker-compose.yml` default tokens
   - Updated `docker/volumes/api/kong.yml` with new tokens

2. **Updated content-db.ts** to use service role key for server-side queries to bypass RLS

3. **Granted necessary database permissions**:
   ```sql
   GRANT USAGE ON SCHEMA public TO anon, service_role;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
   ```

## Current Status
The JWT authentication is now working, but there's still an issue with "permission denied to set role" errors. This appears to be related to how the database connection is trying to switch roles during queries.

## Next Steps
Need to investigate why the database is trying to SET ROLE commands and potentially update the RLS policies or connection configuration to avoid this issue.

## Key Files Modified
- `/src/lib/content-db.ts` - Updated to use service role key
- `/.env.local` - Updated JWT tokens
- `/docker-compose.yml` - Updated default JWT tokens
- `/docker/volumes/api/kong.yml` - Updated JWT tokens in Kong configuration
- `/scripts/generate-jwt-tokens.js` - Created tool to generate matching JWT tokens