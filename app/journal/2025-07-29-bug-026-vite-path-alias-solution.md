# Bug #026 - Vite Path Alias Resolution Failure - Solution Design

## Bug Analysis

### Current State
- **TypeScript Configuration**: Path aliases are properly configured in `tsconfig.json`:
  - `@/*` → `./src/*`
  - `@components/*` → `./src/components/*`
  - `@layouts/*` → `./src/layouts/*`
  - `@lib/*` → `./src/lib/*`
  - `@utils/*` → `./src/utils/*`
  - `@styles/*` → `./src/styles/*`
  - `@content/*` → `./src/content/*`

- **Vite Configuration**: Currently only minimal Vite config exists in `astro.config.mjs`
- **Usage**: Path aliases are actively used throughout the codebase (20+ files)
- **Problem**: Vite doesn't resolve these aliases during build/dev, causing module resolution errors

### Root Cause
Vite requires its own alias configuration separate from TypeScript's path mapping. While TypeScript understands the aliases for type checking, Vite needs explicit configuration to resolve these paths during bundling.

## Comprehensive Solution Design

### 1. Architecture Overview
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  TypeScript     │     │     Vite        │     │     Astro       │
│  tsconfig.json  │────▶│  resolve.alias  │────▶│  astro.config   │
│  (type checking)│     │  (bundling)     │     │  (framework)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2. Implementation Strategy

#### Phase 1: Configure Vite Aliases in Astro Config
Since Astro uses Vite under the hood, we'll add the alias configuration to the Vite section of `astro.config.mjs`.

**Key Changes:**
1. Import Node.js `path` module for proper path resolution
2. Add `resolve.alias` configuration to match TypeScript paths
3. Use `fileURLToPath` for ESM compatibility

#### Phase 2: Ensure Vitest Compatibility
Update `vitest.config.ts` to inherit the same alias configuration for consistent testing.

#### Phase 3: Validation and Testing
1. Test all existing imports continue working
2. Verify dev server resolves aliases correctly
3. Ensure production build completes successfully
4. Confirm tests run with proper alias resolution

### 3. Detailed Implementation Plan

#### File: `astro.config.mjs`
```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { fileURLToPath, URL } from 'node:url';

// https://astro.build/config
export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    tailwind(),
    sitemap(),
    react()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    define: {
      'process.env': {}
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url))
      }
    }
  }
});
```

#### File: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(
  getViteConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: ['node_modules', 'dist', '.astro']
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url))
      }
    }
  })
);
```

### 4. Alternative Approaches Considered

#### Option A: Separate vite.config.js
- **Pros**: Clean separation of concerns
- **Cons**: Astro might not pick up external Vite config correctly
- **Decision**: Not recommended for Astro projects

#### Option B: Using vite-tsconfig-paths Plugin
- **Pros**: Automatically syncs with tsconfig.json paths
- **Cons**: Additional dependency, potential version conflicts
- **Decision**: Manual configuration is more reliable

#### Option C: Symlinks
- **Pros**: Works at filesystem level
- **Cons**: Platform-specific issues, git complications
- **Decision**: Not recommended

### 5. Testing Strategy

#### Unit Test Verification
```bash
# Run existing tests to ensure no breakage
npm run test:unit
```

#### Integration Test
```bash
# Test full application flow
npm run test:integration
```

#### Manual Testing Checklist
1. [ ] Start dev server: `npm run dev`
2. [ ] Verify no import errors in console
3. [ ] Navigate to pages using path aliases
4. [ ] Build production: `npm run build`
5. [ ] Preview production build: `npm run preview`
6. [ ] Run all tests: `npm run test:all`

### 6. Rollback Plan
If issues arise:
1. Remove `resolve.alias` from both config files
2. Revert to relative imports temporarily
3. Investigate specific error messages

### 7. Future Considerations
1. Consider creating a shared alias configuration file
2. Add lint rule to enforce alias usage over relative imports
3. Document alias conventions in developer guide

### 8. Success Criteria
- ✅ All existing @lib imports resolve correctly
- ✅ Dev server starts without module resolution errors
- ✅ Production build completes successfully
- ✅ All tests pass with alias imports
- ✅ TypeScript and Vite aliases are in sync

## Implementation Priority
1. **High Priority**: Update `astro.config.mjs` first (core fix)
2. **Medium Priority**: Update `vitest.config.ts` (testing consistency)
3. **Low Priority**: Additional tooling/linting rules

## Risk Assessment
- **Low Risk**: Changes are configuration-only
- **No Breaking Changes**: Existing relative imports continue to work
- **Reversible**: Easy to rollback if needed