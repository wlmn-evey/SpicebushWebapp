# Development Commands Reference

## Essential Commands

### Development Server
```bash
npm run dev                    # Start development server at localhost:4321
npm run preview               # Preview production build locally
```

### Building and Deployment
```bash
npm run build                 # Build for production
npm run build:production      # Build with type checking
./deploy-to-testing.sh        # Deploy to testing site
```

### Testing
```bash
npm run test                  # Run unit tests (Vitest)
npm run test:watch            # Run tests in watch mode
npm run test:e2e              # Run end-to-end tests (Playwright)
npm run test:e2e:ui           # Run E2E tests with UI
npm run test:smoke            # Quick smoke tests
npm run test:all              # Run all tests
npm run test:ci               # CI test suite
```

### Code Quality
```bash
npm run lint                  # Lint code
npm run lint:fix              # Fix linting issues
npm run format                # Format code with Prettier
npm run format:check          # Check code formatting
npm run typecheck             # TypeScript type checking
```

### Database Operations
```bash
npm run test:db               # Test database connection
npm run test:db:verify        # Verify database connectivity
npm run db:migrate            # Apply database migrations
npm run db:seed               # Seed test data
```

### Docker Development
```bash
npm run docker:dev            # Start Docker development environment
npm run docker:dev:bg         # Start Docker in background
npm run docker:down           # Stop Docker containers
npm run docker:reset          # Reset Docker environment
npm run docker:logs           # View Docker logs
```

### Performance and Optimization
```bash
npm run test:performance      # Run performance tests
npm run bundle:analyze        # Analyze bundle size
npm run images:audit          # Audit image optimization
npm run optimize:images       # Optimize images
```

### Content and CMS
```bash
npm run cms:local             # Start CMS proxy server
npm run validate:config       # Validate deployment configuration
```

## Specialized Testing Commands
```bash
npm run test:accessibility    # Accessibility tests
npm run test:visual           # Visual regression tests
npm run test:quickactions     # Quick action tests
npm run test:coming-soon      # Coming soon functionality tests
npm run test:email            # Email service tests
npm run test:content-verification  # Content verification tests
```

## System Commands (Darwin/macOS)
- `ls` - List directory contents
- `grep` - Search text (prefer `rg` ripgrep when available)
- `find` - Find files and directories
- `cd` - Change directory
- `git` - Version control operations
- `docker` - Container operations