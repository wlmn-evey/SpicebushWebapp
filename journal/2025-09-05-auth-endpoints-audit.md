# Authentication Endpoints Audit - September 5, 2025

## Current Authentication Flow Analysis

### 1. Auth Pages (Front-end)

#### `/auth/sign-in`
- **Component**: Uses `@clerk/astro` SignIn component
- **Current State**: Partially working (Clerk component loads)
- **Issues**: Backend validation returns mocks

#### `/auth/sign-up`
- **Component**: Uses `@clerk/astro` SignUp component  
- **Current State**: Partially working (Clerk component loads)
- **Issues**: Backend validation returns mocks

#### `/auth/callback`
- **Purpose**: Magic link callback handler
- **Current State**: BROKEN - verifyMagicLink() has no implementation

### 2. API Endpoints

#### `/api/auth/send-magic-link`
- **Handler**: Netlify function (if exists)
- **Current State**: Unknown - needs testing
- **Called By**: clerk-client.ts sendMagicLink()

#### `/api/auth/send-magic-link-adapter`
- **Handler**: Adapter pattern endpoint
- **Current State**: Routes between Clerk/Supabase
- **Issues**: Dual system confusion

### 3. Middleware Protection

#### Protected Routes
```typescript
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
]);
```
- **Current State**: Middleware checks work
- **Issues**: After middleware, mock functions break flow

### 4. Authentication Functions Status

| Function | File | Status | Issue |
|----------|------|--------|-------|
| `validateSession()` | clerk-helpers.ts | BROKEN | Returns mock data |
| `getCurrentUser()` | clerk-client.ts | BROKEN | Always returns null |
| `verifyMagicLink()` | clerk-client.ts | BROKEN | No implementation |
| `sendMagicLink()` | clerk-client.ts | PARTIAL | Calls Netlify function |
| `isAuthenticated()` | clerk-client.ts | BROKEN | Depends on getCurrentUser |
| `signOut()` | clerk-client.ts | PARTIAL | Only clears cookie |
| `shouldUseClerk()` | clerk-helpers.ts | WORKING | Returns based on env |
| `checkAdminAccess()` | clerk-helpers.ts | WORKING | Checks email list |

### 5. Environment Variables Required

```env
# Clerk Auth (currently test keys)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Feature Flag
USE_CLERK_AUTH=clerk  # Active

# Coming Soon Mode
COMING_SOON_MODE=false  # Disabled
```

### 6. Auth Flow Diagram

```
User -> /auth/sign-in
  -> Clerk SignIn Component (WORKS)
    -> Clerk API (WORKS with test keys)
      -> Middleware checks (WORKS)
        -> validateSession() (BROKEN - returns mock)
          -> Admin access denied or fake granted
```

### 7. Critical Path to Fix

1. **validateSession()** - Most critical, affects all auth
2. **getCurrentUser()** - Needed for user state
3. **verifyMagicLink()** - Can be removed (Clerk handles)
4. **Remove adapter pattern** - Simplify to Clerk-only

### 8. Testing Checklist

- [ ] Can user reach sign-in page?
- [ ] Does Clerk component render?
- [ ] Can user enter credentials?
- [ ] Does sign-in attempt work?
- [ ] Is session created properly?
- [ ] Can user access /admin after sign-in?
- [ ] Does sign-out clear session?
- [ ] Are protected routes blocked when not authenticated?

### 9. Console Errors to Monitor

```javascript
// Expected errors with mocks:
"validateSession: Migrating from mock to Clerk SDK"
"getCurrentUser error: [error details]"
"Auth middleware failed for [path]"
```

### 10. Rollback Triggers

If any of these occur, rollback immediately:
- Sign-in success rate < 50%
- Admin panel returns 404/500
- More than 3 console errors on auth pages
- Build time > 10 minutes