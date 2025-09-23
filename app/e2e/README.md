# Magic Link Authentication E2E Tests

This directory contains comprehensive end-to-end tests for the magic link authentication system.

## Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Set Up Environment

Create a `.env.test` file:

```env
E2E_BASE_URL=http://localhost:4321
MAILHOG_URL=http://localhost:8025
EMAIL_TEST_STRATEGY=mailhog
TEST_ADMIN_EMAIL=evey@eveywinters.com
TEST_NON_ADMIN_EMAIL=parent@example.com
```

### 3. Start Test Services

For local testing with email capture:

```bash
# Start MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Start Supabase
supabase start

# Start the app
npm run dev
```

### 4. Run Tests

```bash
# Run all auth tests
npx playwright test e2e/magic-link-*.spec.ts

# Run specific test file
npx playwright test e2e/magic-link-comprehensive.spec.ts

# Run in headed mode (see browser)
npx playwright test e2e/magic-link-comprehensive.spec.ts --headed

# Run specific test
npx playwright test -g "should complete full magic link authentication flow"

# Run with specific browser
npx playwright test --project=firefox

# Run security tests only
npx playwright test e2e/magic-link-security.spec.ts
```

## Test Structure

### Core Test Files

1. **magic-link-comprehensive.spec.ts** - Main authentication flow tests
   - Complete authentication flow
   - Session management
   - Protected routes
   - Logout functionality
   - Edge cases and error handling

2. **magic-link-security.spec.ts** - Security-focused tests
   - Input validation
   - XSS prevention
   - CSRF protection
   - Session security
   - Rate limiting

3. **magic-link-performance.spec.ts** - Performance tests (to be created)
   - Load times
   - Concurrent users
   - Resource usage

### Helper Modules

- **helpers/email-test-helper.ts** - Email capture strategies
- **helpers/auth-helpers.ts** - Common authentication utilities

## Email Testing Strategies

### 1. MailHog (Recommended for Local)

```bash
docker-compose up -d mailhog
```

Access MailHog UI at http://localhost:8025

### 2. Console Output (Fallback)

The tests will automatically capture magic links from console output in development mode.

### 3. Mailtrap (CI/CD)

Set up Mailtrap credentials in environment:

```env
EMAIL_TEST_STRATEGY=mailtrap
MAILTRAP_API_TOKEN=your-token
MAILTRAP_INBOX_ID=your-inbox-id
```

## Writing New Tests

### Test Template

```typescript
test.describe('New Feature Tests', () => {
  let helper: MagicLinkTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new MagicLinkTestHelper(page);
    await helper.clearAuthState();
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await helper.goToMagicLogin();
    
    // Act
    await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
    
    // Assert
    await expect(page.locator('#success-message')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Page Object Pattern**: Create helper classes for complex interactions
2. **Clear State**: Always clear auth state before each test
3. **Wait for Elements**: Use proper waits instead of arbitrary delays
4. **Descriptive Names**: Use clear test descriptions
5. **Independent Tests**: Each test should run independently

## Debugging

### Visual Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Debug specific test
npx playwright test --debug -g "test name"
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots on Failure

Tests automatically capture screenshots on failure. Find them in:
- `test-results/*/screenshot.png`

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Nightly schedule (full suite)
- Manual trigger

### Running Different Test Suites

In GitHub Actions, you can manually trigger specific suites:
- **smoke** - Quick critical path tests (5 min)
- **full** - All tests across browsers (30 min)
- **security** - Security-focused tests (15 min)
- **performance** - Performance tests (20 min)

## Troubleshooting

### Common Issues

1. **Email not received**
   - Check MailHog is running: http://localhost:8025
   - Verify EMAIL_TEST_STRATEGY is set correctly
   - Check Supabase logs for email sending errors

2. **Tests timing out**
   - Increase timeout in playwright.config.ts
   - Check if services are running (Supabase, app server)
   - Look for JavaScript errors in browser console

3. **Session issues**
   - Clear all cookies and storage
   - Check Supabase auth settings
   - Verify admin email configuration

### Getting Help

1. Check test output for detailed errors
2. Run with `--debug` flag for step-by-step execution
3. Review helper methods in email-test-helper.ts
4. Check Supabase logs: `supabase logs`

## Maintenance

### Regular Tasks

- **Weekly**: Update test email addresses if needed
- **Monthly**: Review and update selectors
- **Quarterly**: Expand test coverage
- **On Failures**: Update tests for UI changes

### Adding New Test Cases

When adding new authentication features:
1. Add unit tests first
2. Add integration tests
3. Add E2E tests last
4. Update this documentation