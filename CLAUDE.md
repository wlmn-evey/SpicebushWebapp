# Claude Instructions for SpicebushWebapp

## 🎯 AGENT-FIRST POLICY

**CRITICAL**: Before ANY action, ask: "Is there an agent who would be optimal for this task?"

**ALWAYS** prefer using a specialized agent over direct action unless:
- The task is trivial (single file read, simple command)
- No suitable agent exists for the specific task
- The user explicitly requests direct action

Even in a chain of actions, **pause before each step** to consider agent delegation.

## 🚀 Serena MCP Integration

**IMPORTANT**: Serena MCP is ALWAYS RUNNING and provides semantic code understanding. Use it as your primary tool for code navigation and analysis.

### Primary Uses:
- **Code Search**: Use `mcp__serena__search_for_pattern` instead of grep for semantic search
- **Symbol Location**: Use `mcp__serena__find_symbol` for functions/classes/variables
- **File Finding**: Use `mcp__serena__find_file` instead of glob for intelligent file location
- **Dependency Tracking**: Use `mcp__serena__find_referencing_symbols` to understand code relationships

### Memory Management:
- **Read Context**: Start sessions with `mcp__serena__list_memories` to understand project state
- **Store Decisions**: Use `mcp__serena__write_memory` for important context and decisions
- **Project Onboarding**: Run `mcp__serena__check_onboarding_performed` for new projects
- **Continue Work**: Use memories to maintain context across sessions

### Code Modification (Advanced):
- **Replace Functions**: Use `mcp__serena__replace_symbol_body` for complete function rewrites
- **Insert Code**: Use `mcp__serena__insert_before_symbol` or `mcp__serena__insert_after_symbol`
- **Pattern Replace**: Use `mcp__serena__replace_regex` for pattern-based modifications
- **Get Overview**: Use `mcp__serena__get_symbols_overview` to understand file structure

### Thinking Tools (For Complex Tasks):
- **Completeness Check**: `mcp__serena__think_about_collected_information`
- **Task Adherence**: `mcp__serena__think_about_task_adherence`
- **Completion Verification**: `mcp__serena__think_about_whether_you_are_done`

### Best Practices:
1. **Always check memories** at session start with `list_memories`
2. **Use Serena for ALL code searches** - it understands context better than grep
3. **Store important decisions** as memories for future reference
4. **Use thinking tools** for complex multi-step tasks
5. **Prefer symbol-based operations** over text-based when modifying code

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

## Specialized Agents (USE THESE FIRST!)

### 🔴 Critical - Use Immediately When Applicable
- `systematic-debugger` - ANY error, build failure, or debugging need (Uses Serena MCP for error pattern analysis)
- `project-architect-qa` - Planning features, reviewing architecture (Uses Serena MCP for codebase understanding)
- `security-expert` - Security vulnerabilities, auth issues (Uses Serena MCP for vulnerability scanning)
- `test-automation-expert` - Testing, verification, browser tests

### 🟡 Development & Code Quality
- `elrond-code-architect` - Writing/refactoring with documentation (Uses Serena MCP for symbol manipulation)
- `complexity-guardian` - Review for over-engineering (Uses Serena MCP for complexity analysis)
- `serena-scoped-engineer` - Scoped engineering within boundaries (Primary Serena MCP user for all operations)
- `project-janitor` - File organization after development (Uses Serena MCP for dependency checking)

### 🟢 Specialized Tasks
- `cloud-deployment-architect` - Docker, Netlify, deployment issues
- `ui-design-specialist` - UI/UX, accessibility, design review (Uses Serena MCP for component analysis)
- `seo-redirect-copywriter` - SEO, redirects, content optimization
- `montessori-copywriter` - School-specific content creation
- `spicebush-content-verifier` - Content accuracy verification
- `spicebush-ux-advocate` - School owner perspective (Uses Serena MCP for UI component review)
- `project-organization-specialist` - Project structure, gitignore (Uses Serena MCP for file analysis)
- `project-delivery-manager` - Production readiness assessment

### Agent Selection Decision Tree
1. Error/Bug? → `systematic-debugger`
2. New Feature? → `project-architect-qa` 
3. Writing Code? → `elrond-code-architect`
4. Deployment Issue? → `cloud-deployment-architect`
5. UI/Design? → `ui-design-specialist`
6. Content? → Domain-specific copywriter
7. Cleanup? → `project-janitor` or `project-organization-specialist`

## Minimum Viable Change Philosophy

**Every change should:**
- ✅ Solve only the stated problem
- ✅ Maintain existing functionality
- ✅ Pass linting and type checks
- ✅ Be deployable immediately
- ✅ Avoid scope creep

**Before starting any task:**
0. **STOP: Is there an agent for this?** Check agent list above
1. Understand the exact requirement
2. Check `DEPENDENCY_MAP.md` for impact
3. Choose the minimal solution
4. Implement and push to testing
5. Verify on deployed site

## Agent Usage Examples

### ❌ WRONG (Direct Action):
```
User: "Fix the authentication error"
Claude: [Immediately starts debugging without agent]
```

### ✅ CORRECT (Agent-First):
```
User: "Fix the authentication error"
Claude: "I'll use the systematic-debugger agent to investigate this error"
[Invokes systematic-debugger]
```

### Chain of Actions Example:
```
User: "Add a new contact form feature"
Claude: 
1. "First, I'll use project-architect-qa to plan this feature"
2. "Then elrond-code-architect to implement it"
3. "Finally test-automation-expert to verify it works"
```

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