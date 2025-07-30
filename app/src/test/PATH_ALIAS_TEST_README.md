# Path Alias Resolution Test

This test verifies that all TypeScript path aliases are working correctly after the Docker build improvements for Bug #026.

## Path Aliases Tested

- `@lib` → `./src/lib`
- `@components` → `./src/components`
- `@layouts` → `./src/layouts`
- `@utils` → `./src/utils`

## Running the Test

There are three ways to run this test:

### 1. Using npm script (recommended)
```bash
npm run test:aliases
```

### 2. Using the test script
```bash
./test-aliases.sh
```

### 3. Using Vitest directly
```bash
npx vitest run -c vitest.config.aliases.ts src/test/path-aliases.test.ts
```

## What the Test Verifies

1. **Import Resolution**: Ensures that all path aliases resolve correctly without module resolution errors
2. **Function Execution**: Tests that imported functions from each alias work correctly
3. **Type Resolution**: Verifies TypeScript types are resolved through the `@/` alias
4. **Module Isolation**: Confirms that imports from different aliases don't interfere with each other

## Test Files Created

- `/src/test/path-aliases.test.ts` - Main test file
- `/src/utils/test-helper.ts` - Helper for testing @utils alias
- `/src/components/test-component-helper.ts` - Helper for testing @components alias
- `/src/layouts/test-layout-helper.ts` - Helper for testing @layouts alias
- `/vitest.config.aliases.ts` - Simplified Vitest config without Astro integration

## Notes

- The test uses a separate Vitest configuration (`vitest.config.aliases.ts`) to avoid conflicts with Astro's Vite plugins
- All test helper files can be safely deleted after verification if desired
- The test confirms that the path aliases work in the local environment, which should match the Docker environment after the build improvements