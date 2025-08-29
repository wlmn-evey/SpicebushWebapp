# Netlify Identity Migration

Date: 2025-08-29
Status: In Progress

## Background
Migrating from Supabase Auth to Netlify Identity due to:
- Persistent vendor bundle conflicts with React
- Client-side module import issues
- Overcomplexity for simple admin authentication needs

## Migration Scope
- Replace Supabase authentication with Netlify Identity
- Keep Supabase for database operations only
- Support existing admin emails (@eveywinters.com, @spicebushmontessori.org)
- Maintain all existing admin functionality

## Implementation Steps

### Phase 1: Configuration
- [ ] Configure netlify.toml for Identity
- [ ] Create email templates
- [ ] Set up admin user list

### Phase 2: Frontend Integration
- [ ] Create NetlifyAuthLayout with widget
- [ ] Build new login page
- [ ] Update callback handling

### Phase 3: Backend Updates  
- [ ] Create netlify-auth.ts module
- [ ] Update admin-auth-check.ts
- [ ] Modify middleware for JWT

### Phase 4: Bulk Updates
- [ ] Update all 18 admin pages
- [ ] Update all 24 API endpoints
- [ ] Update auth components

### Phase 5: Testing & Deployment
- [ ] Test authentication flow
- [ ] Clean up old code
- [ ] Deploy to testing branch

## Benefits
- Eliminates vendor conflicts completely
- Simpler authentication flow
- Better Netlify platform integration
- Free tier sufficient for needs

## Files Modified
- New: netlify-auth.ts, NetlifyAuthLayout.astro, netlify-login.astro
- Updated: admin-auth-check.ts, middleware.ts, all admin pages, all API endpoints
- Removed: magic-login.astro, Supabase auth functions

## Testing Checklist
- [ ] Login with magic link works
- [ ] Session persistence works
- [ ] Logout clears session
- [ ] API endpoints authenticate properly
- [ ] Admin pages redirect when not authenticated

## Rollback Plan
If issues arise:
1. Revert to previous commit
2. Re-enable Supabase auth
3. Document specific issues for resolution

## Notes
- Netlify Identity provides built-in UI components
- JWT tokens handled automatically
- Email templates customizable in Netlify dashboard
- Free tier supports up to 1,000 users/month