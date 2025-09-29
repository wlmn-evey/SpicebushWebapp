# Debugging Session: Supabase Auth Service Migration Error

Date: 2025-07-27
Status: Resolved

## Problem Description and Symptoms

The Supabase auth service was failing to start, preventing user registration and login functionality. The service was stuck in a restart loop with the following error:

```
ERROR: operator does not exist: uuid = text (SQLSTATE 42883)
```

This error occurred in the GoTrue migration file `20221208132122_backfill_email_last_sign_in_at.up.sql`.

## Debugging Steps Taken

1. **Container Status Check**: Confirmed the auth service was continuously restarting with exit code 1
2. **Log Analysis**: Identified the exact migration file and SQL statement causing the failure
3. **Schema Investigation**: Examined the `auth.identities` table to understand column types
4. **Root Cause Identification**: Found that the migration was incorrectly casting `user_id` to text when comparing with `id` (both UUID columns)

## Root Cause Identified

The migration contained a type mismatch in its WHERE clause:
```sql
id = user_id::text
```

PostgreSQL cannot compare UUID and text types directly, causing the migration to fail. The correct comparison should be:
```sql
id = user_id
```

## Solution Implemented

1. **Created Fix Migration**: Wrote a custom migration (`20250727_fix_auth_migration.sql`) that:
   - Inserts the problematic migration version into the `schema_migrations` table to prevent GoTrue from running it
   - Applies the intended data fix with corrected type handling

2. **Applied the Fix**:
   - Stopped the failing auth service
   - Applied the fix migration directly to the database
   - Verified the migration was recorded

3. **Restarted Service**: Successfully restarted the auth service

## Verification Results

- ✅ Auth service is running without restart loops
- ✅ Health endpoint responds correctly at `http://localhost:54321/auth/v1/health`
- ✅ User registration works (tested with `evey@eveywinters.com`)
- ✅ Confirmation emails are sent to MailHog
- ✅ Auth service logs show "GoTrue migrations applied successfully"

## Lessons Learned

1. **Type Safety in Migrations**: Always ensure type compatibility in SQL comparisons, especially when dealing with UUID columns
2. **Migration Workarounds**: When a third-party migration fails, creating a fix migration that marks it as applied can be an effective solution
3. **Version Compatibility**: This appears to be a known issue with older versions of GoTrue migrations that may not be compatible with newer PostgreSQL schemas

## Follow-up Recommendations

1. Monitor for any similar migration issues in future GoTrue updates
2. Consider documenting this fix in the project's deployment guide for future reference
3. The fix migration should be kept in the codebase to ensure new deployments don't encounter the same issue

## Files Created/Modified

- Created: `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/supabase/migrations/20250727_fix_auth_migration.sql`
- Created: `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/issue-2025-07-27-supabase-auth-migration-uuid-error.md`