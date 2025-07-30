---
id: 028
title: Supabase Realtime Schema Migration Error
severity: high
status: open
category: database
created: 2025-07-28
lastUpdated: 2025-07-28
affectedComponents:
  - Supabase realtime
  - Database schemas
  - Docker containers
relatedBugs: [013, 014, 027]
---

# Supabase Realtime Schema Migration Error

## Summary
The Supabase realtime container is failing due to a schema selection error during migration. The error indicates "no schema has been selected to create in" when attempting to create the schema_migrations table.

## Current Behavior
- Realtime container continuously restarts
- Error: `ERROR 3F000 (invalid_schema_name) no schema has been selected to create in`
- Realtime features are unavailable
- WebSocket connections cannot be established

## Expected Behavior
- Realtime container should start successfully
- Schema migrations should complete
- Realtime subscriptions should be available

## Root Cause
The realtime service is trying to run migrations but:
1. The search_path is not properly set
2. The `_realtime` schema may not exist
3. DB_AFTER_CONNECT_QUERY may not be executing correctly

## Impact
- **User Impact**: No real-time updates (live notifications, data sync)
- **Development Impact**: Cannot test real-time features
- **Business Impact**: Degraded user experience without live updates

## Reproduction Steps
1. Run `docker-compose up`
2. Check realtime logs: `docker logs app-supabase-realtime-1`
3. Observe schema error and restart loop

## Technical Details
```
23:41:45.834 [error] Could not create schema migrations table. 
** (Postgrex.Error) ERROR 3F000 (invalid_schema_name) no schema has been selected to create in
```

Environment configuration shows:
- `DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'`

## Proposed Solution
1. Ensure `_realtime` schema is created before realtime container starts
2. Add schema creation to database initialization
3. Verify database connection parameters
4. Consider adding explicit schema in migration commands

## Workaround
Connect to database and manually create schema:
```sql
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
```

## Testing Notes
- Verify realtime container starts successfully
- Test WebSocket connections
- Confirm real-time subscriptions work
- Check database event broadcasting