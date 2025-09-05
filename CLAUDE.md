# Claude Instructions for SpicebushWebapp

## 🚨 CRITICAL: Testing Strategy

**DO NOT TEST LOCALLY** - All testing is done on the `testing` branch via Netlify auto-deploys from GitHub. Never run tests on the local development environment.

## Project Context

### Current Setup
- **Framework**: Astro with TypeScript
- **Authentication**: Clerk (fully migrated from Supabase Auth)
- **Database**: Supabase (for data only, not auth)
- **Deployment**: Netlify (automatic deploys from `testing` branch)
- **Testing URL**: https://spicebush-testing.netlify.app

### Branch Strategy
- **Production**: `main` (reserved for future production)
- **Testing**: `testing` (PRIMARY DEVELOPMENT BRANCH)
- **Feature Branches**: Create from `testing`, merge back to `testing`

## Development Workflow

### 1. Local Development
```bash
# Setup
cp .env.example .env.local
npm install
npm run dev

# Pre-push checks (run these before pushing)
npm run lint          # Check linting
npm run lint:fix      # Auto-fix issues
npm run typecheck     # TypeScript checks
```

### 2. Push to Testing
```bash
git add .
git commit -m "Your message"
git push origin testing
```

### 3. Monitor Deployment
- Watch build at: https://app.netlify.com/sites/spicebush-testing/deploys
- Test live at: https://spicebush-testing.netlify.app
- Check logs: `npx netlify logs:deploy`

## Environment Variables (Set in Netlify Dashboard)

```env
# Authentication (Clerk)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Supabase - data only)
PUBLIC_SUPABASE_URL=https://...supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email Service
UNIONE_API_KEY=...

# Feature Flags
COMING_SOON_MODE=false
```

## Memory Management

Use the `journal/` directory for session continuity:
1. Create dated markdown files (e.g., `journal/2025-09-05-feature-work.md`)
2. Log decisions, discoveries, and context
3. Archive old entries to `journal/archived/` when outdated
4. Reference recent entries for context

## Code Quality Standards

### Linting & Formatting
- **Required before commits**: `npm run lint && npm run typecheck`
- **Auto-fix available**: `npm run lint:fix && npm run format`
- **Style**: TypeScript strict, no `any`, no `console.log` in production

### High-Impact Files (Test Thoroughly After Changes)
Per `DEPENDENCY_MAP.md`:
- `src/lib/clerk-client.ts` - Authentication system
- `src/lib/supabase.ts` - Database operations
- `src/layouts/Layout.astro` - Affects every page
- `src/components/Header.astro` - Site navigation

## Specialized Agents

Use these agents when their expertise matches your task:

- `systematic-debugger` - Debugging errors
- `project-architect-qa` - Planning new features
- `complexity-guardian` - Code review for simplicity
- `test-automation-expert` - Testing on deployed site
- `cloud-deployment-architect` - Netlify configuration
- `spicebush-content-verifier` - Content accuracy
- `spicebush-ux-advocate` - School-specific UX

## Minimum Viable Change Philosophy

**Every change should:**
- ✅ Solve only the stated problem
- ✅ Maintain existing functionality
- ✅ Pass linting and type checks
- ✅ Be deployable immediately
- ✅ Avoid scope creep

**Before starting any task:**
1. Understand the exact requirement
2. Check `DEPENDENCY_MAP.md` for impact
3. Choose the minimal solution
4. Implement and push to testing
5. Verify on deployed site

## Quick Command Reference

### Development
```bash
npm run dev              # Start dev server
npm run lint            # Check code quality
npm run typecheck       # Check TypeScript
```

### Netlify CLI
```bash
npx netlify status      # Check site status
npx netlify env:list    # List env variables
npx netlify logs:deploy # View deploy logs
```

### Troubleshooting Deploys
1. Check build logs at Netlify dashboard
2. Common issues:
   - Missing env variables → Set in Netlify dashboard
   - Build errors → Test with `npm run build` locally
   - Auth issues → Verify Clerk keys are set

## Key Project Documents

- `DEPENDENCY_MAP.md` - File dependencies and impact analysis
- `SPICEBUSH_SITE_ANALYSIS.md` - School requirements and features
- `PROJECT_PHASES_AND_UPGRADES.md` - Development roadmap
- Recent journal entries in `journal/` - Current context

## Important Reminders

- **NO LOCAL TESTING** - Use Netlify deployments only
- **Clerk for Auth** - Not Supabase Auth (fully migrated)
- **Testing Branch** - Always work on `testing` unless specified
- **Push to Deploy** - Every push triggers automatic deployment
- **Check Impact** - Always consult `DEPENDENCY_MAP.md` before changes