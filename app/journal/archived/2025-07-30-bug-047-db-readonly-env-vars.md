# Bug #047: DB_READONLY Environment Variables Not Accessible in Astro

## Bug Summary
- **Date**: 2025-07-30
- **Severity**: CRITICAL
- **Impact**: Complete site failure - no pages load
- **Root Cause**: Astro/Vite requires PUBLIC_ prefix for client-accessible env vars, but DB_READONLY_* vars are not prefixed

## Problem Analysis

### Current Setup
1. **Docker Compose** sets DB_READONLY_* environment variables:
   - DB_READONLY_HOST=supabase-db
   - DB_READONLY_PORT=5432
   - DB_READONLY_DATABASE=postgres
   - DB_READONLY_USER=postgres
   - DB_READONLY_PASSWORD=${POSTGRES_PASSWORD}

2. **content-db-direct.ts** attempts to read these variables using a custom `getEnvVar` function that checks both `import.meta.env` and `process.env`

3. **Error**: "DB_READONLY_USER environment variable is required" - the app crashes at startup because Astro cannot see non-PUBLIC_ prefixed env vars

### Root Cause
- Astro/Vite only exposes environment variables prefixed with `PUBLIC_` to the client-side code
- Server-side environment variables (without PUBLIC_ prefix) are only available during SSR/build time
- The `content-db-direct.ts` file is being imported/used in a context where it needs PUBLIC_ prefixed variables

## Solution Options

### Option 1: Add PUBLIC_ Prefix (Security Risk)
- Change all DB_READONLY_* to PUBLIC_DB_READONLY_*
- **PROS**: Quick fix, minimal code changes
- **CONS**: Exposes database credentials to client-side code - MAJOR SECURITY RISK

### Option 2: Server-Side Only Access (Recommended)
- Keep DB_READONLY_* variables as-is (server-side only)
- Ensure content-db-direct.ts is only used in server-side contexts
- Create API endpoints for any client-side data needs
- **PROS**: Secure, follows best practices
- **CONS**: Requires refactoring how data is accessed

### Option 3: Dual Environment Variables
- Keep sensitive DB_READONLY_* for server-side
- Add PUBLIC_ versions with limited/safe values for client needs
- **PROS**: Flexible approach
- **CONS**: Complexity, potential for confusion

## Recommended Solution: Option 2 - Server-Side Only

The database connection should NEVER be accessible from client-side code. We need to:

1. Ensure `content-db-direct.ts` is only imported in server-side contexts (API routes, SSR)
2. Create API endpoints for any client-side components that need data
3. Update the environment variable access to work properly in Astro's server context

## Implementation Plan

1. **Immediate Fix**: Update the getEnvVar function to properly access server-side env vars in Astro
2. **Audit Usage**: Find all places where content-db-direct.ts is imported
3. **Create API Layer**: Build API endpoints for client-side data access
4. **Update Components**: Refactor any client-side components to use API endpoints
5. **Security Review**: Ensure no database credentials are exposed to client

## Next Steps
- Start with understanding where content-db-direct.ts is being used
- Implement proper server-side environment variable access
- Create necessary API endpoints

## Solution Implemented

### Changes Made:

1. **Updated Environment Variable Access in content-db-direct.ts**:
   - Modified `getEnvVar` function to check multiple sources in the correct order
   - Added support for process.env (Node.js/Astro SSR), import.meta.env (Astro), and globalThis fallback
   - Implemented lazy configuration loading to avoid errors during module initialization

2. **Lazy Client Initialization**:
   - Changed from immediate client creation to lazy initialization
   - Client is only created when first connection is attempted
   - This ensures environment variables are available when needed

3. **Fixed Astro Configuration**:
   - Updated vite config to properly define process.env.NODE_ENV
   - Removed empty process.env definition that was causing issues

4. **Made Process Handlers Safe**:
   - Wrapped process.on('SIGINT') in a check to ensure it only runs in Node.js environments

### How It Works Now:

1. When the module is first imported, no database connection is attempted
2. Configuration is loaded lazily when first database operation is called
3. Environment variables are checked in multiple locations to ensure compatibility
4. The PostgreSQL client is created only when needed with the loaded configuration

### Testing the Fix:

To verify the fix works:
1. Restart the Docker containers: `docker-compose down && docker-compose up`
2. Check that the app loads without the "DB_READONLY_USER environment variable is required" error
3. Verify that pages load and can access content from the database

### Security Considerations:

- Database credentials remain server-side only (no PUBLIC_ prefix needed)
- Credentials are never exposed to client-side code
- Connection is only established in server-side contexts (SSR, API routes)