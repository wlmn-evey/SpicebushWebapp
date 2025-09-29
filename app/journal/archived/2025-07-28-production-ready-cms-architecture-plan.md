# Production-Ready CMS Architecture Plan
Date: 2025-07-28
Author: Claude (Project Architect)
Purpose: Resolve PostgREST authentication issues and establish a stable, production-ready CMS solution

## Executive Summary

The Spicebush Montessori website is currently blocked by PostgREST authentication errors preventing the frontend from reading content from the database. This architectural plan provides multiple solution pathways, from quick fixes to long-term sustainable approaches, prioritizing simplicity, reliability, and maintainability for school staff.

## Current State Analysis

### What's Working
1. **Database Layer**: PostgreSQL database is healthy and contains all migrated content
2. **Admin Panel**: Successfully writes to Supabase through SimpleCMSBackend
3. **Data Migration**: All critical school data is in the database
4. **Component Migration**: Frontend components updated to use database queries

### What's Broken
1. **PostgREST Authentication**: "permission denied to set role 'anon'" errors
2. **Frontend Data Access**: Cannot read content from database due to auth issues
3. **Service Dependencies**: Some Supabase services are restarting (storage, realtime, analytics)

### Root Cause
PostgREST is attempting to switch database roles during query execution, but the connection user lacks the necessary permissions. Despite applying fixes, the authenticator role pattern isn't working correctly in the current Docker setup.

## Solution Options

### Option 1: Direct Database Connection (Recommended - Immediate Fix)
**Approach**: Bypass PostgREST entirely for read operations

**Implementation**:
1. Create a read-only database user
2. Use direct PostgreSQL connection for content queries
3. Keep PostgREST only for admin write operations
4. Implement connection pooling for performance

**Pros**:
- Immediate resolution
- Simpler architecture
- No authentication complexity
- Better performance (no REST overhead)

**Cons**:
- Loses some Supabase features (realtime, RLS)
- Requires different query patterns

### Option 2: Fix PostgREST Configuration
**Approach**: Properly configure the authenticator role pattern

**Implementation**:
1. Rebuild Docker images with correct role setup
2. Ensure authenticator role is created before PostgREST starts
3. Verify JWT tokens match across all services
4. Test role switching permissions

**Pros**:
- Maintains full Supabase stack
- Enables future features (realtime, RLS)

**Cons**:
- Complex debugging required
- May introduce more points of failure
- Overkill for current needs

### Option 3: Simplified API Layer
**Approach**: Create a minimal API layer between frontend and database

**Implementation**:
1. Build simple Express/Fastify API
2. Handle database queries server-side
3. Cache responses for performance
4. Expose only needed endpoints

**Pros**:
- Full control over data access
- Can add caching/optimization
- Simpler than PostgREST

**Cons**:
- Additional service to maintain
- More code to write

### Option 4: Return to Flat Files (Fallback)
**Approach**: Revert to markdown-based CMS with database for dynamic content only

**Implementation**:
1. Keep markdown files for static content
2. Use database only for frequently updated content
3. Hybrid approach for best of both worlds

**Pros**:
- Proven to work
- Simple for developers
- Version control for content

**Cons**:
- Loses unified content management
- More complex content workflow

## Recommended Architecture

### Phase 1: Immediate Fix (Today)
1. Implement direct database connection for reads
2. Create read-only database user
3. Update content-db.ts to use pg driver
4. Test all frontend pages

### Phase 2: Stabilization (This Week)
1. Add connection pooling
2. Implement query caching
3. Monitor performance
4. Document query patterns

### Phase 3: Optimization (Next Month)
1. Evaluate if PostgREST is needed
2. Consider static generation for most content
3. Implement incremental regeneration
4. Add monitoring/alerting

## Implementation Blueprint

### 1. Database User Setup
```sql
-- Create read-only user for frontend
CREATE USER frontend_reader WITH PASSWORD 'secure-readonly-password';
GRANT CONNECT ON DATABASE postgres TO frontend_reader;
GRANT USAGE ON SCHEMA public TO frontend_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO frontend_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO frontend_reader;
```

### 2. Direct Database Adapter
```typescript
// src/lib/content-db-direct.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'frontend_reader',
  password: process.env.DB_READONLY_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function getCollection(collection: string) {
  const query = `
    SELECT * FROM content 
    WHERE type = $1 AND status = 'published'
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [collection]);
  return result.rows.map(transformToContentEntry);
}
```

### 3. Environment Configuration
```bash
# .env.local
DB_READONLY_PASSWORD=secure-readonly-password
DATABASE_URL=postgresql://frontend_reader:secure-readonly-password@localhost:54322/postgres
```

### 4. Migration Strategy
1. Keep existing admin panel using Supabase
2. Update frontend to use direct queries
3. Test thoroughly before removing PostgREST dependency
4. Monitor for any issues

## Testing Plan

### Functional Tests
1. Verify all pages load content correctly
2. Test admin panel write operations
3. Confirm coming soon mode works
4. Check all dynamic content displays

### Performance Tests
1. Measure page load times
2. Monitor database connection pool
3. Check query performance
4. Verify caching effectiveness

### Security Tests
1. Ensure read-only user cannot write
2. Verify no SQL injection vulnerabilities
3. Check connection encryption
4. Audit exposed data

## Rollback Plan

If issues arise:
1. Revert to markdown files (already in git)
2. Use hybrid approach temporarily
3. Re-evaluate architecture needs

## Success Criteria

1. **Immediate**: Website displays all content without errors
2. **Short-term**: Admin can update content through web interface
3. **Long-term**: System is maintainable by school staff

## Recommendations

### Do:
- Start with the simplest solution that works
- Prioritize reliability over features
- Document everything for future maintainers
- Keep the school's technical capabilities in mind

### Don't:
- Over-engineer for hypothetical future needs
- Add complexity without clear benefits
- Depend on services that can fail mysteriously
- Assume technical expertise from school staff

## Conclusion

The PostgREST authentication issue has revealed that the full Supabase stack may be unnecessarily complex for this use case. A simpler architecture using direct database connections will provide a more reliable, maintainable solution while preserving the ability to use Supabase features where they add value.

The recommended approach prioritizes getting the website working immediately while planning for a sustainable long-term architecture that matches the school's actual needs rather than trying to use every available feature.