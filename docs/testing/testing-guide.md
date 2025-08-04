# Testing Guide - Spicebush Montessori Webapp

This guide covers the comprehensive test suite created to verify the critical fixes implemented in the Spicebush Montessori webapp.

## Critical Fixes Covered

1. **Admin Authorization System** - New admin-config.ts module with secure email-based access control
2. **Email Standardization** - Ensuring information@spicebushmontessori.org is used consistently
3. **Footer Color Contrast** - Light-stone color implementation for WCAG AA compliance
4. **Friday Closing Time Display** - Clear 3pm closing message in hours widget
5. **Console.log Removal** - No debug logs in production code

## Test Suite Overview

### Unit Tests (`src/test/lib/admin-config.test.ts`)
- Tests the admin configuration module
- Validates email authorization logic
- Covers edge cases and security scenarios
- Tests environment variable handling

### Integration Tests (`src/test/integration/admin-auth.test.ts`)
- Tests complete admin authentication flow
- Validates Supabase integration
- Tests session management
- Covers authorization middleware patterns

### Accessibility Tests (`src/test/accessibility/footer-contrast.test.ts`)
- Validates WCAG AA color contrast ratios
- Tests footer DOM structure and ARIA attributes
- Verifies responsive design accessibility
- Checks keyboard navigation support

### Component Tests (`src/test/components/hours-widget.test.ts`)
- Verifies Friday 3pm closing time display
- Tests hours data processing
- Validates visual hour bar calculations
- Checks for console.log statements

### E2E Tests (`e2e/critical-user-journeys.spec.ts`)
- Tests complete user workflows
- Validates admin authentication in real browser
- Checks footer rendering and accessibility
- Verifies hours widget functionality
- Tests across multiple browsers and devices

### Visual Regression Tests (`e2e/visual-regression.spec.ts`)
- Captures screenshots of critical UI components
- Compares against baseline images
- Tests responsive layouts
- Validates hover states and interactions

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Quick Start
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:accessibility # Accessibility tests only
npm run test:e2e          # End-to-end tests only
npm run test:visual       # Visual regression tests only

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui           # Vitest UI
npm run test:e2e:ui       # Playwright UI
```

### Using the Test Runner Script
```bash
# Run with the test runner for better output
tsx scripts/run-tests.ts         # Run all tests
tsx scripts/run-tests.ts unit    # Run unit tests only
tsx scripts/run-tests.ts quick   # Run quick test suite
tsx scripts/run-tests.ts ci      # Run CI test suite

# Get help
tsx scripts/run-tests.ts --help
```

### Visual Regression Testing
```bash
# Run visual tests
npm run test:visual

# Update baseline screenshots
npm run test:visual:update

# View test report after failures
npx playwright show-report
```

## CI/CD Integration

The test suite includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:
- Runs on push to main/develop branches
- Tests on multiple Node.js versions
- Runs all test suites
- Uploads coverage reports to Codecov
- Performs security audits
- Runs Lighthouse accessibility audits
- Checks for console.log statements

## Manual QA Testing

See `test-plans/manual-qa-checklist.md` for comprehensive manual testing procedures covering:
- Cross-browser testing
- Mobile device testing
- Accessibility testing with screen readers
- Performance testing
- Security verification

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Uses jsdom environment for DOM testing
- Includes setup file for test utilities
- Configured for TypeScript and Astro components

### Playwright Configuration (`playwright.config.ts`)
- Tests multiple browsers (Chrome, Firefox, Safari, Edge)
- Includes mobile viewports
- Captures screenshots and videos on failure
- Runs local dev server automatically

## Writing New Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../lib/my-module';

describe('My Module', () => {
  it('should handle specific case', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('user can complete action', async ({ page }) => {
  await page.goto('/page');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Debugging Tests

### Vitest Debugging
```bash
# Run specific test file
npx vitest src/test/lib/admin-config.test.ts

# Run tests matching pattern
npx vitest -t "admin email"

# Run with node inspector
node --inspect-brk ./node_modules/.bin/vitest
```

### Playwright Debugging
```bash
# Debug mode with headed browser
npm run test:e2e:debug

# Run specific test
npx playwright test e2e/critical-user-journeys.spec.ts

# Run with specific browser
npx playwright test --project=chromium
```

## Test Maintenance

1. **Keep tests fast** - Mock external dependencies
2. **Keep tests isolated** - No test should depend on another
3. **Keep tests readable** - Use descriptive names and comments
4. **Keep tests up to date** - Update when features change
5. **Review test failures** - Don't ignore flaky tests

## Coverage Goals

- Unit tests: >80% coverage
- Integration tests: Critical paths covered
- E2E tests: Key user journeys covered
- Visual tests: Critical UI components covered

## Troubleshooting

### Common Issues

1. **Playwright browsers not installed**
   ```bash
   npx playwright install
   ```

2. **Port already in use**
   ```bash
   # Kill process on port 4321
   lsof -ti:4321 | xargs kill -9
   ```

3. **Visual test failures**
   - Review differences in test report
   - Update baselines if changes are intentional
   - Check for environment differences

4. **Flaky E2E tests**
   - Add appropriate waits
   - Check for race conditions
   - Ensure proper test isolation

## Security Testing

The test suite includes checks for:
- SQL injection prevention
- XSS protection
- Secure authentication flow
- Proper authorization checks
- No exposed sensitive data

## Performance Testing

While not automated, manual performance testing should verify:
- Page load time <3 seconds
- Time to Interactive <5 seconds
- No memory leaks
- Smooth animations (60fps)

## Reporting Issues

When reporting test failures:
1. Include full error message
2. Specify test file and test name
3. Include browser/environment info
4. Provide steps to reproduce
5. Attach screenshots if relevant