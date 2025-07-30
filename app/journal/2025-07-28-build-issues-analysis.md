# Build Issues Analysis - Node.js Adapter

## Date: 2025-07-28

## Current State
- @astrojs/node adapter installed and configured
- Build fails with multiple compilation errors
- Server output mode configured with standalone Node.js mode

## Identified Build Issues

### 1. Fragment Syntax Error (CRITICAL)
**File**: `src/pages/admin/tuition/edit.astro:492:50`
**Error**: Unable to assign attributes when using <> Fragment shorthand syntax
**Root Cause**: Astro compiler doesn't support attribute assignment with shorthand Fragment syntax
**Impact**: Blocks entire build process

### 2. Route Collision Warnings (HIGH)
Multiple routes defined in both directory index files and standalone files:
- `/admin/hours` - defined in both `hours/index.astro` and `hours.astro`
- `/admin/tuition` - defined in both `tuition/index.astro` and `tuition.astro`
- `/admin` - defined in both `admin/index.astro` and `admin.astro`
**Impact**: Will become hard errors in future Astro versions

### 3. Import Path Resolution (MEDIUM)
**Issue**: "@/lib/admin-config" alias not configured
**Root Cause**: TSConfig lacks path mapping configuration
**Impact**: Build-time import resolution failures

### 4. Empty Content Collections (LOW)
**Warning**: No files found in `announcements` and `events` directories
**Impact**: Content collection warnings, no functional impact

## Fragment Usage Analysis
Found Fragment imports in:
- `src/pages/blog.astro:6` - used correctly with longhand syntax
- `src/pages/coming-soon.astro:5` - used correctly with longhand syntax  
- `src/pages/admin/tuition/edit.astro:13` - problematic shorthand usage at line 492

## Technical Assessment
- Node.js adapter configuration is correct
- Astro config properly set up with server output mode
- Fragment syntax errors are specific to attribute assignment in JSX-like expressions
- Route collisions indicate duplicate page structures

## Next Steps
Comprehensive build fix plan needed addressing:
1. Fragment syntax corrections
2. Route collision resolution
3. Import path alias configuration
4. Content collection structure cleanup