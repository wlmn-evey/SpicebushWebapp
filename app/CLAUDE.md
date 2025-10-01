# Claude Instructions for SpicebushWebapp

## 🚨 CRITICAL: Agent Usage Policy

**ALWAYS prefer using specialized agents for tasks unless a suitable agent is not available.** Agents provide:
- Systematic approaches to complex problems
- Specialized expertise for specific domains
- Better error handling and debugging
- More thorough analysis and solutions

Before starting any task, check if an appropriate agent exists:
- `systematic-debugger` - For debugging errors and issues
- `project-architect-qa` - For planning new features or architecture
- `complexity-guardian` - For reviewing code complexity
- `ui-design-specialist` - For UI/UX improvements
- `cloud-deployment-architect` - For deployment and infrastructure
- `test-automation-expert` - For testing strategies
- `montessori-copywriter` - For school content
- `seo-redirect-copywriter` - For SEO and migrations
- `spicebush-content-verifier` - For content accuracy
- `spicebush-ux-advocate` - For school-specific UX
- `project-organization-specialist` - For file organization
- `project-delivery-manager` - For production readiness

**Only perform tasks directly if no suitable agent is available for the specific request.**

## 🚨 CRITICAL: Docker Configuration Rules

**NEVER CREATE NEW DOCKER-COMPOSE FILES!**

### The ONE Configuration Rule
- **USE ONLY**: `/app/docker-compose.yml` (full Supabase stack)
- **ARCHIVED**: All other configurations are in `/docker/archived-configs/` - DO NOT USE
- **NO ALTERNATIVES**: If something doesn't work, FIX the main configuration

### When Tempted to Create a "Simpler" Setup:
1. **STOP** - This has been tried and failed multiple times
2. **CHECK** - Read `/docker/archived-configs/DO_NOT_USE_THESE.md`
3. **FIX** - Update the main `docker-compose.yml` instead
4. **DOCUMENT** - Log issues in `/app/journal/` not new configs

### Database Connection Rules:
- App uses Supabase client library - it REQUIRES full Supabase
- PostgREST alone is NOT compatible
- Direct PostgreSQL is NOT compatible
- There is NO "simple" alternative that works

### Quick Start is Already Simple:
```bash
cp .env.example .env.local
docker compose up -d
# Done! That's it!
```

## Remote Development & Deployment Workflow

**IMPORTANT**: We are focused on remote development with the `testing` branch as our primary testing location.

### Branch Strategy
- **Production Branch**: `main` (reserved for future production use)
- **Testing Branch**: `testing` - PRIMARY DEVELOPMENT AND TESTING LOCATION
- **Feature Branches**: Create from `testing` for isolated work, merge back to `testing`
- **Current Active Branch**: Always work on `testing` unless creating a feature branch

### Deployment Pipeline
- **Testing Site URL**: https://spicebush-testing.netlify.app
- **Admin Dashboard**: https://app.netlify.com/projects/spicebush-testing
- **Automatic Deployments**: Every push to `testing` triggers a Netlify build
- **Build Status**: Monitor via Netlify dashboard or CLI (`npx netlify status`)
- **Current Mode**: Coming Soon mode active (controlled by `COMING_SOON_MODE` env var)

### Remote Development Process
1. **Always work on `testing` branch** unless specifically creating a feature
2. **Push changes to remote** to trigger automatic Netlify deployment
3. **Monitor build progress** via Netlify dashboard or CLI
4. **Test on live URL** after successful deployment
5. **Check build logs** if deployment fails

### Build Configuration
- **Build Script**: `build-with-env.sh` handles environment setup
- **Node Version**: 20 (specified in netlify.toml)
- **Memory Allocation**: 4GB max old space size for large builds
- **Authentication**: Clerk (Supabase handles data only)
- **Environment Variables**: Set in Netlify dashboard, not committed to repo

### Netlify CLI Commands
```bash
# Check deployment status
npx netlify status

# View site info
npx netlify sites:list

# Deploy manually (if needed)
npx netlify deploy --prod

# Check environment variables
npx netlify env:list

# View build logs
npx netlify logs:function
```

### Testing & Validation on Remote
1. **After each deployment**:
   - Visit https://spicebush-testing.netlify.app
   - Check browser console for errors
   - Test authentication flows
   - Verify database connections
   - Test responsive design on mobile

2. **Monitor build health**:
   - Build time should be under 5 minutes
   - Check for build warnings in Netlify logs
   - Verify all environment variables are set
   - Ensure no sensitive data in build logs

3. **Common deployment issues**:
   - Missing environment variables → Set in Netlify dashboard
   - Build memory errors → Already configured with NODE_OPTIONS
   - Authentication failures → Check Clerk keys and Supabase environment values
   - Database connection issues → Verify Supabase credentials

### Environment Variable Management
**NEVER commit sensitive keys to the repository!**

Required environment variables (set in Netlify dashboard):
- `PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk backend
- `PUBLIC_SUPABASE_URL` - Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `COMING_SOON_MODE` - Set to "false" to disable coming soon page
- `UNIONE_API_KEY` - Email service credentials

### Deployment Workflow Best Practices
1. **Before pushing to `testing`**:
   - Run `npm run lint && npm run typecheck`
   - Test locally with `npm run dev`
   - Check for console errors
   - Verify no sensitive data in code

2. **After pushing to `testing`**:
   - Monitor Netlify build logs
   - Wait for deployment to complete
   - Test on live URL immediately
   - Check for regression issues

3. **If deployment fails**:
   - Check Netlify build logs for errors
   - Verify all dependencies are listed in package.json
   - Ensure build script has proper permissions
   - Test build locally with `npm run build`

### Current Deployment Status
- **Site Status**: Live and accessible
- **Mode**: Coming Soon mode (redirects most pages)
- **Known Issues**: See DEPLOYMENT_STATUS_NEW.md
- **Next Steps**: 
  1. Add real Clerk API keys
  2. Disable Coming Soon mode
  3. Complete authentication flow

## Netlify CLI Reference & Troubleshooting

### Essential Netlify CLI Commands
```bash
# Project status and configuration
npx netlify status

# Deploy commands
npx netlify deploy              # Draft deploy
npx netlify deploy --prod       # Production deploy
npx netlify deploy --trigger    # Trigger remote build without uploading files
npx netlify deploy --timeout 600000  # Deploy with 10-minute timeout

# Build commands
npx netlify build               # Run build locally with Netlify environment
npx netlify build --context production  # Build with production context
npx netlify build --dry         # Dry run to see what would be built

# Logs and monitoring
npx netlify logs:deploy         # Stream deploy logs in real-time
npx netlify logs:function       # Stream function logs
npx netlify logs:function my-function  # Specific function logs

# Environment variables
npx netlify env:list            # List all environment variables
npx netlify env:set KEY value   # Set an environment variable
npx netlify env:unset KEY       # Remove an environment variable

# Site management
npx netlify sites:list          # List all sites
npx netlify link                # Link local project to Netlify site
npx netlify unlink              # Unlink local project from Netlify site
```

### Viewing Build Logs

1. **Web Interface**:
   - Direct URL: `https://app.netlify.com/sites/spicebush-testing/deploys/[DEPLOY_ID]`
   - Copy entire log: Use clipboard icon in web interface
   - Share specific lines: Click line numbers, URL updates to `#L5-L10` format
   - Logs retained for 7 days on free tier

2. **CLI Access**:
   ```bash
   # Stream live deploy logs
   npx netlify logs:deploy
   
   # Note: Historical logs must be viewed via web interface
   ```

3. **API Access** (for automation):
   ```bash
   # List recent deployments
   npx netlify api listSiteDeploys --data '{"site_id": "27a429f4-9a58-4421-bc1f-126d70d81aa1"}'
   
   # Get specific deploy info
   npx netlify api getSiteDeploy --data '{"site_id": "27a429f4-9a58-4421-bc1f-126d70d81aa1", "deploy_id": "DEPLOY_ID"}'
   ```

### Debugging Failed Builds

#### Common Error Messages & Solutions

1. **"Build script returned non-zero exit code: 2"**
   - npm install failed → Check package-lock.json is committed
   - Build script failed → Test locally with `./build-with-env.sh`
   - Missing dependencies → Ensure all deps in package.json

2. **"Could not resolve dependency" or "Conflicting peer dependency"**
   - Set environment variable: `NPM_FLAGS=--legacy-peer-deps`
   - Or use: `NPM_FLAGS=--force`
   - Common with React 17+ and Node 16.5.1+

3. **"Command failed with exit code 137" (Out of memory)**
   - Already mitigated with `NODE_OPTIONS=--max_old_space_size=4096`
   - If persists, optimize build process

4. **"Deploy did not succeed: Deploy directory 'dist' does not exist"**
   - Ensure build command creates dist/ directory
   - Check build script runs `npm run build`

#### Troubleshooting Steps

1. **First, always verify local build works**:
   ```bash
   npm install
   npm run build
   ./build-with-env.sh  # Test exact Netlify command
   ```

2. **Clear cache and retry**:
   - In Netlify dashboard: "Deploy settings" → "Clear cache and deploy site"
   - Or trigger new build: `npx netlify deploy --trigger`

3. **Check environment variables**:
   ```bash
   npx netlify env:list
   ```
   Compare with required variables in build script

4. **Review recent changes**:
   ```bash
   git diff HEAD~1  # What changed since last successful deploy?
   ```

5. **Enable verbose logging**:
   Add to build command: `npm run build --verbose`

### Build Configuration Tips

1. **Optimize npm install**:
   ```toml
   # In netlify.toml
   [build.environment]
     NPM_FLAGS = "--legacy-peer-deps"
   ```

2. **Cache dependencies**:
   Netlify automatically caches node_modules between builds

3. **Debug build locally**:
   ```bash
   # Simulate Netlify environment
   export NODE_VERSION=20
   export NODE_OPTIONS="--max_old_space_size=4096"
   ./build-with-env.sh
   ```

4. **Monitor build time**:
   - Target: Under 5 minutes
   - If over 10 minutes, optimize or upgrade plan

### Quick Fixes for Common Issues

```bash
# Build fails after dependency update
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "fix: Update package-lock with legacy peer deps"
git push origin testing

# Build succeeds locally but fails on Netlify
npx netlify build  # Test with Netlify's build environment

# Need to see what Netlify sees
npx netlify build --dry  # Shows build plan without executing

# Emergency: Site is down, need quick fix
git revert HEAD  # Revert last commit
git push origin testing  # Trigger rebuild with previous code
```

## Development Standards & Policies

### Linting Policies

**IMPORTANT**: All code must pass linting before commits. Run these commands before making changes:

```bash
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting errors
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run typecheck     # TypeScript type checking
```

#### Code Style Requirements
- **TypeScript**: Use strict typing, avoid `any`, prefer explicit types
- **Imports**: No unused imports, organize imports logically
- **Console**: No `console.log` in production code (warnings only)
- **Security**: No `eval`, `new Function`, or script URLs
- **Formatting**: Single quotes, 2-space indentation, 100 char line limit
- **Astro**: Follow Astro-specific linting rules for components

#### ESLint Configuration
- Based on `eslint:recommended` and `@typescript-eslint/recommended`
- Includes Astro-specific rules and accessibility checks
- Separate rules for pages (allow console) vs components (strict)
- Auto-fixes available for most style issues

### Testing Policies

**IMPORTANT**: All critical functionality must be tested. Use these testing approaches:

#### Testing Strategy
1. **Unit Tests**: Test utility functions and isolated logic
2. **Component Tests**: Test component behavior and props
3. **Integration Tests**: Test component interactions and API calls
4. **E2E Tests**: Test complete user workflows (authentication, admin functions)

#### Testing Commands
```bash
npm run test          # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI for interactive testing
npm run test:coverage # Generate test coverage report
```

#### Testing Requirements
- **Critical Functions**: `src/lib/supabase.ts`, `src/lib/development-helpers.ts`
- **Authentication**: All auth flows must have integration tests
- **Database**: Mock Supabase client for consistent testing
- **Components**: Test props, rendering, and user interactions
- **Coverage**: Aim for 80%+ coverage on utility functions

#### Mock Strategy
- **Supabase**: Use provided mock in `src/test/setup.ts`
- **External APIs**: Mock all external service calls
- **Environment**: Test with both development and production configurations

### Dependency Management

**CRITICAL**: Always consult `DEPENDENCY_MAP.md` before making changes to understand impact scope.

#### High-Impact Files (Require Extensive Testing)
- `src/lib/supabase.ts` - Affects authentication and all database operations
- `src/components/AuthForm.astro` - Affects all authentication pages
- `src/layouts/Layout.astro` - Affects every page in the application
- `src/components/Header.astro` - Affects site-wide navigation

#### Pre-Change Checklist
1. **Check Dependency Map**: Review `DEPENDENCY_MAP.md` for impact analysis
2. **Run Tests**: Ensure all existing tests pass
3. **Plan Testing**: Identify which systems need testing after changes
4. **Backup Data**: For database changes, ensure backups exist

#### Change Process
1. Identify component/file to modify
2. Check `DEPENDENCY_MAP.md` for risk level and dependents
3. Write/update tests for the change
4. Make changes following linting policies
5. Run full test suite: `npm run test && npm run lint && npm run typecheck`
6. Test dependent components manually
7. Verify authentication and database operations still work

## Development Workflow

### Daily Development Process
1. **Start**: `npm run dev` for development server
2. **Code**: Follow linting and testing policies
3. **Check**: Run `npm run lint && npm run typecheck` frequently
4. **Test**: Run `npm run test:watch` during development
5. **Commit**: Ensure all checks pass before committing

### Pre-Deployment Checklist
- [ ] All tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript checks pass (`npm run typecheck`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] Authentication flows tested manually
- [ ] Admin dashboard functions verified
- [ ] Database operations tested
- [ ] Responsive design checked

### Environment Requirements
- **Node.js**: Latest LTS version
- **Dependencies**: Run `npm install` after pulling changes
- **Environment**: Configure `.env.local` with Supabase credentials
- **Database**: Local Supabase instance or connection to staging

## Security & Best Practices

### Authentication Security
- Never log authentication tokens or user credentials
- Use Supabase RLS (Row Level Security) for data protection
- Validate admin permissions on both client and server
- Test authentication edge cases (expired tokens, invalid users)

### Database Security
- Always use parameterized queries through Supabase client
- Implement proper error handling for database operations
- Test with various user permission levels
- Validate data before database operations

### Code Security
- ESLint rules prevent `eval`, `new Function`, script URLs
- No hardcoded secrets or API keys in code
- Use environment variables for configuration
- Validate all user inputs

## Project-Specific Guidelines

### Astro Development
- Use `.astro` components for pages and layout
- Use TypeScript for all logic and utilities
- Follow Astro's component prop typing patterns
- Leverage Astro's build-time optimizations

### Supabase Integration
- All database operations go through `src/lib/supabase.ts`
- Use provided auth helpers for consistency
- Test database operations with mocked client
- Handle database errors gracefully

### Styling Guidelines
- Use Tailwind utility classes consistently
- Follow custom color palette in `tailwind.config.mjs`
- Ensure responsive design on all components
- Use custom typography scale for consistency

## Emergency Procedures

### If Tests Fail
1. Check recent changes against `DEPENDENCY_MAP.md`
2. Run tests individually to isolate failures
3. Check for breaking changes in dependencies
4. Verify environment configuration

### If Authentication Breaks
1. Check `src/lib/supabase.ts` for changes
2. Verify Supabase connection and credentials
3. Test with development helper functions
4. Check browser developer tools for client errors

### If Database Queries Fail
1. Verify Supabase connection
2. Check database schema matches queries
3. Test with Supabase dashboard directly
4. Review recent migration files for conflicts

## /refine Command

The `/refine` command provides comprehensive codebase analysis and optimization. Use this command to maintain code quality and eliminate technical debt.

### Usage

```bash
npm run refine              # Full analysis and safe optimizations
npm run refine:dry-run      # Analysis only, no changes applied
```

### What /refine Does

#### 🔍 Analysis Phase
1. **Dependency Mapping**: Builds complete file dependency graph
2. **Unused File Detection**: Finds files that are never imported
3. **Complexity Analysis**: Identifies overly complex components
4. **Duplicate Code Detection**: Finds identical or similar code blocks
5. **Import Analysis**: Detects unused imports and inefficient patterns
6. **Optimization Opportunities**: Identifies performance and maintainability issues

#### 🔧 Optimization Phase (when not using --dry-run)
1. **Safe Cleanups**: Removes console.log statements from production code
2. **Import Optimization**: Removes clearly unused imports
3. **Code Formatting**: Applies consistent formatting where safe
4. **File Organization**: Suggests better file structure

#### 📊 Reporting
- Generates detailed `REFINEMENT_REPORT.md`
- Updates `DEPENDENCY_MAP.md` if significant changes detected
- Provides actionable recommendations for manual review

### When to Use /refine

**Run Before Major Changes**:
- Before implementing new features
- Before refactoring existing code
- After adding new dependencies
- When codebase feels "messy" or hard to navigate

**Run Periodically**:
- Weekly during active development
- Before releases
- After team members add significant code
- When onboarding new developers

### /refine Output Analysis

#### Risk Levels
- **🔴 High Risk**: Manual review required before changes
- **🟡 Medium Risk**: Review recommended, safe to auto-fix
- **🟢 Low Risk**: Safe for automatic optimization

#### Categories
- **Performance**: Issues affecting runtime performance
- **Maintainability**: Code organization and readability
- **Consistency**: Adherence to project standards
- **Security**: Potential security concerns
- **Cleanup**: Unused code and imports

### Integration with Development Workflow

#### Pre-Commit Hook (Recommended)
```bash
# Add to .git/hooks/pre-commit
npm run refine:dry-run
if [ $? -ne 0 ]; then
  echo "⚠️  /refine detected issues. Run 'npm run refine' to fix."
  exit 1
fi
```

#### CI/CD Integration
```yaml
# Add to GitHub Actions or similar
- name: Code Quality Check
  run: npm run refine:dry-run
```

#### Development Routine
1. Start development session: `npm run dev`
2. Make changes following linting policies
3. Before committing: `npm run refine:dry-run`
4. If issues found: `npm run refine`
5. Review changes and commit

### /refine Safety

#### What /refine Will Auto-Fix
- ✅ Remove console.log statements
- ✅ Remove clearly unused imports
- ✅ Fix basic formatting issues
- ✅ Organize import statements

#### What /refine Will Only Report
- ⚠️ Complex component refactoring suggestions
- ⚠️ Duplicate code that requires manual merge
- ⚠️ Architectural improvements
- ⚠️ Security concerns requiring developer judgment

#### What /refine Will Never Touch
- 🚫 Database schema or migrations
- 🚫 Environment configuration files
- 🚫 Third-party library code
- 🚫 Test fixtures or mock data
- 🚫 Build output or generated files

### Interpreting /refine Results

#### Unused Files
Review carefully - some files may be:
- Entry points for future features
- Imported dynamically
- Required by build process
- Development utilities

#### Complex Components
High complexity score (>15) suggests:
- Component doing too many things
- Nested logic that could be extracted
- Opportunity for smaller, focused components

#### Duplicate Code
Consider:
- Creating shared utility functions
- Extracting common patterns to components
- Using TypeScript generics for similar logic

#### Optimization Opportunities
Address based on priority:
1. Security issues (immediate)
2. Performance problems (high priority)
3. Maintainability improvements (medium priority)
4. Style consistency (low priority)

### Troubleshooting /refine

#### "Cannot read file" errors
- Check file permissions
- Ensure no files are currently being edited
- Verify TypeScript compilation succeeds

#### False positives in unused files
- Add files to exclusion patterns if needed
- Consider if files are dynamically imported
- Check if files are used by build process

#### Performance issues with large codebases
- Use `--scope` parameter for targeted analysis
- Run during off-hours for full analysis
- Consider excluding large generated files

## Thinking Matrix Framework

**CRITICAL**: All problem-solving must follow the Thinking Matrix methodology to ensure minimum viable changes that achieve necessary results without sacrificing safety or functionality.

### Core Principle: MVP (Minimum Viable Change)

Every action follows the **Minimum Viable Change** principle:
- ✅ Solves the immediate problem
- ✅ Maintains system safety and functionality  
- ✅ Avoids scope creep and unnecessary complexity
- ✅ Preserves existing working systems
- ✅ Can be validated and tested quickly

### Problem-Solving Phases

#### Phase 1: BREAKDOWN (Understanding)
**Before any action, ask:**
1. What exactly needs to change? (Read user request literally)
2. What systems are involved? (Check DEPENDENCY_MAP.md)
3. What are the constraints? (Read existing code/config)
4. What would "done" look like? (Define measurable outcome)

**🚫 Rabbit Hole Prevention:**
- [ ] Am I solving the stated problem or a different one?
- [ ] Am I adding features not requested?
- [ ] Am I refactoring unrelated code?
- [ ] Am I over-engineering the solution?
- [ ] Can this be done in fewer steps?

#### Phase 2: TRACK (Planning)
**Task Classification:**
- **Trivial** (1-2 actions): Single file, no dependencies → Direct action
- **Simple** (3-5 actions): Few files, clear dependencies → TodoWrite + linear workflow
- **Complex** (6+ actions): Multiple systems → Break into Simple tasks

**Mandatory TodoWrite when:**
- Task requires >3 distinct actions
- Multiple files will be modified
- Any HIGH IMPACT component involved (per DEPENDENCY_MAP.md)
- User provides multiple requirements

#### Phase 3: ANALYZE (Current State)
**Tool Selection Matrix:**
- **Code Structure**: Glob + Read
- **Dependencies**: DEPENDENCY_MAP.md + Grep  
- **Database Schema**: Read migrations
- **Component Usage**: Grep for component name
- **Configuration**: Read config files

**Analysis Depth by Impact:**
- **LOW**: 2-3 tool calls (Read, Glob)
- **MEDIUM**: 5-7 tool calls (Read, Grep, DEPENDENCY_MAP)
- **HIGH**: 10+ tool calls (Task agent, thorough investigation)

#### Phase 4: PLAN (Solution Design)
**Solution Selection:**
- **Direct Edit**: Single file, obvious change (HIGH safety)
- **Multi-file Edit**: Related changes, clear dependencies (MEDIUM safety)
- **Component Creation**: New functionality needed (MEDIUM safety)
- **Architecture Change**: Fundamental restructuring (LOW safety - avoid)

#### Phase 5: ACT (Implementation)
**Execution Priority:**
- **P0**: Safety-critical fixes (auth, security, data loss)
- **P1**: Functionality restoration (broken features)
- **P2**: Feature implementation (new functionality)
- **P3**: Optimization (defer if scope unclear)

### Quality Gates

**✅ Before Starting:**
- [ ] Problem clearly understood
- [ ] DEPENDENCY_MAP.md consulted for impact
- [ ] Solution approach selected and justified
- [ ] TodoWrite created if complexity warrants

**✅ During Implementation:**
- [ ] Each change is minimal and focused
- [ ] Dependencies handled in correct order
- [ ] Testing after each significant change
- [ ] TodoWrite updated with progress

**✅ Before Completion:**
- [ ] Original problem is solved
- [ ] No unintended side effects
- [ ] Code follows linting policies
- [ ] Documentation updated if needed

### Anti-Patterns to Avoid

**🚫 Scope Creep:**
- "While I'm here, I should also..."
- "This would be better if I also..."
- Adding features not explicitly requested

**🚫 Over-Engineering:**
- Creating abstractions for single use
- Adding configuration for static requirements
- Building for hypothetical future needs

**🚫 Rabbit Holes:**
- Analysis taking longer than implementation
- Finding "interesting" unrelated problems
- Wanting to refactor unrelated code

### Thinking Matrix Validation

Use the thinking matrix checker for guidance:

```bash
npm run thinking-check "problem description"
```

This tool will:
- Analyze problem complexity and impact
- Recommend appropriate solution approach
- Validate approach follows MVP principles
- Show relevant quality gates

**Examples:**
```bash
npm run thinking-check "Add a new button to the header"
npm run thinking-check "Fix typo in About page"  
npm run thinking-check "Refactor authentication system"
```

### MCP Tool Integration

**Tool Selection Decision Tree:**
```
Need to search/find? → Known location: Read/Glob | Complex: Grep | Open-ended: Task
Need to modify code? → Single: Edit | Multiple: MultiEdit | New file: Write  
Need to understand? → Documentation: Read | Patterns: Grep/Glob | Complex: Task
Need to run commands? → Simple: Bash | Testing: npm scripts | Complex: Multiple Bash
```

**MCP Efficiency Rules:**
1. Batch related operations when possible
2. Use most specific tool for the job
3. Avoid redundant tool calls (don't re-read files)
4. Leverage Task agent for complex searches only
5. Keep tool usage focused on immediate need

### Success Metrics

A successful change should:
- ✅ Solve the stated problem completely
- ✅ Require minimal modifications to existing code
- ✅ Pass all existing tests and linting
- ✅ Maintain or improve system safety
- ✅ Be easily understood by future maintainers
- ✅ Be reversible if needed

**Remember: The best code is the code you don't have to write.**

For complete details, see `THINKING_MATRIX.md`.

## Project Context & Analysis

**IMPORTANT**: Always reference these key documents when working on features:
- `SPICEBUSH_SITE_ANALYSIS.md` - Comprehensive site analysis and feature recommendations
- `PROJECT_PHASES_AND_UPGRADES.md` - Strategic implementation roadmap with phases and tasks
- `PLANNED_FEATURES.md` - Detailed feature specifications and priorities

### School Identity Quick Reference
- **Ages Served**: 3-6 years old (preschool/primary)
- **Philosophy**: Authentic Montessori methodology with SPICES values
- **Core Mission**: "Tailored, accessible Montessori education for each child"
- **Unique Features**: Income-based FIT tuition model, 9-language support, radical accessibility

### SPICES Values Framework
- **S**ocial justice
- **P**eace  
- **I**nclusion
- **C**ommunity
- **E**nvironment
- **S**implicity

### Priority Feature Pipeline
**Immediate (High Priority)**:
1. Dynamic Tuition Calculator (FIT model)
2. Multilingual Content Management System
3. Native Tour Scheduling System
4. Blog and Content Management (Supabase Collections)
5. Integrated Feedback System

**Next Phase (Medium Priority)**:
6. Community Events Calendar
7. Resource Library
8. Staff Directory & Bios
9. Admissions Workflow Management
10. Financial Aid Application Portal

### Key Design Principles
- **Accessibility First**: All features must support diverse families and 9-language multilingual access
- **Community-Centered**: Non-hierarchical, family-school boundary blurring
- **Individual-Focused**: Child development tracking and personalized education support
- **Values-Driven**: Every feature should reflect SPICES values
- **Montessori-Authentic**: Teacher as facilitator, child-directed learning emphasis

### Technical Integration Requirements
- Replace Calendly dependency with native scheduling
- Replace Google Forms with integrated feedback system
- Support 9-language content management
- Income-based tuition calculation system
- Supabase content collections for blog and site copy management

### Content & Messaging Alignment
**Primary Messages to Reinforce**:
- "Individualized education for every child"
- "Accessible quality Montessori education" 
- "Community-centered learning environment"
- "Supporting each child's unlimited potential"

**Avoid**:
- Hierarchical or exclusive language
- Generic educational terminology
- Features that conflict with Montessori philosophy
- Accessibility barriers or complex interfaces

## Development Roadmap

**Current Implementation Status**: ~45% Complete

### Immediate Priorities (Phase 1 - Weeks 1-8)
1. **Fix Critical Issues**: Broken navigation, auth flow completion
2. **Activate Tuition Calculator**: Database integration, multi-child support
3. **Complete Admin Interface**: Hours management, communications hub
4. **Mobile Optimization**: Performance, accessibility, PWA setup

### Next Phase (Phase 2 - Weeks 9-16)
1. **Multilingual Support**: Starting with Spanish
2. **Blog Content**: Build out blog with Supabase content collections
3. **Native Tour Scheduling**: Replace Calendly dependency
4. **Community Calendar**: Events and RSVP system

### Future Development (Phase 3 - Weeks 17-24)
1. **Instagram Integration**: Social media feeds
2. **Resource Library**: Educational materials
3. **Complete 9-Language Support**: Full multilingual platform
4. **Advanced Analytics**: Predictive insights and reporting

For detailed implementation plans, see `PROJECT_PHASES_AND_UPGRADES.md`.

Remember: When in doubt, consult `DEPENDENCY_MAP.md`, `SPICEBUSH_SITE_ANALYSIS.md`, `PROJECT_PHASES_AND_UPGRADES.md`, and run the full test suite.
