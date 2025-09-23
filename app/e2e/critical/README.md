# Critical Browser Tests

This directory contains comprehensive browser tests designed to catch issues in production and Docker environments.

## Test Suites

### 1. Quick Smoke Test (`quick-smoke.spec.ts`)
- **Purpose**: Fast sanity check of critical functionality
- **Runtime**: < 30 seconds
- **Coverage**:
  - Homepage loads without errors
  - Basic navigation works
  - API health check
  - No redirect loops
  - Forms are present
  - Mobile menu functionality
  - Coming soon mode check

### 2. Comprehensive Smoke Test (`comprehensive-smoke.spec.ts`)
- **Purpose**: Thorough testing of all pages and functionality
- **Runtime**: 2-5 minutes
- **Coverage**:
  - All pages load without JavaScript errors
  - No console errors on any page
  - All resources load correctly (images, scripts, stylesheets)
  - API endpoints respond correctly
  - Navigation works without loops
  - Forms are functional
  - Authentication flow
  - Admin panel accessibility
  - Mobile responsiveness
  - Performance metrics
- **Reports**: Generates detailed HTML and Markdown reports

### 3. Docker Health Check (`docker-health-check.spec.ts`)
- **Purpose**: Validate Docker container health and configuration
- **Runtime**: 1-2 minutes
- **Coverage**:
  - Missing npm packages detection
  - Redirect loop detection
  - Database connectivity validation
  - Container performance monitoring
  - Environment configuration check
  - File permissions and volumes
  - Memory leak detection
- **Reports**: Generates health report with recommendations

## Running Tests

### Quick Commands

```bash
# Run quick smoke test
npm run test:smoke

# Run only critical path tests (ultra-fast)
npm run test:smoke:critical

# Run comprehensive test suite
npm run test:comprehensive

# Run Docker health checks
npm run test:docker:health

# Run all browser tests
npm run test:browser:all

# Interactive test runner
npm run test:browser
```

### View Test Reports

```bash
# Open HTML report from last test run
npm run test:browser:report
```

### Advanced Options

```bash
# Run with specific browser
npx playwright test e2e/critical/quick-smoke.spec.ts --project=chromium

# Run in headed mode (see browser)
npx playwright test e2e/critical/quick-smoke.spec.ts --headed

# Run with UI mode for debugging
npx playwright test e2e/critical/comprehensive-smoke.spec.ts --ui

# Run specific test by name
npx playwright test -g "homepage loads"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run smoke tests
  run: npm run test:smoke
  
- name: Run comprehensive tests
  if: github.event_name == 'pull_request'
  run: npm run test:comprehensive
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### Docker Testing

```bash
# Build and test in Docker
docker-compose up --build -d
npm run test:docker:health

# Test against production-like environment
E2E_BASE_URL=https://staging.example.com npm run test:comprehensive
```

## Test Reports

### Report Formats

1. **HTML Report**: Interactive report with screenshots and traces
2. **JSON Report**: Machine-readable results
3. **JUnit XML**: For CI/CD integration
4. **Markdown Report**: Human-readable summary

### Report Locations

- HTML: `test-results/html-report/index.html`
- JSON: `test-results/results.json`
- JUnit: `test-results/junit.xml`
- Screenshots: `test-results/html-report/data/`
- Videos: `test-results/html-report/data/`

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**
   - Run `npm install` in the container
   - Check `node_modules` volume mapping

2. **Redirect Loops**
   - Check nginx/proxy configuration
   - Verify coming soon mode settings
   - Review application routing

3. **Database Connection Failures**
   - Ensure database container is running
   - Check environment variables
   - Verify network connectivity

4. **Slow Performance**
   - Increase Docker resources
   - Check for memory leaks
   - Review application optimization

### Debug Mode

```bash
# Run with debug output
DEBUG=pw:api npx playwright test

# Generate trace for debugging
npx playwright test --trace on

# Take screenshots on each step
npx playwright test --screenshot on
```

## Best Practices

1. **Keep tests fast**: Quick smoke tests should run in < 30s
2. **Use tags**: Tag tests with `@smoke`, `@critical`, etc.
3. **Parallel execution**: Tests run in parallel by default
4. **Retry strategy**: Failed tests retry 2x on CI
5. **Clean state**: Each test should be independent
6. **Error reporting**: Capture all errors with context

## Maintenance

### Adding New Tests

1. Add test file to `e2e/critical/` directory
2. Follow naming convention: `feature-name.spec.ts`
3. Include in relevant test suites
4. Update this README

### Updating Existing Tests

1. Keep selectors up-to-date
2. Review and update expected values
3. Add new pages/features as they're added
4. Remove obsolete tests

### Performance Monitoring

- Review test execution times monthly
- Optimize slow tests
- Balance coverage vs. speed
- Monitor flaky tests