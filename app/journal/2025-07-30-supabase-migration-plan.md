# Supabase Local to Hosted Migration Plan

**Date**: 2025-07-30
**Project**: Spicebush Montessori Web App
**Current State**: Running 9 local Supabase containers (3 crash-looping)
**Target State**: Hosted Supabase service with minimal local containers

## Executive Summary

This migration plan outlines the process to move from a complex local Supabase setup (9 containers) to a hosted Supabase service. The current setup only uses auth and database features, making the other 7 containers unnecessary overhead. The migration will be executed in micro-tasks (15-20 minutes each) with zero downtime and comprehensive rollback capabilities.

## Current Architecture Analysis

### Active Containers (Currently Running)
1. **supabase-db** - PostgreSQL database (REQUIRED)
2. **supabase-auth** - Authentication service (REQUIRED)
3. **supabase-rest** - PostgREST API (REQUIRED for database access)
4. **supabase-kong** - API Gateway (Routes requests)
5. **supabase-studio** - Admin UI (Development only)
6. **supabase-meta** - Database metadata service
7. **imgproxy** - Image transformation service (NOT USED)
8. **mailhog** - Email testing (Development only)
9. **app** - Astro application

### Problematic Containers (Crash-looping)
- **supabase-storage** - File storage (NOT USED)
- **supabase-realtime** - WebSocket connections (NOT USED)
- **supabase-analytics** - Logflare analytics (NOT USED)
- **supabase-functions** - Edge functions (NOT USED, depends on analytics)

### Data Currently in Local Database
- User authentication records
- CMS content (blog posts, settings, etc.)
- Session management data
- Media metadata
- Newsletter subscriptions

## Migration Strategy Overview

### Phase 1: Pre-Migration Setup (Tasks 1-5)
- Set up hosted Supabase project
- Prepare migration scripts
- Create backup and rollback procedures
- Test connectivity

### Phase 2: Data Migration (Tasks 6-10)
- Export local data
- Transform data if needed
- Import to hosted Supabase
- Verify data integrity

### Phase 3: Application Configuration (Tasks 11-15)
- Update environment variables
- Modify connection strings
- Test all features
- Performance verification

### Phase 4: Docker Simplification (Tasks 16-20)
- Remove unnecessary containers
- Update docker-compose.yml
- Optimize remaining containers
- Final testing

### Phase 5: Cutover & Monitoring (Tasks 21-25)
- Switch to production
- Monitor for issues
- Clean up old resources
- Documentation update

## Detailed Task Breakdown

### Task 1: Create Hosted Supabase Project (20 min)
**Description**: Set up new Supabase project on hosted service
**Steps**:
1. Sign up/login to supabase.com
2. Create new project "spicebush-montessori"
3. Select appropriate region (closest to users)
4. Choose Free tier initially (can upgrade later)
5. Document project URL and keys
6. Enable only Auth and Database services

**Verification**: 
- Can access Supabase dashboard
- Project URL is accessible
- API keys are generated

**Rollback**: Delete project if issues arise

---

### Task 2: Document Current Database Schema (15 min)
**Description**: Extract and document all database schemas
**Steps**:
1. Connect to local database
2. Export schema definitions
3. Document all tables, views, functions
4. Note any custom configurations
5. Save to `migration/schema-backup.sql`

**Script**:
```bash
# Export schema
docker exec app-supabase-db-1 pg_dump \
  -U postgres \
  -h localhost \
  -s \
  --no-owner \
  --no-privileges \
  postgres > migration/schema-$(date +%Y%m%d).sql
```

**Verification**: Schema file created and readable
**Rollback**: N/A - documentation only

---

### Task 3: Create Data Export Scripts (20 min)
**Description**: Prepare scripts to export all data
**Steps**:
1. Create export directory structure
2. Write table-specific export scripts
3. Include data validation checks
4. Test scripts on small dataset
5. Document any data transformations needed

**Script Template**:
```bash
#!/bin/bash
# migration/export-data.sh

EXPORT_DIR="migration/data-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EXPORT_DIR"

# Export each table
TABLES=("auth.users" "public.posts" "public.settings" "public.media" "public.newsletter_subscriptions")

for table in "${TABLES[@]}"; do
  echo "Exporting $table..."
  docker exec app-supabase-db-1 pg_dump \
    -U postgres \
    -h localhost \
    -t "$table" \
    --data-only \
    --no-owner \
    postgres > "$EXPORT_DIR/${table//\./_}.sql"
done
```

**Verification**: Scripts execute without errors
**Rollback**: N/A - preparation only

---

### Task 4: Test Hosted Supabase Connection (15 min)
**Description**: Verify connectivity to hosted service
**Steps**:
1. Create test script with hosted credentials
2. Test database connection
3. Test auth endpoints
4. Verify API accessibility
5. Check response times

**Test Script**:
```javascript
// migration/test-hosted-connection.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.HOSTED_SUPABASE_URL,
  process.env.HOSTED_SUPABASE_ANON_KEY
);

// Test database
const { data, error } = await supabase
  .from('test_table')
  .select('*')
  .limit(1);

console.log('Database test:', { data, error });

// Test auth
const { data: authData, error: authError } = await supabase.auth.getSession();
console.log('Auth test:', { authData, authError });
```

**Verification**: All tests pass
**Rollback**: N/A - testing only

---

### Task 5: Create Rollback Procedures (20 min)
**Description**: Document rollback steps for each phase
**Steps**:
1. Create rollback checklist
2. Write environment variable restore script
3. Document container restart procedures
4. Create data restore scripts
5. Test rollback on dev environment

**Rollback Script Template**:
```bash
#!/bin/bash
# migration/rollback.sh

# Restore environment variables
cp .env.backup .env

# Restart original containers
docker-compose down
docker-compose up -d

# Verify services
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Verification**: Rollback procedures tested
**Rollback**: N/A - preparation only

---

### Task 6: Export Authentication Data (15 min)
**Description**: Export all auth-related data
**Steps**:
1. Export auth.users table
2. Export auth.identities
3. Export auth.sessions
4. Handle password hashes properly
5. Document any auth configurations

**Important Notes**:
- Password hashes may need special handling
- Session tokens will need to be invalidated
- Email confirmation status must be preserved

**Verification**: All user accounts exported
**Rollback**: Use backup from Task 2

---

### Task 7: Export Application Data (15 min)
**Description**: Export all application-specific data
**Steps**:
1. Export blog posts
2. Export settings
3. Export media metadata
4. Export newsletter subscriptions
5. Verify row counts match

**Verification Script**:
```sql
-- Count rows in each table
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
```

**Verification**: Row counts documented
**Rollback**: Use backup from Task 2

---

### Task 8: Import Schema to Hosted Service (20 min)
**Description**: Create schema in hosted Supabase
**Steps**:
1. Connect to hosted Supabase SQL editor
2. Run schema creation scripts
3. Verify all tables created
4. Check indexes and constraints
5. Confirm RLS policies

**Migration Command**:
```bash
# Use Supabase CLI or SQL editor
psql "$HOSTED_DATABASE_URL" < migration/schema-*.sql
```

**Verification**: All tables exist in hosted service
**Rollback**: Drop all created objects

---

### Task 9: Import Data to Hosted Service (20 min)
**Description**: Import all data to hosted Supabase
**Steps**:
1. Disable triggers temporarily
2. Import data in correct order
3. Re-enable triggers
4. Update sequences
5. Verify row counts

**Import Order**:
1. auth.users (if possible)
2. public.settings
3. public.posts
4. public.media
5. public.newsletter_subscriptions

**Verification**: Row counts match source
**Rollback**: Truncate all tables

---

### Task 10: Verify Data Integrity (15 min)
**Description**: Ensure all data migrated correctly
**Steps**:
1. Compare row counts
2. Spot check critical records
3. Test user authentication
4. Verify blog posts display
5. Check media references

**Verification Queries**:
```sql
-- Check row counts
SELECT COUNT(*) FROM public.posts;
SELECT COUNT(*) FROM public.settings;
SELECT COUNT(*) FROM auth.users;

-- Verify latest blog post
SELECT title, created_at FROM public.posts 
ORDER BY created_at DESC LIMIT 1;
```

**Verification**: All checks pass
**Rollback**: Return to local database

---

### Task 11: Update Environment Variables (15 min)
**Description**: Update app configuration for hosted service
**Steps**:
1. Backup current .env file
2. Update SUPABASE_URL
3. Update SUPABASE_ANON_KEY
4. Update database connection strings
5. Keep local URLs as fallback

**New Environment Variables**:
```bash
# Backup current values
cp .env .env.backup

# Add hosted values
PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
PUBLIC_SUPABASE_ANON_KEY=[new-anon-key]

# Keep local as fallback
LOCAL_SUPABASE_URL=http://localhost:54321
LOCAL_SUPABASE_ANON_KEY=[old-anon-key]
```

**Verification**: App starts with new config
**Rollback**: Restore .env.backup

---

### Task 12: Test Authentication Flow (20 min)
**Description**: Verify auth works with hosted service
**Steps**:
1. Test user login
2. Test magic link flow
3. Test session management
4. Verify admin access
5. Check auth redirects

**Test Checklist**:
- [ ] Can log in with existing user
- [ ] Magic link emails sent
- [ ] Sessions persist
- [ ] Admin panel accessible
- [ ] Logout works

**Verification**: All auth features work
**Rollback**: Revert environment variables

---

### Task 13: Test Database Operations (20 min)
**Description**: Verify all database operations
**Steps**:
1. Test read operations
2. Test write operations
3. Verify API responses
4. Check query performance
5. Test concurrent access

**Test Operations**:
- Create new blog post
- Update settings
- Upload media metadata
- Subscribe to newsletter
- Delete test records

**Verification**: All CRUD operations work
**Rollback**: Revert environment variables

---

### Task 14: Performance Benchmarking (15 min)
**Description**: Compare performance metrics
**Steps**:
1. Measure page load times
2. Test API response times
3. Check database query speed
4. Monitor network latency
5. Document results

**Benchmark Script**:
```javascript
// migration/benchmark.js
const endpoints = [
  '/api/posts',
  '/api/settings',
  '/api/auth/session'
];

for (const endpoint of endpoints) {
  const start = Date.now();
  await fetch(endpoint);
  const duration = Date.now() - start;
  console.log(`${endpoint}: ${duration}ms`);
}
```

**Verification**: Performance acceptable
**Rollback**: N/A - testing only

---

### Task 15: Update API Endpoints (15 min)
**Description**: Update any hardcoded endpoints
**Steps**:
1. Search for localhost references
2. Update API calls
3. Use environment variables
4. Test all endpoints
5. Update CORS settings

**Search Command**:
```bash
# Find hardcoded URLs
grep -r "localhost:54321" src/
grep -r "supabase-kong" src/
```

**Verification**: No hardcoded local URLs
**Rollback**: Revert code changes

---

### Task 16: Remove Unused Containers (20 min)
**Description**: Stop and remove unnecessary containers
**Steps**:
1. Stop crash-looping containers
2. Remove from docker-compose.yml
3. Clean up volumes
4. Update dependencies
5. Test reduced setup

**Containers to Remove**:
- supabase-storage
- supabase-realtime
- supabase-analytics
- supabase-functions
- supabase-vector (already commented)

**Verification**: Only essential containers running
**Rollback**: Restore docker-compose.yml

---

### Task 17: Simplify Docker Compose (15 min)
**Description**: Create minimal docker-compose.yml
**Steps**:
1. Create docker-compose.prod.yml
2. Keep only app and mailhog
3. Remove all Supabase services
4. Update network configuration
5. Test new configuration

**Minimal docker-compose.yml**:
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4321:4321"
    environment:
      - NODE_ENV=production
      - PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
      - PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
    networks:
      - spicebush-network

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - spicebush-network

networks:
  spicebush-network:
    driver: bridge
```

**Verification**: App runs with minimal setup
**Rollback**: Restore original docker-compose.yml

---

### Task 18: Update Development Workflow (15 min)
**Description**: Document new development process
**Steps**:
1. Update README
2. Create development guide
3. Document connection process
4. Update troubleshooting docs
5. Create quick start script

**Quick Start Script**:
```bash
#!/bin/bash
# scripts/dev-setup.sh

# Load environment
source .env

# Start minimal containers
docker-compose -f docker-compose.minimal.yml up -d

# Wait for services
echo "Waiting for services..."
sleep 5

# Open browser
open http://localhost:4321
open http://localhost:8025  # MailHog
```

**Verification**: Documentation complete
**Rollback**: N/A - documentation only

---

### Task 19: Final Integration Testing (20 min)
**Description**: Complete end-to-end testing
**Steps**:
1. Test all user journeys
2. Verify admin functions
3. Check email delivery
4. Test error handling
5. Validate monitoring

**Test Scenarios**:
- New user registration
- Blog post creation
- Settings management
- Newsletter signup
- Contact form submission

**Verification**: All features functional
**Rollback**: Full rollback procedure

---

### Task 20: Create Monitoring Dashboard (15 min)
**Description**: Set up monitoring for hosted service
**Steps**:
1. Enable Supabase monitoring
2. Set up alerts
3. Configure log aggregation
4. Create uptime checks
5. Document metrics

**Key Metrics**:
- Database connections
- API response times
- Error rates
- Storage usage
- Monthly active users

**Verification**: Monitoring active
**Rollback**: N/A - monitoring only

---

### Task 21: Production Cutover (20 min)
**Description**: Switch to hosted service
**Steps**:
1. Announce maintenance window
2. Final data sync
3. Update DNS/routing
4. Switch environment variables
5. Verify production access

**Cutover Checklist**:
- [ ] Backup completed
- [ ] Data synchronized
- [ ] Environment updated
- [ ] Services verified
- [ ] Users notified

**Verification**: Production site functional
**Rollback**: Emergency rollback procedure

---

### Task 22: Monitor Post-Migration (15 min)
**Description**: Watch for issues after cutover
**Steps**:
1. Monitor error logs
2. Check performance metrics
3. Verify user activity
4. Test critical paths
5. Document any issues

**Monitoring Commands**:
```bash
# Check Supabase logs
supabase logs --tail

# Monitor Docker logs
docker logs -f app-app-1

# Check system resources
docker stats
```

**Verification**: No critical issues
**Rollback**: If issues, execute rollback

---

### Task 23: Clean Up Old Resources (15 min)
**Description**: Remove old local Supabase data
**Steps**:
1. Stop old containers
2. Remove old volumes
3. Clean Docker images
4. Archive backup data
5. Update documentation

**Cleanup Commands**:
```bash
# Stop old containers
docker-compose down

# Remove volumes (after confirming backups)
docker volume prune

# Clean images
docker image prune -a

# Archive backups
tar -czf migration/backup-$(date +%Y%m%d).tar.gz migration/data-*
```

**Verification**: Disk space recovered
**Rollback**: N/A - cleanup only

---

### Task 24: Update Production Documentation (15 min)
**Description**: Document production configuration
**Steps**:
1. Update deployment guide
2. Document new URLs
3. Update troubleshooting
4. Create runbook
5. Update team wiki

**Documentation Updates**:
- Production URLs
- Emergency contacts
- Monitoring links
- Backup procedures
- Scaling guidelines

**Verification**: Documentation complete
**Rollback**: N/A - documentation only

---

### Task 25: Post-Migration Review (20 min)
**Description**: Review migration success
**Steps**:
1. Compare metrics
2. Document lessons learned
3. Update cost projections
4. Plan optimizations
5. Schedule follow-up

**Review Metrics**:
- Performance improvement
- Cost reduction
- Operational simplification
- User experience
- Developer experience

**Verification**: Review complete
**Rollback**: N/A - review only

## Risk Mitigation

### High-Risk Areas
1. **Data Loss**: Mitigated by comprehensive backups
2. **Auth Disruption**: Test thoroughly before cutover
3. **Performance Degradation**: Benchmark before/after
4. **Cost Overrun**: Start with free tier, monitor usage

### Contingency Plans
1. **Immediate Rollback**: Keep local setup ready
2. **Partial Migration**: Can run hybrid temporarily
3. **Data Sync Issues**: Manual reconciliation scripts
4. **Performance Issues**: Can upgrade tier quickly

## Success Criteria

1. All data successfully migrated
2. Zero data loss
3. No service disruption
4. Performance equal or better
5. Reduced operational complexity
6. Lower maintenance burden
7. Cost within budget

## Next Steps

1. Review plan with team
2. Schedule maintenance window
3. Prepare communication to users
4. Begin with Task 1
5. Execute tasks sequentially

## Resources Required

- Supabase account
- 4-6 hours total time
- Access to production environment
- Backup storage (~1GB)
- Testing environment

## Cost Estimates

### Current State (Local)
- Infrastructure: $0 (local resources)
- Maintenance: High (time cost)
- Complexity: Very High

### Future State (Hosted)
- Free Tier: $0/month (likely sufficient)
- Pro Tier: $25/month (if needed)
- Maintenance: Low
- Complexity: Low

## Conclusion

This migration will significantly simplify the infrastructure while maintaining all required functionality. The step-by-step approach ensures safety and reversibility at each stage.