# Security Credential Cleanup - 2025-07-31

## Summary
Removed all hardcoded credentials from script files and replaced them with environment variable references to improve security.

## Files Modified

### 1. scripts/generate-tokens.cjs
- Added `dotenv` configuration
- Replaced hardcoded JWT_SECRET with environment variable
- Added validation to ensure JWT_SECRET is set before execution

### 2. scripts/test-hours-db.js  
- Added `dotenv` import and configuration
- Removed hardcoded password fallback
- Added validation for POSTGRES_PASSWORD environment variable

### 3. scripts/test-supabase-connection.js
- Added `dotenv` import and configuration  
- Replaced hardcoded service role key with environment variable
- Added validation for SUPABASE_SERVICE_ROLE_KEY
- Made SUPABASE_URL configurable with fallback to localhost

### 4. scripts/apply-postgrest-fix.sh
- Added automatic loading of .env file
- Added validation for POSTGRES_PASSWORD
- Modified to perform variable substitution in SQL file before execution
- Added proper cleanup of temporary files

### 5. scripts/migrate-hours-to-cms.js
- Added `dotenv` import and configuration
- Removed hardcoded password fallback
- Added validation for POSTGRES_PASSWORD environment variable

### 6. scripts/verify-migration.js
- Added `dotenv` import and configuration
- Removed hardcoded password fallback  
- Added validation for POSTGRES_PASSWORD environment variable

### 7. scripts/fix-postgrest-roles.sql
- Replaced hardcoded password with placeholder ${POSTGRES_PASSWORD}
- Added comment explaining that the placeholder will be replaced by the script

## Security Improvements
- All sensitive credentials now stored in environment variables
- Scripts validate required environment variables before execution
- Clear error messages guide developers to set up proper .env files
- No credentials exposed in version control
- Maintains functionality for developers with proper environment setup

## Developer Experience
- Scripts remain fully functional for developers with .env files
- Clear error messages when environment variables are missing
- Automatic loading of .env files where appropriate
- No manual environment variable export required for Node.js scripts