# Micro-Step: Phase 2.2 - Update Import Statements for @lib Alias

## Current State
- TypeScript path aliases have been configured and approved
- Build completes successfully with aliases configured
- Found 20+ files using relative imports (../../lib/, ../../components/, ../../layouts/)

## Next Micro-Step for Elrond Agent

### Task: Update @lib imports in a single directory
**Scope**: Update only the imports in `/src/pages/admin/` directory that reference `../../lib/` to use `@lib/`

**Specific Instructions**:
1. Target directory: `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/admin/`
2. Find all files in this directory that contain `from '../../lib/`
3. Replace these imports with `from '@lib/`
4. Maintain exact same import paths after the lib/ portion
5. Test that the build still completes successfully after changes

**Files to update** (based on grep results):
- `/src/pages/admin/settings.astro` - has 2 imports from ../../lib/
- `/src/pages/admin/users.astro` - has 1 import from ../../lib/
- `/src/pages/admin/index.astro` - has 2 imports from ../../lib/
- `/src/pages/admin/cms.astro` - has 1 import from ../../lib/

**Example transformation**:
```typescript
// Before:
import { checkAdminAuth } from '../../lib/admin-auth-check';
import { supabase } from '../../lib/supabase.ts';

// After:
import { checkAdminAuth } from '@lib/admin-auth-check';
import { supabase } from '@lib/supabase.ts';
```

**Success Criteria**:
1. All ../../lib/ imports in the admin directory are updated to @lib/
2. No other changes are made
3. Build completes successfully with: `npm run build`

## Why This Micro-Step?
- Limited scope: Only 4 files in one directory
- Clear pattern: Simple find/replace of ../../lib/ with @lib/
- Testable: Can verify with build command
- Safe: Only affects admin pages, not critical user-facing pages