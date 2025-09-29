# Bug Fix Phase 2: Architectural Blueprint and Task Delegation Plan
**Date**: 2025-07-29
**Architect**: Project Architect & QA Specialist
**Status**: Active Blueprint

## Executive Summary

Following the successful completion of Phase 1 bug fixes (Bugs #032, #034, #035, #001, #003), we are now prepared to tackle the remaining critical and high-priority bugs. This blueprint provides the strategic vision and technical guidance for Phase 2 implementation.

### Phase 1 Achievements
- ✅ Docker infrastructure stabilized
- ✅ Blog functionality restored
- ✅ Mobile navigation operational
- ✅ Development environment reliable

### Phase 2 Objectives
1. Complete critical user-facing functionality (Tour Scheduling)
2. Resolve server stability issues
3. Fix infrastructure path resolution
4. Ensure production readiness

## System Architecture Analysis

### Current State Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Astro)                        │
├─────────────────────────────────────────────────────────────┤
│  Pages           Components         Services               │
│  - Homepage      - Header           - Supabase Auth       │
│  - Blog ✓        - Footer           - Blog API ✓          │
│  - About         - Navigation ✓     - Admin API           │
│  - Tour ✗        - Forms             - Content API         │
│  - Admin         - Gallery                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  Database         Storage           Authentication         │
│  - Supabase      - Local Files     - Magic Links          │
│  - PostgREST     - Public Assets   - JWT Tokens           │
│  - Migrations    - CMS Content                             │
└─────────────────────────────────────────────────────────────┘
```

### Identified Problem Areas
1. **Missing Components**: Tour scheduling page completely absent
2. **Server Errors**: Multiple 500 errors indicating backend failures
3. **Path Resolution**: Vite aliases not resolving in Docker environment
4. **Storage Migration**: Supabase storage migration incomplete

## Bug #004: Tour Scheduling Page Blueprint

### Requirement Analysis
- **User Story**: Parents need to schedule school tours online
- **Current State**: 404 error - page doesn't exist
- **Business Impact**: Critical - primary conversion funnel blocked

### Technical Specifications

#### Component Architecture
```typescript
// src/pages/tour.astro
interface TourPageProps {
  availableSlots: TourSlot[]
  tourTypes: TourType[]
  contactInfo: ContactInfo
}

// src/components/TourScheduler.tsx
interface TourSchedulerProps {
  slots: TourSlot[]
  onSchedule: (booking: TourBooking) => Promise<void>
}

// src/lib/tour-scheduling.ts
interface TourService {
  getAvailableSlots(dateRange: DateRange): Promise<TourSlot[]>
  bookTour(booking: TourBooking): Promise<BookingConfirmation>
  sendNotification(booking: BookingConfirmation): Promise<void>
}
```

#### Data Model
```sql
-- Tour scheduling tables
CREATE TABLE tour_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_attendees INTEGER DEFAULT 5,
  booked_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES tour_slots(id),
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  child_name TEXT,
  child_age INTEGER,
  questions TEXT,
  confirmation_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Implementation Roadmap
1. **Database Setup** (30 minutes)
   - Create tour scheduling tables
   - Add seed data for available slots
   - Set up RLS policies

2. **API Development** (45 minutes)
   - Create tour service endpoints
   - Implement booking logic
   - Add email notification system

3. **Frontend Implementation** (60 minutes)
   - Create tour.astro page
   - Build TourScheduler component
   - Implement calendar UI
   - Add form validation

4. **Testing & Integration** (45 minutes)
   - Unit tests for booking logic
   - E2E tests for user flow
   - Email notification testing

### Task Delegation for Bug #004

#### Database Engineer Tasks
```yaml
agent: Database Engineer
priority: 1
tasks:
  - Create tour scheduling schema
  - Implement RLS policies
  - Add initial availability data
  - Test database constraints
deliverables:
  - Migration file: 004_tour_scheduling.sql
  - Seed data script
  - Database test results
```

#### Full-Stack Developer Tasks
```yaml
agent: Full-Stack Developer
priority: 2
dependencies: [Database Engineer]
tasks:
  - Create /src/pages/tour.astro
  - Implement TourScheduler component
  - Build tour booking service
  - Integrate with email notifications
deliverables:
  - Tour page implementation
  - Booking service API
  - Component tests
```

#### UX/UI Developer Tasks
```yaml
agent: UX/UI Developer  
priority: 2
dependencies: [Database Engineer]
tasks:
  - Design calendar interface
  - Create booking form UI
  - Implement confirmation flow
  - Ensure mobile responsiveness
deliverables:
  - Calendar component
  - Booking form styles
  - Confirmation page design
```

## Bug #002: Server 500 Errors Blueprint

### Root Cause Analysis
Based on error patterns, the 500 errors stem from:
1. Missing API endpoints
2. Database connection timeouts
3. Malformed data responses
4. Missing error boundaries

### Technical Investigation Plan

#### Diagnostic Steps
```typescript
// src/lib/error-diagnostics.ts
interface ErrorDiagnostics {
  captureError(error: Error, context: ErrorContext): void
  analyzePattern(errors: Error[]): ErrorPattern
  generateReport(): DiagnosticReport
}

// Implementation phases:
// 1. Add comprehensive error logging
// 2. Implement error boundaries
// 3. Create fallback UI states
// 4. Add retry mechanisms
```

#### Server Error Categories
1. **Database Errors** (Connection, Query, Timeout)
2. **API Errors** (Missing endpoints, Auth failures)
3. **Data Errors** (Null references, Type mismatches)
4. **Configuration Errors** (Missing env vars, Wrong URLs)

### Task Delegation for Bug #002

#### Backend Engineer Tasks
```yaml
agent: Backend Engineer
priority: 1
tasks:
  - Implement global error handler
  - Add API endpoint validation
  - Create error logging system
  - Fix database connection pooling
deliverables:
  - Error handling middleware
  - API validation schemas
  - Connection pool configuration
  - Error log analysis
```

#### DevOps Engineer Tasks
```yaml
agent: DevOps Engineer
priority: 1
tasks:
  - Set up error monitoring (Sentry)
  - Configure health checks
  - Implement circuit breakers
  - Add performance monitoring
deliverables:
  - Monitoring dashboard
  - Alert configurations
  - Performance baselines
```

## Bug #026: Vite Path Alias Resolution Blueprint

### Technical Analysis
The Vite bundler fails to resolve TypeScript path aliases in Docker environment due to:
1. Mismatched path configurations
2. Docker volume mounting issues
3. Build vs runtime path differences

### Solution Architecture
```javascript
// vite.config.js modifications
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  // Docker-specific optimizations
  server: {
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
```

### Task Delegation for Bug #026

#### Build Engineer Tasks
```yaml
agent: Build Engineer
priority: 1
tasks:
  - Fix vite.config.js aliases
  - Update tsconfig.json paths
  - Test in Docker environment
  - Document alias usage
deliverables:
  - Updated vite configuration
  - Working Docker build
  - Path alias documentation
```

## Quality Assurance Framework

### Acceptance Criteria by Bug

#### Bug #004 - Tour Scheduling
- [ ] Page loads without errors
- [ ] Calendar displays available slots
- [ ] Booking form validates input
- [ ] Confirmation email sends
- [ ] Mobile responsive design
- [ ] Accessibility compliant

#### Bug #002 - Server Errors
- [ ] No 500 errors in production
- [ ] All errors logged properly
- [ ] User-friendly error messages
- [ ] Automatic error recovery
- [ ] Performance within SLA

#### Bug #026 - Path Aliases
- [ ] All imports resolve correctly
- [ ] Docker builds succeed
- [ ] No TypeScript errors
- [ ] Hot reload works

### Testing Strategy

#### Unit Testing Requirements
```typescript
// Test coverage targets
const coverageTargets = {
  tourScheduling: 85,
  errorHandling: 90,
  pathResolution: 100
}

// Critical test scenarios
describe('Tour Scheduling', () => {
  test('should display available slots')
  test('should prevent double booking')
  test('should send confirmation email')
  test('should handle timezone correctly')
})
```

#### Integration Testing Plan
1. Database connectivity under load
2. API endpoint response times
3. Error recovery mechanisms
4. Path resolution in builds

## Risk Mitigation Strategies

### Identified Risks
1. **Tour Scheduling Complexity**: Calendar UI might be complex
   - Mitigation: Use established calendar library
   
2. **Error Pattern Unknown**: Root cause of 500s unclear
   - Mitigation: Comprehensive logging first

3. **Path Alias Breaking Changes**: Might affect existing code
   - Mitigation: Incremental migration approach

### Contingency Plans
- If tour scheduling takes >3 hours: Implement basic version first
- If 500 errors persist: Add temporary error boundaries
- If path aliases fail: Revert to relative imports

## Implementation Sequence

### Phase 2A (Immediate - 3 hours)
1. **Bug #026**: Fix Vite path aliases (1 hour)
   - Critical for development workflow
   - Blocks other development

2. **Bug #004**: Implement tour scheduling (2 hours)
   - High business value
   - User-facing feature

### Phase 2B (Next - 4-6 hours)
1. **Bug #002**: Investigate and fix 500 errors
   - Requires deep investigation
   - May uncover other issues

### Phase 2C (Infrastructure)
1. **Bug #027**: Supabase storage migration
2. **Bug #028**: Realtime schema fixes
3. **Bug #029**: Analytics configuration

## Success Metrics

### Quantitative Metrics
- Zero 404 errors on tour page
- 500 errors reduced by 95%
- Build time <60 seconds
- All tests passing

### Qualitative Metrics
- Smooth tour booking experience
- Clear error messages
- Stable development environment
- Maintainable codebase

## Agent Coordination Protocol

### Communication Guidelines
1. All agents check this blueprint before starting
2. Update progress in task-specific journal entries
3. Flag blockers immediately
4. Request clarification on ambiguities
5. Validate against acceptance criteria

### Handoff Procedures
1. Database → Backend: Schema ready notification
2. Backend → Frontend: API documentation
3. Frontend → QA: Feature complete signal
4. QA → DevOps: Deployment approval

## Conclusion

This blueprint provides the strategic framework for Phase 2 bug fixes. The tour scheduling feature represents our highest priority user-facing need, while the infrastructure fixes ensure long-term stability. 

Agents should follow the implementation sequence and maintain strict adherence to the technical specifications and quality criteria outlined above. Regular checkpoint reviews will ensure we maintain architectural coherence throughout the implementation.

**Next Action**: Begin with Bug #026 (Vite path aliases) to unblock development, then proceed with Bug #004 (Tour scheduling) implementation.