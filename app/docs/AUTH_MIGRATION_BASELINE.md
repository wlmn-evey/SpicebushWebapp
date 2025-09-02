# Authentication Migration Baseline Documentation

## Current State (Before Migration)

### Authentication System: Mixed Supabase and Clerk

#### Current Auth Flows

1. **Magic Link Flow (Supabase)**
   - User enters email on `/auth/sign-in` or `/test-magic-link`
   - Supabase sends magic link via email
   - User clicks link → redirected to `/auth/callback`
   - Callback page validates token and creates session
   - Admin check performed using `isAdminEmail()` function
   - Cookie set for middleware: `sbms-admin-auth=true`
   - Redirect to `/admin` dashboard

2. **Password Authentication (Partially Implemented)**
   - Sign-in form exists but primarily uses magic links
   - Password reset flow through Supabase

3. **Clerk Integration (Partial)**
   - Clerk middleware configured in `middleware.ts`
   - Sign-in/Sign-up pages exist at `/auth/sign-in` and `/auth/sign-up`
   - Clerk components imported but not fully integrated

#### Key Files and Their Roles

**Authentication Core:**
- `/src/lib/supabase.ts` - Supabase client and auth helpers
- `/src/lib/clerk-auth.ts` - Placeholder Clerk auth functions
- `/src/lib/admin-config.ts` - Admin email whitelist
- `/src/lib/admin-auth-check.ts` - Admin authorization logic

**Pages:**
- `/src/pages/auth/callback.astro` - Magic link callback handler
- `/src/pages/auth/sign-in.astro` - Clerk SignIn component (not magic link)
- `/src/pages/auth/sign-up.astro` - Clerk SignUp component
- `/src/pages/test-magic-link.astro` - Supabase magic link test page
- `/src/pages/auth/magic-link-debug.astro` - Debug page for magic links

**Components:**
- `/src/components/AuthForm.astro` - Supabase auth form
- `/src/components/AuthNav.astro` - Navigation auth state

**Middleware:**
- `/src/middleware.ts` - Clerk middleware with coming soon logic

**API Routes:**
- `/src/pages/api/auth/send-magic-link.ts` - Magic link sender
- `/src/pages/api/auth/check.ts` - Auth status checker

#### Admin Access Control

**Authorized Emails:**
- admin@spicebushmontessori.org
- director@spicebushmontessori.org  
- evey@eveywinters.com

**Authorized Domains:**
- @spicebushmontessori.org
- @eveywinters.com

#### Session Management

**Supabase Sessions:**
- Stored in localStorage
- Auto-refresh enabled
- Persist session enabled

**Cookies:**
- `sbms-admin-auth` - Admin authentication flag
- Max age: 604800 seconds (7 days)

#### Environment Variables

**Required for Auth:**
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY

## Migration Goals

1. **Single Auth Provider**: Use Clerk exclusively
2. **Maintain Magic Link**: Keep passwordless auth option
3. **Preserve Admin Access**: Same email whitelist
4. **Zero Downtime**: Feature flag for gradual rollout
5. **Clean Architecture**: Remove all Supabase auth code
6. **Improved Testing**: Comprehensive test coverage
7. **Better Documentation**: Clear auth flow documentation

## Success Criteria

- [ ] All admin users can authenticate
- [ ] Magic links work reliably
- [ ] No Supabase auth dependencies remain
- [ ] Tests pass with 100% coverage
- [ ] Performance equal or better
- [ ] Clean, maintainable code

## Rollback Plan

If issues occur during migration:
1. Set `USE_CLERK_AUTH=supabase` in environment
2. Redeploy with previous configuration
3. Investigate and fix issues
4. Retry migration with fixes

## Timeline

- Phase 0-2: Day 1 (Setup and parallel implementation)
- Phase 3-5: Day 2 (Testing and gradual migration)
- Phase 6-8: Day 3 (Admin pages and cleanup)
- Phase 9-11: Day 4 (Quality, docs, validation)
- Phase 12: Day 5 (Final cutover)

---
*Generated: ${new Date().toISOString()}*
*Branch: migration/supabase-to-clerk*