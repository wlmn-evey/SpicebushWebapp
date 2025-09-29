# Comprehensive Magic Link Authentication Test Plan

## Overview
This document outlines a comprehensive browser automation test plan for the Spicebush Montessori magic link authentication system. The plan covers all aspects of the authentication flow, from initial request through session management and logout.

## Architecture Summary
- **Authentication Provider**: Supabase Auth with OTP/Magic Link
- **Session Management**: Custom SessionManager with hashed tokens stored in database
- **Cookie**: `sbms-session` for session tracking
- **Admin Check**: Email-based validation against admin configuration
- **Route Protection**: Middleware-based protection with coming soon mode bypass

## 1. Test Environment Setup

### Required Tools
```bash
# Primary testing framework
npm install --save-dev @playwright/test

# Email testing
npm install --save-dev mailhog # For local email capture
npm install --save-dev @sendgrid/mail # For production email testing

# Additional utilities
npm install --save-dev dotenv # Environment management
npm install --save-dev faker # Test data generation
```

### Environment Configuration
```env
# .env.test
E2E_BASE_URL=http://localhost:4321
MAILHOG_URL=http://localhost:8025
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-test-key
TEST_ADMIN_EMAIL=evey@eveywinters.com
TEST_NON_ADMIN_EMAIL=parent@example.com
TEST_TIMEOUT=30000
```

### Email Testing Strategy
1. **Local Development**: Use MailHog to capture emails
2. **CI/CD**: Use test email service (Mailtrap, SendGrid test mode)
3. **Production Testing**: Use dedicated test email addresses with monitoring

### Test Data Setup
```typescript
// test-data/users.ts
export const TEST_USERS = {
  admin: {
    email: 'evey@eveywinters.com',
    role: 'admin',
    name: 'Test Admin'
  },
  nonAdmin: {
    email: 'parent@example.com',
    role: 'parent',
    name: 'Test Parent'
  },
  blocked: {
    email: 'blocked@example.com',
    role: 'blocked',
    name: 'Blocked User'
  }
};
```

## 2. Core Test Scenarios

### 2.1 Complete Magic Link Flow Test
```typescript
// e2e/magic-link-complete-flow.spec.ts
test('complete magic link authentication flow', async ({ page }) => {
  // 1. Request magic link
  await page.goto('/auth/magic-login');
  await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
  await page.click('button[type="submit"]');
  
  // 2. Verify success message
  await expect(page.locator('#success-message')).toBeVisible();
  
  // 3. Retrieve magic link from email
  const magicLink = await retrieveMagicLinkFromEmail(TEST_ADMIN_EMAIL);
  
  // 4. Click magic link
  await page.goto(magicLink);
  
  // 5. Verify callback processing
  await expect(page.locator('text=Processing Magic Link')).toBeVisible();
  
  // 6. Verify redirect to admin
  await page.waitForURL('**/admin**');
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  
  // 7. Verify session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'sbms-session');
  expect(sessionCookie).toBeTruthy();
});
```

### 2.2 Session Persistence Test
```typescript
test('session persists across page reloads and navigation', async ({ page }) => {
  // Authenticate
  await authenticateAsAdmin(page);
  
  // Test reload
  await page.reload();
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  
  // Test navigation
  await page.goto('/');
  await page.goto('/admin');
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  
  // Test direct API access
  const response = await page.request.get('/api/auth/check');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.authenticated).toBe(true);
});
```

### 2.3 Protected Route Access Test
```typescript
test('protected routes redirect to login when unauthenticated', async ({ page }) => {
  const protectedRoutes = [
    '/admin',
    '/admin/newsletter',
    '/admin/settings',
    '/admin/communications'
  ];
  
  for (const route of protectedRoutes) {
    await page.goto(route);
    await page.waitForURL('**/auth/login**');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  }
});
```

### 2.4 Logout Functionality Test
```typescript
test('logout clears session and prevents access', async ({ page }) => {
  // Authenticate
  await authenticateAsAdmin(page);
  
  // Logout
  await page.click('button:has-text("Sign Out")');
  
  // Verify redirect
  await page.waitForURL(url => !url.includes('/admin'));
  
  // Verify session cleared
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'sbms-session');
  expect(sessionCookie).toBeFalsy();
  
  // Verify cannot access admin
  await page.goto('/admin');
  await page.waitForURL('**/auth/login**');
});
```

## 3. Edge Cases

### 3.1 Expired Magic Links
```typescript
test('expired magic link shows appropriate error', async ({ page }) => {
  // Simulate expired token (24+ hours old)
  const expiredLink = generateExpiredMagicLink();
  await page.goto(expiredLink);
  
  await expect(page.locator('text=Invalid or expired')).toBeVisible();
  await expect(page.locator('a:has-text("Request new link")')).toBeVisible();
});
```

### 3.2 Multiple Login Attempts
```typescript
test('handles multiple rapid login attempts gracefully', async ({ page }) => {
  await page.goto('/auth/magic-login');
  await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
  
  // Click submit multiple times
  const promises = Array(5).fill(null).map(() => 
    page.click('button[type="submit"]')
  );
  await Promise.all(promises);
  
  // Should only send one email
  const emails = await getEmailsForAddress(TEST_ADMIN_EMAIL);
  expect(emails.length).toBe(1);
});
```

### 3.3 Session Conflicts
```typescript
test('handles multiple browser sessions correctly', async ({ browser }) => {
  // Create two contexts (simulating different browsers)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Authenticate in both
  await authenticateAsAdmin(page1);
  await authenticateAsAdmin(page2);
  
  // Both should have valid sessions
  await page1.goto('/admin');
  await expect(page1.locator('text=Admin Dashboard')).toBeVisible();
  
  await page2.goto('/admin');
  await expect(page2.locator('text=Admin Dashboard')).toBeVisible();
  
  // Logout from one shouldn't affect the other
  await page1.click('button:has-text("Sign Out")');
  
  await page2.reload();
  await expect(page2.locator('text=Admin Dashboard')).toBeVisible();
});
```

### 3.4 Browser Compatibility
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

### 3.5 Network Failures
```typescript
test('handles network failures gracefully', async ({ page }) => {
  await page.goto('/auth/magic-login');
  
  // Go offline before submitting
  await page.context().setOffline(true);
  
  await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
  await page.click('button[type="submit"]');
  
  // Should show error
  await expect(page.locator('text=/failed|error|offline/i')).toBeVisible();
  
  // Form should remain functional
  await page.context().setOffline(false);
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});
```

## 4. Security Testing

### 4.1 Cookie Manipulation Test
```typescript
test('rejects manipulated session cookies', async ({ page }) => {
  // Set fake session cookie
  await page.context().addCookies([{
    name: 'sbms-session',
    value: 'fake-session-token',
    domain: 'localhost',
    path: '/'
  }]);
  
  // Try to access admin
  await page.goto('/admin');
  await page.waitForURL('**/auth/login**');
  
  // Verify API also rejects
  const response = await page.request.get('/api/auth/check');
  expect(response.status()).toBe(401);
});
```

### 4.2 Direct Admin Page Access Test
```typescript
test('prevents direct admin access without authentication', async ({ page }) => {
  // Attempt direct access to various admin pages
  const adminPages = [
    '/admin',
    '/admin/newsletter',
    '/admin/settings',
    '/admin/communications/templates'
  ];
  
  for (const adminPage of adminPages) {
    await page.goto(adminPage);
    await page.waitForURL('**/auth/login**');
    
    // Verify no admin content is visible
    await expect(page.locator('text=Admin Dashboard')).not.toBeVisible();
  }
});
```

### 4.3 Token Tampering Test
```typescript
test('rejects tampered magic link tokens', async ({ page }) => {
  const tamperedLinks = [
    '/auth/callback?type=magiclink&token=tampered-token',
    '/auth/callback?type=magiclink&token=',
    '/auth/callback?type=magiclink',
    '/auth/callback?token=valid-token', // Missing type
  ];
  
  for (const link of tamperedLinks) {
    await page.goto(link);
    await expect(page.locator('text=/Invalid|error/i')).toBeVisible();
  }
});
```

### 4.4 Session Hijacking Prevention
```typescript
test('prevents session hijacking via IP change', async ({ page }) => {
  // Authenticate normally
  await authenticateAsAdmin(page);
  
  // Get session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'sbms-session');
  
  // Create new context with different IP (simulated)
  const hijackContext = await browser.newContext({
    extraHTTPHeaders: {
      'X-Forwarded-For': '192.168.1.100'
    }
  });
  
  // Add stolen cookie
  await hijackContext.addCookies([sessionCookie]);
  
  // Attempt access
  const hijackPage = await hijackContext.newPage();
  const response = await hijackPage.request.get('/api/auth/check');
  
  // Should detect suspicious activity
  expect(response.status()).toBe(401);
});
```

## 5. Implementation Details

### 5.1 Helper Functions
```typescript
// helpers/auth-helpers.ts
export async function authenticateAsAdmin(page: Page) {
  const magicLink = await requestMagicLink(page, TEST_ADMIN_EMAIL);
  await page.goto(magicLink);
  await page.waitForURL('**/admin**');
}

export async function requestMagicLink(page: Page, email: string): Promise<string> {
  await page.goto('/auth/magic-login');
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#success-message');
  
  return await retrieveMagicLinkFromEmail(email);
}

export async function retrieveMagicLinkFromEmail(email: string): Promise<string> {
  // Implementation depends on email testing strategy
  if (process.env.USE_MAILHOG) {
    return await getMailHogLink(email);
  } else if (process.env.USE_MAILTRAP) {
    return await getMailtrapLink(email);
  }
  throw new Error('No email testing service configured');
}
```

### 5.2 Test Data Management
```typescript
// fixtures/test-database.ts
export async function seedTestData() {
  // Create test users in Supabase
  const users = [
    { email: TEST_ADMIN_EMAIL, role: 'admin' },
    { email: TEST_NON_ADMIN_EMAIL, role: 'parent' }
  ];
  
  for (const user of users) {
    await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { role: user.role }
    });
  }
}

export async function cleanupTestData() {
  // Remove test sessions
  await supabase
    .from('admin_sessions')
    .delete()
    .in('user_email', [TEST_ADMIN_EMAIL, TEST_NON_ADMIN_EMAIL]);
  
  // Remove test audit logs
  await supabase
    .from('admin_audit_log')
    .delete()
    .in('user_email', [TEST_ADMIN_EMAIL, TEST_NON_ADMIN_EMAIL]);
}
```

### 5.3 CI/CD Integration
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      mailhog:
        image: mailhog/mailhog
        ports:
          - 1025:1025
          - 8025:8025
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup Supabase
        run: |
          npm install -g supabase
          supabase start
          
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:4321
          MAILHOG_URL: http://localhost:8025
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 6. Test Execution Strategy

### 6.1 Test Suites
1. **Smoke Tests**: Critical path validation (5 min)
2. **Full Regression**: All test scenarios (30 min)
3. **Security Suite**: Security-focused tests (15 min)
4. **Performance Suite**: Load and performance tests (20 min)

### 6.2 Execution Schedule
- **On Commit**: Smoke tests
- **On PR**: Full regression
- **Nightly**: Full regression + Security + Performance
- **Weekly**: Cross-browser compatibility

### 6.3 Monitoring and Alerts
```typescript
// monitoring/auth-monitor.ts
export async function monitorAuthenticationHealth() {
  const metrics = {
    loginAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    avgLoginTime: 0,
    sessionCreationFailures: 0
  };
  
  // Run synthetic login test
  const startTime = Date.now();
  try {
    await syntheticLoginTest();
    metrics.successfulLogins++;
  } catch (error) {
    metrics.failedLogins++;
    await alertOncall('Authentication failure', error);
  }
  metrics.avgLoginTime = Date.now() - startTime;
  
  // Log metrics
  await logMetrics('auth-health', metrics);
}
```

## 7. Maintenance and Updates

### Regular Tasks
1. **Weekly**: Review and update test email addresses
2. **Monthly**: Analyze test failures and update selectors
3. **Quarterly**: Review and expand test coverage
4. **Annually**: Full security audit of authentication flow

### Test Data Cleanup
```bash
# cleanup-test-data.sh
#!/bin/bash

# Remove old test sessions
psql $DATABASE_URL -c "DELETE FROM admin_sessions WHERE user_email LIKE '%test%' AND created_at < NOW() - INTERVAL '7 days';"

# Clean audit logs
psql $DATABASE_URL -c "DELETE FROM admin_audit_log WHERE user_email LIKE '%test%' AND created_at < NOW() - INTERVAL '30 days';"

# Archive old test results
find ./test-results -mtime +30 -type f -name "*.json" -exec gzip {} \;
```

## Next Steps

1. Implement the core test suite
2. Set up email testing infrastructure
3. Configure CI/CD pipeline
4. Create monitoring dashboards
5. Document troubleshooting guide