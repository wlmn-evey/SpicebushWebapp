# Supabase Migration Plan - Updated with API Key Changes

**Date**: 2025-07-31
**Assessor**: Project Architect
**Current State**: Local Supabase with 3 crash-looping containers
**Target State**: Hosted Supabase with simplified setup

## Executive Summary

Supabase has updated their API key naming convention to be more intuitive. This change affects our migration plan but only in minor ways - primarily updating environment variable names. The simplified 9-step migration plan remains valid and deliverable.

## API Key Naming Changes

### Old Convention
- `SUPABASE_ANON_KEY` - Anonymous/public key for client-side usage
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side admin operations

### New Convention
- `SUPABASE_PUBLIC_KEY` - Public key (clearer name for client-side usage)
- `SUPABASE_SECRET_KEY` - Secret key (clearer name for server-side admin operations)

## Impact Analysis

### Code Changes Required
1. **Environment Variables** (2 locations):
   - `PUBLIC_SUPABASE_ANON_KEY` → `PUBLIC_SUPABASE_PUBLIC_KEY`
   - Update in `.env` files and deployment configurations

2. **Source Code** (2 files):
   - `/app/src/lib/supabase.ts` - Line 6
   - `/app/src/lib/cms/supabase-backend.ts` - Line 31

### No Changes Required
- Database schemas remain the same
- Authentication flows unchanged
- API endpoints compatible
- Migration scripts work as-is

## Updated Migration Plan (9 Steps)

### Phase 1: Setup (1 hour)
**1. Create Hosted Project**
   - User creates project at https://supabase.com
   - Selects nearest region for performance
   - Provides: Project URL and Public Key (new naming)

**2. Backup Everything**
   ```bash
   # Create comprehensive backup
   docker exec app-supabase-db-1 pg_dump -U postgres postgres > backup-$(date +%Y%m%d-%H%M%S).sql
   
   # Verify backup size and content
   ls -lh backup-*.sql
   head -100 backup-*.sql | grep -E "CREATE TABLE|INSERT INTO" | wc -l
   ```

**3. Verify Connection**
   ```bash
   # Test connection with new credentials
   node scripts/verify-supabase-connection.js
   ```

### Phase 2: Migration (1 hour)
**4. Export Data**
   ```bash
   # Export data only (schema auto-created by Supabase)
   docker exec app-supabase-db-1 pg_dump -U postgres \
     --data-only \
     --exclude-table=_prisma_migrations \
     --exclude-table=schema_migrations \
     postgres > data-export.sql
   ```

**5. Import to Hosted**
   - Use Supabase SQL Editor
   - Run data import script
   - Verify row counts match

**6. Update Environment**
   ```bash
   # Update .env with new naming convention
   PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
   PUBLIC_SUPABASE_PUBLIC_KEY=[new-public-key]
   
   # If using service role key anywhere:
   SUPABASE_SECRET_KEY=[new-secret-key]
   ```

### Phase 3: Cutover (30 minutes)
**7. Update Code References**
   ```typescript
   // Update in /app/src/lib/supabase.ts
   const supabasePublicKey = import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY;
   
   // Update in /app/src/lib/cms/supabase-backend.ts
   const supabasePublicKey = import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY;
   ```

**8. Test Application**
   - Authentication works
   - Data displays correctly
   - Forms submit successfully
   - Admin panel functions

**9. Clean Up Docker**
   ```bash
   # Stop all Supabase containers
   docker-compose stop supabase-auth supabase-db supabase-rest \
     supabase-realtime supabase-storage supabase-meta \
     supabase-studio supabase-analytics supabase-kong
   
   # Remove from docker-compose.yml
   # Commit simplified configuration
   ```

## Next Steps After User Creates Project

1. **User Provides** (Step 1 completion):
   - Project URL: `https://[project-id].supabase.co`
   - Public Key: `eyJ...` (the new PUBLIC_KEY)

2. **We Execute** (Steps 2-9):
   - Run backup script
   - Update verification script with new credentials
   - Execute data migration
   - Update environment variables with new naming
   - Update code references (2 files, 2 lines)
   - Test and verify
   - Clean up Docker configuration

3. **Verification Checklist**:
   - [ ] All users can log in
   - [ ] Blog posts display
   - [ ] Admin panel accessible
   - [ ] Forms submit correctly
   - [ ] No console errors
   - [ ] Performance acceptable

## Risk Mitigation

### API Key Naming Risk: MINIMAL
- **Impact**: Code won't find environment variables
- **Detection**: Immediate error on startup
- **Fix**: Simple find/replace operation
- **Time**: 5 minutes maximum

### Migration Risks (Unchanged)
1. **Auth Sessions** - Users may need to log in again
2. **Data Integrity** - Comprehensive backups prevent loss
3. **Performance** - Monitor and adjust if needed

## Benefits of New Naming

1. **Clarity**: `PUBLIC_KEY` clearly indicates client-side usage
2. **Security**: `SECRET_KEY` clearly indicates server-side only
3. **Industry Standard**: Aligns with common naming patterns
4. **Reduced Confusion**: No more explaining what "anon" means

## Summary

The API key naming change is a **minor update** that improves clarity without affecting the migration complexity. The 9-step plan remains the optimal approach, with only 2 small code changes needed for the new naming convention.

**Total Additional Work**: ~10 minutes to update variable names

**Recommendation**: Proceed with migration as planned. The naming change is a positive improvement that makes the codebase more maintainable.

## Action Items

1. ✅ Backup script prepared (no changes needed)
2. ✅ Verification script updated (already done by user)
3. ⏳ Waiting for user to create hosted project
4. 📝 Update code references when migrating (2 locations)
5. 📝 Update environment variables with new names

---
*Last Updated: 2025-07-31*