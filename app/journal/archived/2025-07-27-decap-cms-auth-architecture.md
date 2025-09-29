# Decap CMS Production Authentication Architecture

## Date: 2025-07-27

## Current State Analysis

### Existing Setup
1. **Test-repo backend**: Currently using `test-repo` which bypasses authentication
2. **Supabase Authentication**: Site uses Supabase for auth with magic links
3. **Domain Restrictions**: Admin access limited to @eveywinters.com and @spicebushmontessori.org
4. **CMS Integration**: Basic integration exists at `/admin/cms` but lacks proper auth flow
5. **Auth Check**: Custom `checkAdminAuth` function verifies both cookies and Supabase session

### Key Issues Identified
1. Test-repo backend is not production-ready
2. No proper integration between Supabase auth and Decap CMS
3. Users see errors when accessing content management sections
4. Missing Git-based backend for actual content management
5. No OAuth flow to bridge Supabase and CMS authentication

## Research Findings

### Decap CMS Authentication Requirements
- Decap CMS requires a backend for authentication
- Supports external OAuth clients for custom auth flows
- No official API for custom backends, but community solutions exist
- Common approaches include proxy backends and OAuth bridges

### Community Solutions
1. **Cloudflare Worker Proxy**: OAuth proxy for GitHub authentication
2. **Astro Integration**: SSR-based OAuth routes for GitHub
3. **Docker Self-Hosted**: Custom backend implementations
4. **External OAuth Clients**: Bridge between custom auth and CMS

### Supabase Integration Potential
- Supabase Auth provides OAuth capabilities
- Can act as identity provider with JWT tokens
- Supports custom OAuth flows and redirects
- Has management API for user verification

## Proposed Architecture

### High-Level Design
```
User -> Supabase Auth -> OAuth Bridge -> Decap CMS -> GitHub API
```

### Components
1. **Supabase Auth Layer**: Primary authentication (existing)
2. **OAuth Bridge Service**: Custom proxy to translate Supabase auth to CMS
3. **Decap CMS**: Content management interface
4. **GitHub Backend**: Actual content storage and versioning

### Authentication Flow
1. User logs in via Supabase magic link
2. Supabase session verified and admin status checked
3. OAuth bridge generates temporary token for CMS
4. Decap CMS uses token to authenticate with GitHub
5. Content changes pushed to GitHub repository

## Implementation Plan

### Phase 1: OAuth Bridge Development
- Create custom OAuth service at `/api/auth/cms-oauth`
- Implement token generation and validation
- Bridge Supabase sessions to CMS authentication

### Phase 2: GitHub Backend Integration
- Set up GitHub OAuth application
- Configure repository access and permissions
- Implement content synchronization

### Phase 3: Production Deployment
- Replace test-repo with GitHub backend
- Configure proper OAuth endpoints
- Set up secure token management

### Phase 4: User Experience Enhancement
- Seamless authentication flow
- Single sign-on experience
- Error handling and recovery

## Security Considerations
1. Token expiration and refresh
2. Domain-based access control
3. Secure session management
4. API rate limiting
5. Audit logging

## Next Steps
1. Design detailed OAuth bridge API
2. Create implementation tasks
3. Set up GitHub OAuth application
4. Plan migration from test-repo