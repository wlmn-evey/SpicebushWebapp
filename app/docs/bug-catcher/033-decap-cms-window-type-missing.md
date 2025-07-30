---
id: 033
title: Decap CMS Window Type Declarations Missing
severity: medium
status: open
category: development
created: 2025-07-28
lastUpdated: 2025-07-28
affectedComponents:
  - Decap CMS
  - TypeScript types
  - Admin panel
relatedBugs: [016, 031]
---

# Decap CMS Window Type Declarations Missing

## Summary
The TypeScript compiler reports that `window.CMS` does not exist, indicating missing type declarations for Decap CMS. This affects the admin panel functionality and TypeScript compilation.

## Current Behavior
- TypeScript error: `Property 'CMS' does not exist on type 'Window & typeof globalThis'`
- CMS backend registration fails type checking
- IDE cannot provide proper autocomplete for CMS APIs

## Expected Behavior
- Proper TypeScript types for Decap CMS
- window.CMS should be properly typed
- Full IDE support for CMS development

## Root Cause
Missing ambient type declarations for Decap CMS global objects. The library either:
1. Doesn't provide TypeScript definitions
2. Types aren't being imported correctly
3. Need manual type declarations

## Impact
- **User Impact**: None (compile-time only)
- **Development Impact**: Poor IDE support, potential runtime errors
- **Business Impact**: Harder to maintain admin panel code

## Technical Details
Errors occur in:
- `src/lib/cms/supabase-backend.ts` (lines 412-413)
- Any file attempting to use `window.CMS`

## Proposed Solution
Create type declarations file:
```typescript
// src/types/decap-cms.d.ts
declare global {
  interface Window {
    CMS: {
      registerBackend: (name: string, backend: any) => void;
      // Add other CMS methods
    };
  }
}
```

## Testing Notes
- Verify TypeScript compilation passes
- Check IDE autocomplete works
- Ensure CMS functionality unchanged
- Test admin panel still functions