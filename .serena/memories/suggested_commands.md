# Essential Commands for SpicebushWebapp Development

## Development Environment
```bash
# Navigate to main app directory
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app

# Start development server
npm run dev

# Build and preview
npm run build
npm run preview
```

## Code Quality & Testing
```bash
# Type checking and linting
npm run typecheck
npm run lint
npm run lint:fix
npm run format

# Testing suite
npm run test                    # Unit tests
npm run test:e2e               # End-to-end tests  
npm run test:accessibility     # A11y testing
npm run test:performance       # Performance tests
```

## Deployment
```bash
# Netlify deployments
npm run deploy:staging
npm run deploy:production

# Manual Netlify CLI
npx netlify deploy --dir=dist
npx netlify deploy --dir=dist --prod
```

## Database & Services
```bash
# Database testing
npm run test:db
npm run test:db:verify

# Email service testing
npm run test:email
npm run test:unione
```

## Debugging & Utilities
```bash
# Performance analysis
npm run bundle:analyze
npm run images:audit

# Docker development
npm run docker:dev
npm run docker:logs
npm run docker:reset
```

## System Commands (macOS)
```bash
# File operations
ls -la                         # List files with details
find . -name "*.ts" -type f    # Find TypeScript files
grep -r "searchterm" ./src     # Search in source

# Git operations
git status
git add .
git commit -m "message"
git push origin testing

# Process management
ps aux | grep node             # Find Node processes
lsof -i :4321                 # Check port usage
```

## Project-Specific Workflows

### After Making Changes
1. `npm run typecheck` - Verify TypeScript
2. `npm run lint:fix` - Fix code style
3. `npm run test` - Run tests
4. `git add . && git commit -m "description"`
5. `git push origin testing` - Deploy to testing

### Before Production Deploy
1. `npm run test:all` - Full test suite
2. `npm run build:production` - Production build
3. Review staging site functionality
4. `npm run deploy:production`