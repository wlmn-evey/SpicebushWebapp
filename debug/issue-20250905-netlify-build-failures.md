# Debug Session: Netlify Build Failures
Date: 2025-09-05
Status: Active

## Problem Statement
Netlify build failures for the Spicebush webapp with context indicating:
- Missing Clerk environment variables in build script
- Dual netlify.toml configuration conflict (one in root, one in app/)
- Authentication system migration issues

## Symptoms
- Build failures on Netlify
- Potential TypeScript compilation issues
- Clerk authentication integration problems
- Environment variable configuration issues

## Hypotheses
1. Dual netlify.toml files causing configuration conflicts
2. Missing or incorrect Clerk environment variables in build process
3. Build script (build-with-env.sh) has issues with environment setup
4. TypeScript compilation failing due to Clerk integration
5. Missing dependencies or package resolution issues
6. SSR/build-time configuration issues with Clerk

## Investigation Log

### Test 1: Run build to capture actual error messages
Result: Build failed with import error
Error: "default" is not exported by "src/lib/auth/index.ts", imported by "src/pages/api/auth/send-magic-link-adapter.ts"
Conclusion: The import statement `import auth from '@lib/auth';` is trying to import a default export that doesn't exist

### Test 2: Examine auth module exports
Result: Found the issue in auth module structure
- src/lib/auth/index.ts exports `authAdapter as auth` but NOT as default export
- send-magic-link-adapter.ts tries to import `auth` as default: `import auth from '@lib/auth';`
- Should be: `import { auth } from '@lib/auth';` (named import)

### Test 3: Check netlify.toml configuration conflicts
Result: Dual netlify.toml files confirmed
- Root: /Users/eveywinters/CascadeProjects/SpicebushWebapp/netlify.toml (sets base = "app")
- App:  /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/netlify.toml (sets base = ".")
Conclusion: This creates configuration conflicts - Netlify may be confused about which config to use

### Test 4: Check build script environment variables
Result: build-with-env.sh examined
- MISSING: No Clerk environment variables are set in the build script
- Only Supabase and Unione variables are configured
- Clerk requires: PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
Conclusion: Clerk auth will fail during build due to missing environment variables

### Test 5: Find all default import usage
Result: Found 2 files importing auth as default:
- src/pages/api/auth/send-magic-link-adapter.ts:2
- src/components/AuthFormAdapter.astro:196
Conclusion: Both files need to be updated to use named imports

## Root Cause
The primary build failure is caused by **incorrect import syntax**. The auth module exports `authAdapter as auth` as a named export, but consuming files are trying to import it as a default export.

**Exact Error**: `"default" is not exported by "src/lib/auth/index.ts", imported by "src/pages/api/auth/send-magic-link-adapter.ts"`

**Secondary Issues**:
1. **Dual netlify.toml files** creating configuration conflicts
2. **Missing Clerk environment variables** in build script
3. **TypeScript/ESM module resolution issues** due to incorrect imports

## Solution
### Step 1: Fix Import Syntax Issues
Agent: Code reviewer agent
Instructions: 
- Change `import auth from '@lib/auth';` to `import { auth } from '@lib/auth';` in:
  - `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/api/auth/send-magic-link-adapter.ts` line 2
  - `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/AuthFormAdapter.astro` line 196

### Step 2: Resolve Netlify Configuration Conflict
Agent: Deployment specialist agent
Instructions:
- Remove the duplicate netlify.toml file in the app directory
- Keep only the root netlify.toml file which correctly sets `base = "app"`
- The root config is correct and complete

### Step 3: Add Missing Clerk Environment Variables
Agent: Environment configuration agent
Instructions:
- Add Clerk environment variables to `build-with-env.sh`:
  ```bash
  # Clerk Configuration (add after line 29)
  export PUBLIC_CLERK_PUBLISHABLE_KEY="${PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_default}"
  export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_default}"
  export PUBLIC_CLERK_SIGN_IN_URL="${PUBLIC_CLERK_SIGN_IN_URL:-/auth/sign-in}"
  export PUBLIC_CLERK_SIGN_UP_URL="${PUBLIC_CLERK_SIGN_UP_URL:-/auth/sign-up}"
  export PUBLIC_CLERK_AFTER_SIGN_IN_URL="${PUBLIC_CLERK_AFTER_SIGN_IN_URL:-/admin}"
  export PUBLIC_CLERK_AFTER_SIGN_UP_URL="${PUBLIC_CLERK_AFTER_SIGN_UP_URL:-/admin}"
  ```

### Step 4: Verify TypeScript Configuration
Agent: TypeScript specialist agent
Instructions:
- Ensure env.d.ts includes all required Clerk environment variable types
- Check that tsconfig.json module resolution supports the path aliases
- Verify no circular import dependencies exist in the auth module

## Verification
- [ ] Build completes without import errors
- [ ] No TypeScript compilation errors
- [ ] Netlify build succeeds with single configuration file
- [ ] Clerk integration works in development and production modes
- [ ] All auth-related imports resolve correctly