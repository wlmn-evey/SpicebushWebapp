---
id: 027
title: Supabase Storage Migration Failure
severity: critical
status: open
category: database
created: 2025-07-28
lastUpdated: 2025-07-28
affectedComponents:
  - Supabase storage
  - Database migrations
  - Docker containers
relatedBugs: [013, 014]
---

# Supabase Storage Migration Failure

## Summary
The Supabase storage container is failing to start due to a migration error. The 'pathtoken-column' migration is attempting to reference `storage.objects` table which does not exist.

## Current Behavior
- Storage container continuously restarts
- Error: `relation "storage.objects" does not exist`
- Storage API is unavailable
- File uploads and image serving are broken

## Expected Behavior
- Storage container should start successfully
- All storage migrations should complete
- Storage API should be available on configured port

## Root Cause
The storage schema exists but lacks the required `objects` table. This suggests either:
1. Initial storage setup migrations were not run
2. Migration order is incorrect
3. Storage initialization SQL is missing from Docker setup

## Impact
- **User Impact**: Cannot upload or view images
- **Development Impact**: Storage-dependent features cannot be tested
- **Business Impact**: Core functionality (photo galleries, teacher photos) unavailable

## Reproduction Steps
1. Run `docker-compose up`
2. Check storage logs: `docker logs app-supabase-storage-1`
3. Observe migration failure and container restart loop

## Technical Details
```
Error: Migration failed. Reason: An error occurred running 'pathtoken-column'. 
Rolled back this migration. No further migrations were run. 
Reason: relation "storage.objects" does not exist
```

Current storage schema state:
```sql
Schema  |    Name    | Type  |         Owner          
---------+------------+-------+------------------------
storage | migrations | table | supabase_storage_admin
```

## Proposed Solution
1. Add storage initialization SQL to create required tables
2. Ensure storage migrations run in correct order
3. Consider adding storage setup to docker-entrypoint-initdb.d

## Workaround
Manually create storage tables by connecting to database and running Supabase storage initialization SQL.

## Testing Notes
- Verify storage container starts without errors
- Test file upload functionality
- Confirm existing images can be retrieved
- Check storage bucket creation works