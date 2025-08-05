# Task Completion Checklist

## When a Task is Completed

### 1. Code Quality Verification
- [ ] Run linting: `npm run lint`
- [ ] Fix any linting issues: `npm run lint:fix`
- [ ] Check code formatting: `npm run format:check`
- [ ] Fix formatting if needed: `npm run format`
- [ ] Verify TypeScript compilation: `npm run typecheck`

### 2. Testing Requirements
- [ ] Run unit tests: `npm run test`
- [ ] Run integration tests if applicable: `npm run test:integration`
- [ ] Run E2E tests for UI changes: `npm run test:e2e:quick`
- [ ] Run accessibility tests: `npm run test:accessibility`
- [ ] Run performance tests if needed: `npm run test:performance`

### 3. Build Verification
- [ ] Verify production build: `npm run build:production`
- [ ] Test preview locally: `npm run preview`
- [ ] Check bundle analysis if needed: `npm run bundle:analyze`

### 4. Documentation Updates
- [ ] Update relevant documentation
- [ ] Add/update code comments for complex logic
- [ ] Create or update journal entry in `/journal/` directory
- [ ] Update API documentation if endpoints changed

### 5. Security Checks
- [ ] Verify no credentials committed to git
- [ ] Check environment variable usage is correct
- [ ] Validate input sanitization for new features
- [ ] Review authentication/authorization for protected routes

### 6. Database Considerations
- [ ] Test database connectivity: `npm run test:db:verify`
- [ ] Run migrations if schema changed: `npm run db:migrate`
- [ ] Verify data integrity if database operations added

### 7. Deployment Preparation
- [ ] Verify environment variables are documented
- [ ] Check production readiness with: `npm run validate:config`
- [ ] Test in Docker environment if infrastructure changed: `npm run docker:dev`
- [ ] Review Netlify configuration in `netlify.toml` if needed

### 8. Final Verification
- [ ] Git status clean with no untracked sensitive files
- [ ] All tests passing: `npm run test:ci`
- [ ] Build successful: `npm run build:production`
- [ ] No TypeScript errors: `npm run typecheck`

## Environment-Specific Checks

### For Production Deployments
- [ ] All required environment variables configured in Netlify
- [ ] SSL/TLS certificates valid
- [ ] DNS settings correct
- [ ] Performance budget maintained
- [ ] Accessibility compliance verified

### For Testing Environment
- [ ] Testing branch up to date
- [ ] Testing environment variables configured
- [ ] Deploy to testing: `./deploy-to-testing.sh`
- [ ] Verify testing site functionality

## Post-Deployment Verification
- [ ] Site loads correctly
- [ ] Authentication flows work
- [ ] Forms submit successfully
- [ ] Database operations function
- [ ] Email services operational
- [ ] Payment processing works (if applicable)
- [ ] Error handling works as expected