# Credential Security Audit - 2025-07-31

## Overview
Comprehensive audit of credential usage across the SpicebushWebapp codebase to identify security concerns and ensure sensitive credentials are properly managed.

## Key Findings

### 1. Hardcoded Service Role Keys (CRITICAL)
**Files with hardcoded Supabase service role keys:**
- `/scripts/setup-hosted-tables.js` - Line 9: `sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd`
- `/scripts/migrate-to-hosted.js` - Line 9: Same hardcoded key

**Security Risk:** These scripts contain the actual Supabase service role key hardcoded in the source code. This is a critical security vulnerability.

### 2. Client-Side Credential Usage (SECURE)
**Files using public/anon keys (safe for client-side):**
- `/src/lib/supabase.ts` - Uses `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLIC_KEY`
- `/src/lib/cms/supabase-backend.ts` - Uses `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`

**Status:** These files correctly use only public keys that are safe for client-side exposure.

### 3. Database Password Usage
**Files using database credentials:**
- `/src/lib/content-db-direct.ts` - Uses `DB_READONLY_USER` and `DB_READONLY_PASSWORD`
- Test files use `TEST_DB_PASSWORD` for integration testing

**Status:** The main application uses read-only database credentials, which limits potential damage if exposed.

### 4. Service Role Key Usage
**No service role keys found in src/ directory** - This is good, as service role keys should never be in client-accessible code.

## Credential Categories

### Public/Client-Safe Credentials
- `PUBLIC_SUPABASE_URL` - Safe to expose
- `PUBLIC_SUPABASE_PUBLIC_KEY` / `PUBLIC_SUPABASE_ANON_KEY` - Safe to expose
- These are used for client-side authentication and row-level security

### Server-Side Only Credentials
- `SUPABASE_SERVICE_ROLE_KEY` - Must NEVER be exposed to client
- `DB_PASSWORD` - Database admin password
- `DB_READONLY_PASSWORD` - Read-only database password (less critical but should be protected)

### Environment Variables Expected (.env.example)
```
# Public (safe for client)
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_PUBLIC_KEY

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_DATABASE
```

## Security Recommendations

### Immediate Actions Required
1. **Remove hardcoded credentials** from:
   - `/scripts/setup-hosted-tables.js`
   - `/scripts/migrate-to-hosted.js`
   
2. **Rotate the exposed service role key** in Supabase dashboard immediately

3. **Update scripts to use environment variables**:
   ```javascript
   const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
   if (!serviceKey) {
     throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable required');
   }
   ```

### Best Practices Implementation
1. **Add .env to .gitignore** (if not already)
2. **Use environment variables** for all sensitive credentials
3. **Document which credentials are needed** for different environments
4. **Implement credential validation** at startup
5. **Use different credentials** for development vs production

## Current Security Status

### ✅ Good Practices Observed
- Client-side code only uses public keys
- Database connections use read-only credentials where possible
- Service role key is not used in src/ directory
- Environment variables are used in most places

### ❌ Critical Issues
- Hardcoded service role keys in migration scripts
- Service role key is exposed in version control

### ⚠️ Areas for Improvement
- Some scripts could benefit from better error handling for missing credentials
- Consider using a secrets management service for production

## Migration Path

1. **Phase 1 - Immediate (Today)**
   - Remove hardcoded credentials from scripts
   - Rotate exposed service role key
   - Update scripts to use environment variables

2. **Phase 2 - Short Term**
   - Audit all deployment configurations
   - Ensure production uses secure credential management
   - Add automated checks to prevent credential commits

3. **Phase 3 - Long Term**
   - Implement secrets rotation
   - Use managed identity where possible
   - Regular security audits

## Files Requiring Updates

Priority 1 (Critical):
- `/scripts/setup-hosted-tables.js`
- `/scripts/migrate-to-hosted.js`

Priority 2 (Good Practice):
- Add validation to ensure required env vars are present
- Add documentation for credential setup