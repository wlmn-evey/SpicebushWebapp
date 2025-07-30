# Photo Management System - Test Execution Guide

## Overview

This guide provides instructions for running all automated tests for the photo management system and interpreting results.

## Test Structure

```
src/test/
├── api/
│   └── cms-media.test.ts           # Unit tests for API endpoints
├── integration/
│   └── photo-upload.test.ts        # Integration tests for upload workflow
└── accessibility/
    └── photo-management.test.ts    # Accessibility compliance tests

e2e/
├── admin-photo-management.spec.ts  # E2E tests for management interface
├── admin-photo-upload.spec.ts      # E2E tests for upload interface
└── photo-management-visual.spec.ts # Visual regression tests

docs/testing/
├── photo-management-manual-test-plan.md  # Manual testing checklist
└── test-execution-guide.md               # This file
```

## Running Tests

### Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   ```bash
   # Copy environment file
   cp .env.example .env.local
   
   # Update with test database credentials
   # Set up test authentication bypass if needed
   ```

3. **Start Development Server** (for E2E tests)
   ```bash
   npm run dev
   ```

### Unit Tests

Run all unit tests with Vitest:

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run only API tests
npm run test src/test/api

# Run only integration tests  
npm run test src/test/integration
```

### E2E Tests

Run end-to-end tests with Playwright:

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/admin-photo-management.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Visual Regression Tests

```bash
# Run visual tests
npm run test:visual

# Update visual baselines (after UI changes)
npm run test:visual:update

# Run visual tests for specific browsers
npx playwright test e2e/photo-management-visual.spec.ts --project=chromium
```

### Accessibility Tests

```bash
# Run accessibility tests
npm run test:accessibility

# Run with specific accessibility rules
npx vitest run src/test/accessibility --reporter=verbose
```

### Complete Test Suite

```bash
# Run all tests (unit + E2E)
npm run test:all

# Run CI test suite (with coverage)
npm run test:ci
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
  getViteConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: ['node_modules', 'dist', '.astro'],
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', '.astro/', 'src/test/']
      }
    }
  })
);
```

### Playwright Configuration (`playwright.config.ts`)

Key settings for photo management tests:

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ]
});
```

## Test Data Management

### Mock Data Setup

Tests use consistent mock data to ensure reliable results:

```typescript
// Common mock photo data used across tests
const mockPhotos = [
  {
    id: '1',
    title: 'Classroom Activities',
    description: 'Children engaged in learning',
    filename: 'classroom.jpg',
    url: 'https://example.com/classroom.jpg',
    tags: ['classroom', 'children', 'learning']
  }
  // ... more test data
];
```

### Authentication Mocking

Tests mock authentication for consistency:

```typescript
// Mock admin authentication
await page.addInitScript(() => {
  document.cookie = 'sbms-admin-auth=bypass; path=/';
});
```

### API Mocking

API responses are mocked to avoid external dependencies:

```typescript
await page.route('**/api/cms/media', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockPhotos)
  });
});
```

## Interpreting Test Results

### Unit Test Results

```bash
✓ src/test/api/cms-media.test.ts (12)
  ✓ Media API - GET endpoint (4)
    ✓ should return media list for authenticated user
    ✓ should return 401 for unauthenticated requests  
    ✓ should handle database errors gracefully
    ✓ should return empty array when no media exists
  ✓ Media API - DELETE endpoint (6)
    ✓ should successfully delete a photo
    ✓ should return 401 for unauthenticated requests
    ✓ should return 400 when photo ID is missing
    ✓ should return 404 when photo does not exist
    ✓ should handle database deletion errors
    ✓ should handle malformed JSON in request body
  ✓ Media API - Edge Cases (2)
    
Test Files  1 passed (1)
Tests       12 passed (12)
Duration    1.23s
```

### E2E Test Results

```bash
Running 20 tests using 4 workers

  ✓ [chromium] › admin-photo-management.spec.ts:15:3 › should display page correctly
  ✓ [chromium] › admin-photo-management.spec.ts:25:3 › should switch between views
  ✓ [firefox] › admin-photo-management.spec.ts:15:3 › should display page correctly
  ✗ [webkit] › admin-photo-upload.spec.ts:45:3 › should handle file upload

  1 failed
    [webkit] › admin-photo-upload.spec.ts:45:3 › should handle file upload
    
    Error: expect(received).toBe(expected)
    Expected: true
    Received: false
    
  19 passed (3.2m)
```

### Visual Test Results

```bash
✓ [chromium] › photo-management-visual.spec.ts:15:3 › desktop grid view
✗ [chromium] › photo-management-visual.spec.ts:25:3 › desktop list view
  Screenshot comparison failed:
  
  Expected: photo-management-desktop-list.png
  Actual:   photo-management-desktop-list-actual.png
  Diff:     photo-management-desktop-list-diff.png
```

### Coverage Reports

Coverage reports show test completeness:

```bash
--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------|---------|----------|---------|---------|-------------------
All files     |   87.5  |   75.8   |   91.2  |   88.1  |
 api/         |   95.4  |   89.1   |   100   |   94.8  |
  media.ts    |   95.4  |   89.1   |   100   |   94.8  | 45,67
 pages/       |   78.9  |   65.2   |   82.4  |   79.3  |
  upload.astro|   78.9  |   65.2   |   82.4  |   79.3  | 112,145,178
--------------|---------|----------|---------|---------|-------------------
```

## Debugging Failed Tests

### Unit Test Debugging

1. **Run single test in watch mode**:
   ```bash
   npx vitest run src/test/api/cms-media.test.ts --reporter=verbose
   ```

2. **Add debug logs**:
   ```typescript
   console.log('Mock response:', mockResponse);
   expect(result).toBe(expected);
   ```

3. **Use debugger**:
   ```typescript
   debugger; // Add breakpoint
   ```

### E2E Test Debugging

1. **Run with headed browser**:
   ```bash
   npx playwright test --headed
   ```

2. **Use debug mode**:
   ```bash
   npx playwright test --debug
   ```

3. **Add step-by-step logging**:
   ```typescript
   console.log('Clicking upload button');
   await page.click('[data-testid="upload-btn"]');
   console.log('Upload button clicked');
   ```

4. **Take screenshots for debugging**:
   ```typescript
   await page.screenshot({ path: 'debug-screenshot.png' });
   ```

### Visual Test Debugging

1. **View diff images**: Check the generated diff images in `test-results/`

2. **Update baselines** (if changes are intentional):
   ```bash
   npm run test:visual:update
   ```

3. **Run single visual test**:
   ```bash
   npx playwright test e2e/photo-management-visual.spec.ts:25
   ```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Photo Management Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

## Performance Monitoring

### Test Execution Times

Monitor test execution times to identify slow tests:

```bash
# Run tests with timing information
npx vitest run --reporter=verbose --outputFile=test-timing.json
```

### Resource Usage

Monitor resource usage during tests:

```bash
# Check memory usage during E2E tests
npx playwright test --reporter=html
```

## Best Practices

### Test Maintenance

1. **Regular baseline updates**: Update visual baselines when UI changes are intentional
2. **Test data cleanup**: Ensure tests clean up after themselves
3. **Parallel execution**: Use test isolation to allow parallel execution
4. **Flaky test monitoring**: Identify and fix unstable tests

### Code Coverage Goals

- **Unit tests**: Aim for >90% code coverage
- **Integration tests**: Cover critical user workflows
- **E2E tests**: Cover complete user journeys
- **Accessibility tests**: Ensure WCAG compliance

### Test Organization

1. **Descriptive test names**: Use clear, specific test descriptions
2. **Test grouping**: Group related tests in describe blocks
3. **Shared utilities**: Create reusable test helpers
4. **Mock consistency**: Use consistent mock data across tests

## Troubleshooting Common Issues

### Test Environment Issues

1. **Port conflicts**: Ensure dev server runs on expected port
2. **Database state**: Reset test database between runs
3. **Authentication**: Verify auth mocking works correctly

### Browser Issues

1. **WebKit quirks**: Some features may behave differently in Safari
2. **Mobile testing**: Ensure mobile viewports are set correctly
3. **Cross-browser differences**: Test in all target browsers

### Performance Issues

1. **Slow tests**: Optimize selectors and waits
2. **Memory leaks**: Ensure proper cleanup in tests
3. **Network timeouts**: Increase timeouts for slow operations

## Getting Help

- **Vitest Documentation**: https://vitest.dev/
- **Playwright Documentation**: https://playwright.dev/
- **Testing Library**: https://testing-library.com/
- **Axe Accessibility**: https://www.deque.com/axe/

For project-specific issues, check:
- Test logs in `test-results/`
- Coverage reports in `coverage/`
- Visual diff images in `test-results/`