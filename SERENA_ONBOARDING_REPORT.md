# SpicebushWebapp - Serena MCP Onboarding Report

## Project Overview
**Date:** 2025-09-05
**Project Path:** `/Users/eveywinters/CascadeProjects/SpicebushWebapp`
**Framework:** Astro with TypeScript
**Current Branch:** testing

## Project Statistics
- **Total TypeScript Files:** 127
- **Total Astro Components:** 123
- **Total Pages:** 68 Astro pages
- **Primary Language:** TypeScript
- **Build System:** Astro + Netlify

## Technology Stack

### Core Framework
- **Astro:** Server-side rendering framework
- **TypeScript:** Type-safe JavaScript
- **React:** UI components (integrated with Astro)
- **Tailwind CSS:** Utility-first CSS framework

### Authentication
- **Primary:** Clerk (fully migrated from Supabase Auth)
- **Status:** Migration complete, Clerk is active
- **Configuration:** 
  - Sign-in URL: `/auth/sign-in`
  - Admin redirect: `/admin`
  - Magic link support enabled

### Database
- **Supabase:** PostgreSQL database (data only, not auth)
- **Usage:** Content storage, settings, user data
- **Note:** Authentication moved to Clerk

### Deployment
- **Platform:** Netlify
- **Auto-deploy Branch:** `testing`
- **Testing URL:** https://spicebush-testing.netlify.app
- **Build Command:** `npm run build`
- **Functions:** Netlify Functions in `/app/netlify/functions`

## Project Structure

```
SpicebushWebapp/
├── app/                      # Main application directory
│   ├── src/
│   │   ├── pages/           # 68 Astro pages
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Page layouts
│   │   ├── lib/            # Libraries and utilities
│   │   │   ├── auth/       # Authentication modules
│   │   │   └── ...
│   │   └── content/        # Static content
│   ├── public/             # Static assets
│   ├── netlify/           # Netlify functions
│   ├── scripts/           # Build and utility scripts
│   └── tests/            # Test suites
├── journal/              # Development logs and documentation
├── netlify.toml         # Netlify configuration
└── package.json         # Root package configuration
```

## Current State Analysis

### Configuration Issues (Critical)
1. **Netlify Config Conflict:** Base directory misconfiguration causing build failures
2. **Dual Package.json:** Conflicting scripts between root and app level
3. **Build Path Issues:** Functions and publish directories need adjustment

### Authentication System
- Successfully migrated from Supabase Auth to Clerk
- Multiple auth pages exist for both systems (cleanup needed)
- Magic link functionality implemented
- Admin panel requires Clerk authentication

### Database Layer
- Supabase configured for data storage only
- Service role keys properly configured
- Database operations separate from authentication

### Key High-Impact Files
Per CLAUDE.md documentation:
- `src/lib/auth/clerk-client.ts` - Authentication system
- `src/lib/supabase.ts` - Database operations
- `src/layouts/Layout.astro` - Affects every page
- `src/components/Header.astro` - Site navigation

## Discovered Issues & Recommendations

### Immediate Actions Needed
1. **Fix Netlify Configuration:** Remove `base = "app"` from netlify.toml
2. **Consolidate Build Scripts:** Standardize development workflow
3. **Clean Up Auth Files:** Remove legacy Supabase auth components

### Project Health Score: 6/10

**Strengths:**
- Well-organized file structure
- Comprehensive documentation in journal/
- Clear migration path from Supabase to Clerk
- Automated deployment pipeline

**Weaknesses:**
- Configuration conflicts preventing development
- Mixed authentication implementations
- Incomplete migration cleanup
- Multiple test and debug files in production code

## Memory Index Created

### Critical Paths
- **Authentication Flow:** `/auth/sign-in` → Clerk → `/admin`
- **Database Access:** Through Supabase client in `src/lib/`
- **Build Pipeline:** GitHub push → Netlify auto-deploy → Live site
- **Admin Panel:** Protected routes under `/admin/`

### Development Workflow
1. Local development: `cd app && npm run dev`
2. Push to testing branch for auto-deployment
3. Monitor at https://app.netlify.com/sites/spicebush-testing/deploys
4. Test at https://spicebush-testing.netlify.app

### Environment Variables Required
- Clerk: `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Supabase: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Email: `UNIONE_API_KEY`
- Feature: `COMING_SOON_MODE`

## Agent Recommendations
Based on CLAUDE.md, the following specialized agents should be used:
- **systematic-debugger:** For configuration conflicts
- **project-architect-qa:** For planning fixes
- **cloud-deployment-architect:** For Netlify issues
- **project-janitor:** For cleanup after fixes

## Next Steps
1. Execute FOUNDATION_RESTORATION_PLAN.md Phase 1
2. Complete authentication system cleanup
3. Remove debug and test files from production
4. Update documentation to reflect current state
5. Prepare for production deployment

## Project Context
This is a web application for Spicebush Montessori School, a Montessori school in Glen Mills, Pennsylvania. The site includes:
- Public information pages (programs, admissions, about)
- Admin panel for content management
- Blog system
- Donation and enrollment forms
- Parent resources section

The project is actively being simplified, moving from a complex Docker + Strapi CMS setup to a streamlined Astro static site with MDX for content.

---

*Report generated during Serena MCP onboarding process*
*Note: Serena MCP tools not directly available, manual indexing performed*