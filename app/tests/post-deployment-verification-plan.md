# Post-Deployment Verification Plan for Netlify Testing Site

This document outlines the comprehensive testing plan to verify that the environment variable fixes and testing site deployment work correctly.

## Prerequisites

Before running verification tests, ensure:

1. **Environment Variables are Set**: All required variables have been configured in Netlify dashboard
2. **Code is Deployed**: The `testing` branch has been pushed and deployed
3. **Build Completed**: The Netlify build has finished successfully

## Phase 1: Environment Variable Verification

### 1.1 Basic Environment Loading
**Test**: Verify that environment variables are properly loaded in different contexts

```bash
# Run the environment variable tests
cd app
npm test tests/environment-variable-fixes.test.js
```

**Expected Results**:
- All environment variable fallback tests pass
- Standardized naming is consistent across codebase
- Netlify configuration is valid

### 1.2 Supabase Connection Test
**Test**: Verify Supabase client initialization with environment variables

**Steps**:
1. Visit: `https://spicebush-testing.netlify.app`
2. Open browser developer console
3. Check for Supabase connection errors

**Expected Results**:
- No "Supabase configuration missing" errors
- Database connection established
- Authentication system accessible

**Fallback Verification**:
- PRIMARY: `PUBLIC_SUPABASE_ANON_KEY` should be used if available
- FALLBACK: `PUBLIC_SUPABASE_PUBLIC_KEY` used only if primary is missing
- ERROR: Clear error message if both are missing

### 1.3 Service Role Key Verification
**Test**: Verify server-side API routes can access database

**Manual Test**:
```bash
# Test settings API (requires service role key)
curl -X GET "https://spicebush-testing.netlify.app/api/cms/settings/site_title"
```

**Expected Results**:
- API responds without authentication errors
- Uses `SUPABASE_SERVICE_ROLE_KEY` (not deprecated `SUPABASE_SERVICE_KEY`)
- Returns valid JSON response

## Phase 2: Testing Branch Configuration

### 2.1 Build Environment Verification
**Test**: Verify that testing branch uses correct build settings

**Verification Points**:
- `NODE_ENV` = "production" (for optimization)
- `ENVIRONMENT` = "testing" (for feature flags)
- Build command: `npm run build`
- Output directory: `dist/`

**Steps**:
1. Check Netlify build logs
2. Verify environment variables in build process
3. Confirm optimized assets are generated

### 2.2 Branch-Specific Behavior
**Test**: Verify testing-specific features work correctly

**Manual Verification**:
1. Visit site: `https://spicebush-testing.netlify.app`
2. Check if testing-specific features are enabled
3. Verify production optimizations are applied
4. Confirm no development-only features are visible

## Phase 3: Security and Performance

### 3.1 Security Headers Verification
**Test**: Verify security headers are properly applied

```bash
# Check security headers
curl -I "https://spicebush-testing.netlify.app"
```

**Expected Headers**:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: ...` (includes Stripe and Supabase domains)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 3.2 Content Security Policy Verification
**Test**: Verify CSP allows required external resources

**Manual Test**:
1. Visit site with browser developer tools open
2. Check Console for CSP violations
3. Test Stripe payment form (if applicable)
4. Verify Supabase authentication works

**Expected Results**:
- No CSP violations for legitimate resources
- Stripe scripts load correctly: `https://js.stripe.com`
- Supabase connections allowed: `https://*.supabase.co`, `wss://*.supabase.co`

### 3.3 Cache Control Verification
**Test**: Verify proper caching headers for different asset types

```bash
# Test static asset caching
curl -I "https://spicebush-testing.netlify.app/_astro/example.js"
curl -I "https://spicebush-testing.netlify.app/images/example.jpg"
curl -I "https://spicebush-testing.netlify.app/"
```

**Expected Cache Headers**:
- Static assets (_astro/*): `Cache-Control: public, max-age=31536000, immutable`
- Images: `Cache-Control: public, max-age=2592000`
- HTML pages: `Cache-Control: public, max-age=300, stale-while-revalidate=3600`

## Phase 4: Functional Testing

### 4.1 Core Functionality Test
**Test**: Verify main site features work correctly

**Test Checklist**:
- [ ] Homepage loads without errors
- [ ] Navigation menu works
- [ ] Contact forms submit successfully
- [ ] Image galleries display correctly
- [ ] SEO meta tags are present

### 4.2 Authentication System Test
**Test**: Verify authentication works with new environment variables

**Test Steps**:
1. Navigate to admin login: `/admin`
2. Test magic link authentication
3. Verify admin dashboard access
4. Test logout functionality

**Expected Results**:
- Magic links are sent successfully
- Authentication redirects work
- Admin interface loads correctly
- Session management functions properly

### 4.3 Database Operations Test
**Test**: Verify database read/write operations

**Test Areas**:
- Settings retrieval (GET `/api/cms/settings/*`)
- Settings updates (POST `/api/cms/settings/*`)
- Contact form submissions
- Newsletter signups (if enabled)

### 4.4 Stripe Integration Test (if enabled)
**Test**: Verify payment processing works

**Test Steps**:
1. Navigate to donation/payment form
2. Enter test payment details
3. Submit form
4. Verify webhook handling

**Test Credentials**:
- Test Card: `4242424242424242`
- Expiry: Any future date
- CVC: Any 3 digits

## Phase 5: Error Handling and Edge Cases

### 5.1 Missing Environment Variable Test
**Test**: Verify graceful handling when variables are missing

**Simulation Steps**:
1. Temporarily remove one required variable from Netlify
2. Trigger a new deployment
3. Check build logs and runtime behavior

**Expected Results**:
- Build fails with clear error message
- No deployment occurs with broken configuration
- Error messages reference correct variable names

### 5.2 Fallback Mechanism Test
**Test**: Verify fallback variables work correctly

**Test Scenario**:
1. Remove `PUBLIC_SUPABASE_ANON_KEY` from Netlify
2. Ensure `PUBLIC_SUPABASE_PUBLIC_KEY` is set
3. Deploy and test

**Expected Results**:
- Site continues to work using fallback variable
- No console errors related to Supabase initialization

### 5.3 Network Failure Resilience
**Test**: Verify handling of external service failures

**Test Areas**:
- Supabase unavailable
- Stripe API errors
- Email service failures

## Phase 6: Performance Validation

### 6.1 Build Performance
**Metrics to Track**:
- Build time (should be under 3 minutes)
- Bundle size (check for unexpected increases)
- Asset optimization (images, CSS, JS)

### 6.2 Runtime Performance
**Test**: Verify site performance meets standards

```bash
# Run Lighthouse audit
npx lighthouse https://spicebush-testing.netlify.app --output=json --chrome-flags="--headless"
```

**Performance Targets**:
- Performance Score: ≥ 90
- Accessibility Score: ≥ 90
- Best Practices Score: ≥ 90
- SEO Score: ≥ 90

## Phase 7: Cross-Browser Testing

### 7.1 Browser Compatibility
**Test Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

**Test Areas**:
- Site loads correctly
- Authentication works
- Forms submit properly
- Images display correctly
- CSS styling consistent

## Test Automation

### Running Automated Tests

```bash
# Run all deployment verification tests
cd app
npm test tests/deployment-verification.test.js
npm test tests/environment-variable-fixes.test.js

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance
```

### Continuous Monitoring

Set up monitoring for:
- Site uptime
- Error rates
- Performance metrics
- Security header compliance

## Troubleshooting Guide

### Common Issues and Solutions

1. **Build Failures**
   - Check environment variables are set correctly
   - Verify variable names match standardized format
   - Check Netlify build logs for specific errors

2. **Authentication Issues**
   - Verify Supabase URLs and keys
   - Check database connectivity
   - Confirm callback URLs are configured

3. **Payment Issues**
   - Verify Stripe keys are correct
   - Check webhook endpoints
   - Confirm CSP allows Stripe domains

4. **Performance Issues**
   - Check asset optimization
   - Verify cache headers
   - Monitor bundle size

## Success Criteria

The deployment is considered successful when:

- [ ] All automated tests pass
- [ ] Environment variable fallbacks work correctly
- [ ] Security headers are properly configured
- [ ] Core functionality works across browsers
- [ ] Performance meets targets
- [ ] No console errors on key pages
- [ ] Authentication system functions properly
- [ ] Database operations succeed
- [ ] Build completes in reasonable time

## Rollback Plan

If issues are discovered:

1. **Immediate**: Revert to previous working deployment
2. **Investigation**: Analyze logs and identify root cause
3. **Fix**: Apply necessary corrections
4. **Re-test**: Run verification plan again
5. **Deploy**: Push corrected version

## Documentation Updates

After successful verification:

1. Update deployment documentation
2. Record any configuration changes
3. Document lessons learned
4. Update monitoring dashboards