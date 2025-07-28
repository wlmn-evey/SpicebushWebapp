# Test Pages Inventory
Date: 2025-07-28
Purpose: Document all test pages before removal for production deployment

## Test Pages Found

### 1. /src/pages/test-db.astro
- **Purpose**: Tests database connection and displays content from database
- **Security Risk**: Exposes database structure and content
- **URL**: /test-db

### 2. /src/pages/test-direct-db.astro
- **Purpose**: Tests direct PostgreSQL connection bypassing PostgREST
- **Security Risk**: Shows database connection details and query results
- **URL**: /test-direct-db

### 3. /src/pages/test-supabase.astro
- **Purpose**: Tests Supabase client connection and displays results
- **Security Risk**: Exposes Supabase configuration and data
- **URL**: /test-supabase

### 4. /src/pages/test-auth.astro
- **Purpose**: Tests authentication flow and user session
- **Security Risk**: May expose authentication tokens or user data
- **URL**: /test-auth

### 5. /src/pages/test-focal-points.astro
- **Purpose**: Tests image focal point positioning feature
- **Security Risk**: Low risk, but unnecessary in production
- **URL**: /test-focal-points

### 6. /src/pages/photo-test-simple.astro
- **Purpose**: Tests photo display functionality
- **Security Risk**: Low risk, but unnecessary in production
- **URL**: /photo-test-simple

### 7. /src/pages/api/storage/test-connection.ts
- **Purpose**: API endpoint to test storage connection
- **Security Risk**: Exposes storage configuration details
- **URL**: /api/storage/test-connection

## Action Plan
All these test pages will be:
1. Backed up to /app/backups/test-pages-[timestamp]/
2. Removed from the production codebase
3. Added to .gitignore to prevent accidental re-inclusion