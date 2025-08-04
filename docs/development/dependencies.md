# SpicebushWebapp Dependency Map

*Last Updated: 2025-07-15*
*Purpose: Track all project dependencies and component relationships for safe refactoring*

## Critical Impact Zones

### 🔴 HIGH IMPACT (Changes affect multiple systems)

#### `src/lib/supabase.ts`
**Affects**: Authentication, Admin Dashboard, Tuition Calculator, All Admin Pages
- **Direct Dependents**: 15+ files
- **Functions**: Database queries, auth state, admin privilege checking
- **Breaking Changes Risk**: CRITICAL
- **Test Before Changes**: All auth flows, admin functions, database operations

#### `src/components/AuthForm.astro`
**Affects**: All authentication pages (login, register, forgot-password, update-password)
- **Direct Dependents**: 4 auth pages
- **External Dependencies**: `lucide-astro` (8 icons), `supabase.ts`, `development-helpers.ts`
- **Breaking Changes Risk**: HIGH
- **Test Before Changes**: All authentication flows, form validation, error handling

#### `src/layouts/Layout.astro`
**Affects**: All pages (site-wide template)
- **Direct Dependents**: Every page in the application
- **Features**: SEO meta tags, global CSS, structured data
- **Breaking Changes Risk**: HIGH
- **Test Before Changes**: Page rendering, SEO tags, accessibility features

#### `src/components/Header.astro`
**Affects**: Site-wide navigation and user experience
- **Direct Dependents**: Most pages
- **Internal Dependencies**: `AuthNav.astro`
- **External Dependencies**: `lucide-astro` (Menu, Phone, Mail icons)
- **Breaking Changes Risk**: HIGH
- **Test Before Changes**: Navigation, mobile menu, responsive design

### 🟡 MEDIUM IMPACT (Changes affect specific features)

#### `src/components/AuthNav.astro`
**Affects**: User authentication state display across site
- **Used By**: `Header.astro` (embedded navigation)
- **Dependencies**: `supabase.ts`, `lucide-astro` (User, LogOut, Settings icons)
- **Breaking Changes Risk**: MEDIUM
- **Test Before Changes**: Auth state display, user menu functionality

#### `src/components/TuitionCalculator.astro`
**Affects**: Tuition calculation functionality
- **Used By**: `/admissions/tuition-calculator.astro`
- **Dependencies**: `supabase.ts`, `lucide-astro` (8 icons)
- **Database Tables**: `tuition_programs`, `tuition_rates`, `tuition_settings`
- **Breaking Changes Risk**: MEDIUM
- **Test Before Changes**: Calculation logic, database queries, pricing display

#### `src/pages/admin/index.astro`
**Affects**: Admin dashboard overview
- **Dependencies**: `supabase.ts`, `lucide-astro` (22 icons)
- **Database Tables**: `tuition_programs`, `tuition_rates`, `teacher_leaders`
- **Breaking Changes Risk**: MEDIUM
- **Test Before Changes**: Admin authentication, data display, navigation

#### `src/lib/development-helpers.ts`
**Affects**: Development/testing experience
- **Used By**: `AuthForm.astro`
- **Dependencies**: `supabase.ts`
- **Features**: Test email validation, enhanced error handling
- **Breaking Changes Risk**: LOW (development only)
- **Test Before Changes**: Test account creation, validation logic

### 🟢 LOW IMPACT (Isolated components)

#### Individual Page Components
- `HeroSection.astro`, `ValuePropositions.astro`, `Testimonials.astro`, etc.
- **Risk**: LOW - Self-contained display components
- **Dependencies**: Minimal, mostly `lucide-astro` icons
- **Test Before Changes**: Visual rendering, responsive design

#### Individual Auth Pages
- `/auth/login.astro`, `/auth/register.astro`, etc.
- **Risk**: LOW - Simple wrappers around `AuthForm.astro`
- **Dependencies**: `Layout.astro`, `AuthForm.astro`
- **Test Before Changes**: Page routing, form integration

## Database Integration Points

### Tables by Usage
- **`tuition_programs`**: Admin Dashboard, TuitionCalculator
- **`tuition_rates`**: Admin Dashboard, TuitionCalculator  
- **`tuition_settings`**: TuitionCalculator
- **`teacher_leaders`**: Admin Dashboard

### Critical Database Operations
1. **Authentication**: User management via Supabase Auth
2. **Admin Queries**: Multiple table joins for dashboard data
3. **Tuition Calculations**: Real-time pricing queries
4. **Teacher Management**: CRUD operations for staff data

## External Package Dependencies

### Core Framework Dependencies
- **Astro 5.2.5**: Main framework (ALL files depend on this)
- **@astrojs/tailwind**: Styling integration (ALL styled components)
- **@astrojs/sitemap**: SEO functionality (Layout.astro)

### UI Dependencies  
- **lucide-astro 0.468.0**: Icon library (25+ components use this)
  - Most frequently used: User, LogOut, Menu, Calculator, DollarSign
  - **Breaking Changes Risk**: MEDIUM (widespread icon usage)

### Backend Dependencies
- **@supabase/supabase-js 2.39.1**: Database and auth client
  - **Breaking Changes Risk**: CRITICAL (authentication and data)

### Styling Dependencies
- **TailwindCSS 3.4.16**: Utility CSS framework
  - Custom theme with school-specific colors and typography
  - **Breaking Changes Risk**: HIGH (affects all styling)

## Pre-Change Testing Checklist

### Before Modifying Core Dependencies
- [ ] Test all authentication flows (login, register, logout)
- [ ] Verify admin dashboard functionality
- [ ] Check tuition calculator operations
- [ ] Test responsive design across breakpoints
- [ ] Validate SEO meta tags and structured data
- [ ] Verify database connectivity and queries

### Before Modifying Components
- [ ] Identify all dependent files using this dependency map
- [ ] Test component in isolation
- [ ] Test integration with dependent components
- [ ] Check icon usage and display
- [ ] Validate accessibility features
- [ ] Test mobile and desktop layouts

### Before Database Changes
- [ ] Backup existing data
- [ ] Test migration scripts locally
- [ ] Verify all affected queries still work
- [ ] Check admin dashboard data display
- [ ] Test tuition calculator with new schema
- [ ] Validate authentication still functions

## Change Impact Analysis Template

```
Component/File Being Modified: ________________
Risk Level (High/Medium/Low): ________________
Direct Dependencies: _________________________
Dependent Components: ________________________
Database Tables Affected: ____________________
Testing Required:
- [ ] Unit tests
- [ ] Integration tests  
- [ ] End-to-end user flows
- [ ] Database operations
- [ ] Authentication flows
- [ ] Responsive design
```

## Quick Reference Commands

```bash
# Find component usage
grep -r "ComponentName" src/

# Find import dependencies  
grep -r "from.*filename" src/

# Find lucide icon usage
grep -r "lucide-astro" src/

# Find supabase usage
grep -r "supabase" src/

# Check for database table references
grep -r "table_name" src/
```