# Documentation Categorization Report
Date: 2025-07-26
Total markdown files found: 147 (excluding node_modules)

## CATEGORIZATION BY ACTION

### 1. KEEP - Current and Relevant Documentation

#### Core Project Documentation
- `/CLAUDE.md` - **KEEP** - Essential project instructions for Claude
- `/app/CLAUDE.md` - **KEEP** - App-specific Claude instructions
- `/app/README.md` - **KEEP** - Main app documentation
- `/app/QUICK_START.md` - **KEEP** - Essential for developer onboarding

#### Configuration and Setup
- `/app/CONFIGURATION_RULES.md` - **KEEP** - Active configuration guidelines
- `/app/DEPENDENCY_MAP.md` - **KEEP** - Current dependency documentation
- `/app/PRODUCTION_DEPLOYMENT_GUIDE.md` - **KEEP** - Critical for deployment

#### Recent Planning Documents
- `/FIX-FIRST-PLAN.md` - **KEEP** - Active plan document
- `/SIMPLIFICATION_IMPLEMENTATION_GUIDE.md` - **KEEP** - Current simplification effort
- `/app/DECAP_CMS_MIGRATION_PLAN.md` - **KEEP** - Active migration plan

#### Testing Documentation
- `/app/docs/TESTING.md` - **KEEP** - Active testing guide
- `/app/test-plans/manual-qa-checklist.md` - **KEEP** - Current QA checklist

#### Agent Descriptions (Active)
- All files in `/.claude/agents/` - **KEEP** - Active Claude agent configurations

#### Recent Journal Entries (Last 7 days: 2025-07-20 to 2025-07-26)
- All `/journal/2025-07-25-*.md` files - **KEEP**
- All `/journal/2025-07-26-*.md` files - **KEEP**
- All `/app/journal/2025-07-25-*.md` files - **KEEP**
- All `/app/journal/2025-07-26-*.md` files - **KEEP**

### 2. ARCHIVE - Historical Value but Not Actively Needed

#### Older Journal Entries (Before 2025-07-20)
- `/journal/2025-07-15-spicebush-workflow-guide.md` - **ARCHIVE**
- `/journal/2025-07-17-database-connection-fix.md` - **ARCHIVE**
- `/journal/2025-07-17-docker-supabase-fixes.md` - **ARCHIVE**
- `/journal/2025-07-17-photo-implementation.md` - **ARCHIVE**
- `/journal/2025-07-18-*.md` files - **ARCHIVE**
- `/app/journal/2025-07-15-*.md` files - **ARCHIVE**
- `/app/journal/2025-07-16-*.md` files - **ARCHIVE**

#### Historical Analysis Documents
- `/app/PROJECT_COMPLEXITY_ANALYSIS.md` - **ARCHIVE** - Past analysis
- `/app/SPICEBUSH_SITE_ANALYSIS.md` - **ARCHIVE** - Completed analysis
- `/ARCHITECTURE_COMPARISON.md` - **ARCHIVE** - Past comparison

#### Completed Implementation Docs
- `/app/TUITION_CALCULATOR_FIX_SUMMARY.md` - **ARCHIVE** - Fix completed
- `/app/TUITION_CALCULATOR_SETUP.md` - **ARCHIVE** - Setup completed
- `/app/docs/tuition-calculator-fix-summary.md` - **ARCHIVE** - Duplicate
- `/app/docs/tuition-calculator-debugging-solutions.md` - **ARCHIVE** - Historical

### 3. DELETE - Redundant, Outdated, or Security Risk

#### Security Risks
- `/app/TEST_CREDENTIALS.md` - **DELETE** - SECURITY RISK! Contains credentials

#### Deprecated/Outdated Documentation
- `/DOCKER_STRAPI_SETUP.md` - **DELETE** - Strapi being removed
- `/STRAPI_SSO_SETUP.md` - **DELETE** - Strapi being removed
- `/project-docs/strapi-blog-integration.md` - **DELETE** - Strapi deprecated
- `/docs/strapi-blog-automation-solutions.md` - **DELETE** - Strapi deprecated
- `/scripts/setup-strapi-blog.md` - **DELETE** - Strapi deprecated
- `/scripts/claude-desktop-strapi-setup-prompt.md` - **DELETE** - Strapi deprecated

#### Redundant/Unused Directories
- `/docker-mcp-servers/` - **DELETE** - Unrelated to project (147 README files)
- `/gcp-mcp/README.md` - **DELETE** - Unrelated to project
- `/browsermcp/README.md` - **DELETE** - Unrelated to project

#### Duplicate Content
- `/app/dist/images/photo-index.md` - **DELETE** - Duplicate of public version
- `/app/dist/images/teachers/README.md` - **DELETE** - Duplicate of public version
- `/blog-backend/README.md` - **DELETE** - Backend being removed

#### Empty/Placeholder Docs
- `/app/docker/archived-configs/DO_NOT_USE_THESE.md` - **DELETE** - Just a warning file
- `/content-inventory.md` - **DELETE** - Move content to journal
- `/data-backup-summary.md` - **DELETE** - Move to journal if needed

### 4. CONSOLIDATE - Can Be Merged with Other Docs

#### Database Documentation
- `/app/DATABASE_FIX_PLAN_SIMPLE.md` - **CONSOLIDATE** into single database guide
- `/app/DATABASE_SETUP_AUDIT.md` - **CONSOLIDATE** into single database guide

#### Docker Documentation
- `/app/DOCKER_DEVELOPMENT.md` - **CONSOLIDATE** into development guide

#### Project Planning
- `/app/PLANNED_FEATURES.md` - **CONSOLIDATE** into roadmap
- `/app/PROJECT_PHASES_AND_UPGRADES.md` - **CONSOLIDATE** into roadmap
- `/app/TASK_LIST.md` - **CONSOLIDATE** into project management doc
- `/app/PROJECT_DOCUMENTATION_CLEANUP_PLAN.md` - **CONSOLIDATE** into this report

#### Agent Documentation
- `/app/agent-descriptions.md` - **CONSOLIDATE** into .claude/agents/README.md
- `/blog-backend/public/uploads/.claude/agents/*.md` - **CONSOLIDATE** or DELETE

#### Implementation Reports
- `/app/REFINEMENT_REPORT.md` - **CONSOLIDATE** into project history
- `/app/THINKING_MATRIX.md` - **CONSOLIDATE** into development guide

#### Blog Content (Duplicates)
- `/docs/blog/*.md` - **CONSOLIDATE** - Same as simplified-app versions
- `/simplified-app/src/content/blog/*.md` - **KEEP** as primary location

#### Live Site Content
- `/docs/live-site-content/` - **CONSOLIDATE** into content management docs

## RECOMMENDED DIRECTORY STRUCTURE

```
/SpicebushWebapp/
├── README.md                    # Main project documentation
├── CLAUDE.md                    # Claude instructions
├── .claude/
│   └── agents/                  # Agent configurations
│       └── README.md            # Consolidated agent documentation
├── docs/
│   ├── development/
│   │   ├── getting-started.md   # Consolidated from QUICK_START
│   │   ├── configuration.md     # From CONFIGURATION_RULES
│   │   ├── dependencies.md      # From DEPENDENCY_MAP
│   │   └── docker-setup.md      # Consolidated Docker docs
│   ├── deployment/
│   │   └── production-guide.md  # From PRODUCTION_DEPLOYMENT_GUIDE
│   ├── testing/
│   │   ├── testing-guide.md     # From TESTING.md
│   │   └── qa-checklist.md      # From manual-qa-checklist
│   ├── architecture/
│   │   ├── database-setup.md    # Consolidated database docs
│   │   └── simplification.md    # Current simplification effort
│   └── roadmap.md               # Consolidated features/phases
├── journal/                     # Keep last 7 days, archive older
│   └── archive/                 # Older journal entries
├── app/                         # Main application
└── simplified-app/              # Simplified version

```

## SECURITY CONCERNS

**IMMEDIATE ACTION REQUIRED:**
1. `/app/TEST_CREDENTIALS.md` contains credentials - DELETE IMMEDIATELY
2. Check git history to ensure credentials weren't committed
3. Rotate any exposed credentials

## CONSOLIDATION RECOMMENDATIONS

1. **Database Documentation**: Merge DATABASE_FIX_PLAN_SIMPLE.md and DATABASE_SETUP_AUDIT.md into a single comprehensive database guide

2. **Project Planning**: Create a unified roadmap document combining:
   - PLANNED_FEATURES.md
   - PROJECT_PHASES_AND_UPGRADES.md
   - TASK_LIST.md

3. **Development Guide**: Consolidate:
   - QUICK_START.md
   - DOCKER_DEVELOPMENT.md
   - THINKING_MATRIX.md

4. **Blog Content**: Remove duplicates in /docs/blog/ and keep only /simplified-app/src/content/blog/

## SUMMARY

- **KEEP**: 47 files (core docs, recent journals, active configs)
- **ARCHIVE**: 23 files (older journals, completed analyses)
- **DELETE**: 54 files (security risks, deprecated, unrelated projects)
- **CONSOLIDATE**: 23 files (can be merged to reduce redundancy)

This cleanup will:
1. Remove security risks
2. Eliminate 70+ unrelated MCP server docs
3. Reduce documentation redundancy by ~40%
4. Create clearer organization for developers
5. Maintain essential project history in archives