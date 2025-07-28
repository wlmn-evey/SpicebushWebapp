# Spicebush Webapp Refactoring Plan

## Executive Summary

This refactoring plan addresses critical complexity issues in the Spicebush Montessori webapp. The primary goals are:
- Reduce component complexity scores to acceptable levels (<15 for pages, <10 for components)
- Separate concerns (UI, state management, business logic)
- Remove unnecessary abstractions and features
- Simplify the overall architecture

## Priority 1: Tuition Admin Page (Complexity: 59 → Target: <15)

### Current Problems
1. **Monolithic script section** - 225+ lines of mixed concerns in a single script tag
2. **Global function pollution** - Functions attached to window object
3. **Mixed responsibilities** - Data fetching, form handling, UI updates all in one place
4. **Inline event handlers** - Using onclick attributes instead of proper event delegation
5. **Manual DOM manipulation** - Direct getElementById calls throughout

### Solution Approach
Break into smaller, focused modules:
1. **Data Layer** - Separate Supabase operations
2. **Form Components** - Individual components for each form type
3. **State Management** - Centralized state store
4. **Event Handling** - Proper event delegation

### Files to Create/Modify

#### 1. Create `/src/lib/stores/tuition-store.ts`
```typescript
// Centralized state management for tuition data
import { writable } from 'svelte/store';
import type { Program, Rate, Settings } from '../types/tuition';

export const programs = writable<Program[]>([]);
export const rates = writable<Rate[]>([]);
export const settings = writable<Settings>({});
```

#### 2. Create `/src/lib/api/tuition-api.ts`
```typescript
// All Supabase operations for tuition
export const tuitionAPI = {
  programs: {
    list: () => supabase.from('tuition_programs').select('*').order('display_order'),
    create: (data) => supabase.from('tuition_programs').insert([data]),
    update: (id, data) => supabase.from('tuition_programs').update(data).eq('id', id),
    delete: (id) => supabase.from('tuition_programs').delete().eq('id', id)
  },
  // Similar for rates and settings
};
```

#### 3. Refactor `/src/pages/admin/tuition.astro`
- Remove all script logic
- Import individual components
- Use Astro's built-in hydration directives

#### 4. Create focused components:
- `/src/components/admin/ProgramForm.astro`
- `/src/components/admin/RateForm.astro`
- `/src/components/admin/SettingsForm.astro`
- `/src/components/admin/EditModal.astro`

### Estimated Complexity Reduction
- Main page: 59 → ~10 (only layout and component composition)
- Each form component: ~8-10 (focused responsibility)
- API layer: ~5 (pure data operations)
- Store: ~3 (simple state management)

### Implementation Steps
1. Create the API layer first (no breaking changes)
2. Create the store module
3. Extract forms into components one by one
4. Refactor main page to use new components
5. Remove global functions and inline handlers

## Priority 2: HoursWidget Component (Complexity: 47 → Target: <10)

### Current Problems
1. **250+ lines in a single component** - Mixing data fetching, rendering, animations
2. **Complex time calculations** - All inline in render functions
3. **Manual DOM manipulation** - Direct createElement calls
4. **Hardcoded animations** - Staggered delays calculated inline
5. **Debug mode mixed with production code**

### Solution Approach
1. Extract time calculations to pure functions
2. Use Astro's templating instead of manual DOM creation
3. Separate data fetching from presentation
4. Remove or simplify animations
5. Extract debug mode to development-only component

### Files to Create/Modify

#### 1. Already exists: `/src/lib/hours-utils.ts`
Good - utility functions are already extracted. Need to use them more consistently.

#### 2. Create `/src/components/hours/HoursDay.astro`
```astro
---
// Single day display component
export interface Props {
  day: string;
  hours: DayHours;
  isToday: boolean;
  currentTime?: number;
}
---
<!-- Focused on rendering a single day -->
```

#### 3. Create `/src/components/hours/HolidayNotice.astro`
```astro
---
// Holiday message component
export interface Props {
  holiday: Holiday;
}
---
<!-- Focused on holiday display -->
```

#### 4. Simplify `/src/components/HoursWidget.astro`
- Remove all DOM manipulation
- Use Astro's component composition
- Delegate to sub-components
- Remove inline styles and animations

### Estimated Complexity Reduction
- Main widget: 47 → ~12 (orchestration only)
- HoursDay component: ~8 (focused rendering)
- HolidayNotice: ~5 (simple display)

## Priority 3: Architecture Simplification

### Current Problems
1. **Three-tier overkill** - Astro + Supabase + Strapi for a simple school website
2. **Unused Strapi CMS** - Adding complexity without value
3. **Mixed paradigms** - Static generation + dynamic data fetching
4. **Over-abstracted utilities** - Many single-use "utility" functions

### Solution Approach
1. Remove Strapi completely (not being used)
2. Use Astro's static generation for most content
3. Keep Supabase only for truly dynamic data (tuition calculator, hours)
4. Inline simple utilities that are only used once

### Implementation Steps
1. Audit Strapi usage (confirm it's not used)
2. Remove Strapi configuration and dependencies
3. Move static content to Astro content collections
4. Simplify build process

## Priority 4: Component Cleanup

### Components to Simplify
1. **TuitionCalculator** - Extract calculation logic from UI
2. **Navigation components** - Remove duplicate mobile/desktop versions
3. **Form components** - Standardize validation and error handling
4. **Admin components** - Consistent patterns for CRUD operations

### General Refactoring Principles
1. **Single Responsibility** - Each component does ONE thing
2. **Props over State** - Prefer stateless components
3. **Composition over Inheritance** - Use slots and component composition
4. **Remove Dead Code** - Delete unused features
5. **Simplify Animations** - CSS transitions over JS animations

## Implementation Order

### Phase 1: Data Layer (1 week)
1. Create API modules for all data operations
2. Create type definitions
3. Test all data operations
4. No breaking changes - runs alongside existing code

### Phase 2: Component Extraction (2 weeks)
1. Start with highest complexity components
2. Extract one component at a time
3. Test after each extraction
4. Maintain backwards compatibility

### Phase 3: Architecture Cleanup (1 week)
1. Remove Strapi
2. Simplify build configuration
3. Optimize bundle size
4. Update deployment process

### Phase 4: Polish (1 week)
1. Remove all dead code
2. Standardize patterns
3. Update documentation
4. Performance optimization

## Risk Mitigation

1. **Testing Strategy**
   - Create test data fixtures
   - Test each component in isolation
   - End-to-end tests for critical paths
   - Keep old code until new code is verified

2. **Rollback Plan**
   - Git branch for each phase
   - Feature flags for gradual rollout
   - Keep database schema unchanged
   - Document all changes

3. **Dependencies**
   - No breaking changes to data structure
   - Maintain all existing URLs
   - Keep API contracts stable
   - Preserve all functionality

## Success Metrics

1. **Complexity Scores**
   - All components < 10
   - All pages < 15
   - Average complexity < 8

2. **Code Metrics**
   - 50% reduction in lines of code
   - 75% reduction in global functions
   - Zero inline event handlers
   - No manual DOM manipulation

3. **Performance**
   - 30% faster page loads
   - 50% smaller JavaScript bundle
   - Better Lighthouse scores

4. **Maintainability**
   - Clear separation of concerns
   - Consistent patterns throughout
   - Easy to understand for new developers
   - Reduced cognitive load

## Conclusion

This refactoring plan addresses the core issues of over-engineering and complexity in the Spicebush webapp. By breaking down monolithic components, separating concerns, and removing unnecessary abstractions, we can create a maintainable, performant application that serves its purpose without unnecessary complexity.

The incremental approach ensures we can deliver value continuously while minimizing risk. Each phase builds on the previous one, and we can pause or adjust the plan based on real-world feedback.

Remember: **The best code is no code, and the second best is simple code.**