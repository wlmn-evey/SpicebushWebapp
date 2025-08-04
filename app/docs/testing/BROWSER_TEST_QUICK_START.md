# Browser Testing Quick Start Guide

## Overview

This guide helps you quickly set up and run the comprehensive browser test suite for SpicebushWebapp.

## Prerequisites

1. Node.js 18+ installed
2. Docker (for Docker environment testing)
3. Chrome, Firefox, or Safari browser

## Quick Setup

### 1. Install Dependencies

```bash
# Install test dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

### 2. Run Tests

#### Quick Smoke Test (2 minutes)
```bash
# Run critical path tests only
npm run test:e2e:critical
```

#### Run Specific Test Suite
```bash
# Run smoke tests
npx playwright test e2e/critical/smoke.spec.ts

# Run Docker environment tests
npx playwright test e2e/critical/docker-environment.spec.ts

# Run all page load tests
npx playwright test e2e/critical/all-pages-load.spec.ts
```

#### Run All Tests
```bash
# Run comprehensive test suite
./scripts/run-comprehensive-tests.sh

# Run in Docker environment
./scripts/run-comprehensive-tests.sh docker

# Keep Docker running after tests
KEEP_DOCKER=true ./scripts/run-comprehensive-tests.sh docker
```

#### Run Tests with UI (Debug Mode)
```bash
# Open Playwright UI
npx playwright test --ui

# Debug a specific test
npx playwright test e2e/critical/smoke.spec.ts --debug
```

## Test Categories

### Critical Tests (P0) - Must Pass
- Homepage loads
- Navigation works
- No JavaScript errors
- No redirect loops
- API endpoints respond

### Docker Environment Tests
- All npm packages available
- Database connections work
- No permission errors
- Static assets served correctly

### All Pages Tests
- Every page loads without errors
- Proper error handling for 404s
- Admin pages require authentication

## Viewing Test Results

After tests run:

1. **HTML Report**: Automatically opens in browser
2. **Console Output**: Shows pass/fail status
3. **Error Reports**: Located in `test-results/ERROR_REPORT.md`
4. **Screenshots**: Saved in `test-results/` for failures

## Common Commands

```bash
# Run and see browser (headed mode)
npx playwright test --headed

# Run specific browser
npx playwright test --project=firefox

# Update snapshots for visual tests
npx playwright test --update-snapshots

# Run tests in parallel
npx playwright test --workers=4

# Generate new test
npx playwright codegen https://your-site.com
```

## Troubleshooting

### Tests Failing in Docker

1. Check Docker is running: `docker ps`
2. Check logs: `docker-compose logs`
3. Reset Docker: `docker-compose down -v && docker-compose up`

### Module Not Found Errors

1. Run `npm install`
2. Check `package.json` has all dependencies
3. For Docker: Rebuild with `docker-compose build --no-cache`

### Timeout Errors

1. Increase timeout in test:
   ```typescript
   test('my test', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
   });
   ```

2. Check if services are running
3. Check network connectivity

### Permission Errors

1. Check file permissions in Docker volumes
2. Run `docker-compose down -v` to reset volumes
3. Check user permissions in Dockerfile

## Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    // Navigate
    await page.goto('/my-page');
    
    // Interact
    await page.click('button');
    
    // Assert
    await expect(page.locator('h1')).toContainText('Expected Text');
  });
});
```

### Best Practices

1. **Use data-testid**: Add `data-testid` attributes for reliable selectors
2. **Wait for elements**: Use `await expect().toBeVisible()` instead of arbitrary waits
3. **Check for errors**: Monitor console and network errors
4. **Clean state**: Reset data between tests
5. **Descriptive names**: Use clear test descriptions

## CI/CD Integration

Tests run automatically on:
- Push to main branch
- Pull requests
- Nightly schedule (full suite)

To run tests in CI:
```yaml
- name: Run Tests
  run: npm run test:e2e
```

## Getting Help

1. Run tests with `--debug` flag
2. Check `test-results/` directory for logs
3. Review error messages and stack traces
4. Check the [Comprehensive Testing Strategy](./COMPREHENSIVE_BROWSER_TESTING_STRATEGY.md) for detailed information

## Next Steps

1. Run the smoke tests to verify setup
2. Fix any failing tests
3. Add tests for new features
4. Set up pre-commit hooks for automatic testing