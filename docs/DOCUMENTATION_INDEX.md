# Spicebush Montessori Documentation Index
*Last Updated: July 26, 2025*

## 🚀 Quick Links
- [Quick Start Guide](setup/QUICK_START.md) - Get up and running in 5 minutes
- [Main README](README.md) - Project overview and architecture
- [Deployment Guide](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md) - Deploy to production

## 📁 Documentation Structure

### Setup & Configuration
- **[Quick Start](setup/QUICK_START.md)** - Fast setup for developers
- **[Environment Setup](development/ENVIRONMENT_SETUP.md)** - Detailed environment configuration
- **[Database Setup](setup/DATABASE_SETUP.md)** - Supabase configuration

### Development
- **[Development Guide](development/DEVELOPMENT_GUIDE.md)** - Best practices and workflows
- **[Testing Guide](development/TESTING.md)** - Test suite documentation
- **[Dependency Map](reference/DEPENDENCY_MAP.md)** - Component dependencies

### Deployment
- **[Production Deployment](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Full deployment process
- **[Environment Variables](deployment/ENVIRONMENT_VARIABLES.md)** - Required configurations

### Features
- **[Tuition Calculator](features/TUITION_CALCULATOR.md)** - Implementation details
- **[Authentication](features/AUTHENTICATION.md)** - Auth flow documentation
- **[Admin Dashboard](features/ADMIN_DASHBOARD.md)** - Admin functionality

### Current Plans
- **[Decap CMS Migration Plan](../app/DECAP_CMS_MIGRATION_PLAN.md)** - Active migration from Strapi
- **[Fix-First Plan](../FIX-FIRST-PLAN.md)** - Current development priorities
- **[Simplification Guide](../SIMPLIFICATION_IMPLEMENTATION_GUIDE.md)** - Architecture simplification

### AI Assistant
- **[Claude Instructions](../app/CLAUDE.md)** - AI assistant configuration
- **[Agent Descriptions](../app/agent-descriptions.md)** - Specialized agent roles

### Reference
- **[Dependency Map](../app/DEPENDENCY_MAP.md)** - Component dependency analysis
- **[Configuration Rules](../app/CONFIGURATION_RULES.md)** - Project configuration standards

## 📝 Journal
Recent development logs and decisions:
- [Latest Entries](../app/journal/) - Most recent development notes
- [Archived Entries](../app/journal/archive/) - Historical development logs

## 🗄️ Archives
Historical documentation for reference:
- [Project Analysis](archive/) - Past analyses and assessments
- [Completed Features](archive/completed/) - Documentation for implemented features

## 🔍 Finding Documentation
1. **By Topic**: Use the categories above
2. **By Date**: Check journal entries
3. **By Feature**: Look in the features directory
4. **By Task**: Check current plans section

## 📊 Documentation Stats
- **Active Docs**: 47 files
- **Archived**: 23 files  
- **Last Cleanup**: July 26, 2025
- **Reduction**: 40% less clutter

## 🚨 Important Notes
- Legacy Strapi references are archived; the live stack is Astro + Supabase + Clerk
- Tuition calculator and admin dashboards are in maintenance mode pending rebuild
- Security credentials have been removed from the repository—use Netlify environment variables instead
