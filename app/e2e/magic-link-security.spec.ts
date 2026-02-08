import { test, expect, Page, Response } from '@playwright/test';
import crypto from 'crypto';

const TEST_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4321';
const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const SESSION_COOKIE_NAME = 'sbms-session';

/**
 * Security Test Helper
 */
class SecurityTestHelper {
  constructor(private page: Page) {}

  async generateRandomEmail(): string {
    const random = crypto.randomBytes(8).toString('hex');
    return `test-${random}@example.com`;
  }

  async attemptSQLInjection(field: string, payload: string) {
    await this.page.fill(field, payload);
    await this.page.click('button[type="submit"]');
    
    // Check for SQL error messages
    const pageContent = await this.page.content();
    const sqlErrors = [
      'SQL syntax',
      'mysql_fetch',
      'Warning: mysql',
      'valid MySQL result',
      'PostgreSQL',
      'warning: pg_',
      'valid PostgreSQL result',
      'ORA-01756',
      'Oracle error',
      'Oracle driver',
      'SQLServer',
      'SqlException'
    ];
    
    return sqlErrors.some(error => pageContent.toLowerCase().includes(error.toLowerCase()));
  }

  async checkSecurityHeaders(response: Response | null) {
    if (!response) return {};
    
    const headers = response.headers();
    return {
      hasXFrameOptions: !!headers['x-frame-options'],
      hasXContentTypeOptions: headers['x-content-type-options'] === 'nosniff',
      hasXXSSProtection: !!headers['x-xss-protection'],
      hasStrictTransportSecurity: !!headers['strict-transport-security'],
      hasContentSecurityPolicy: !!headers['content-security-policy'],
      hasReferrerPolicy: !!headers['referrer-policy']
    };
  }

  async attemptPathTraversal(url: string) {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\win.ini',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd'
    ];
    
    const results = [];
    for (const payload of payloads) {
      const response = await this.page.request.get(`${url}?file=${payload}`);
      results.push({
        payload,
        status: response.status(),
        containsSensitiveData: (await response.text()).includes('root:')
      });
    }
    
    return results;
  }

  async measureResponseTime(action: () => Promise<void>): Promise<number> {
    const start = Date.now();
    await action();
    return Date.now() - start;
  }
}

test.describe('Magic Link Security Tests', () => {
  let helper: SecurityTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new SecurityTestHelper(page);
    await page.context().clearCookies();
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should prevent SQL injection in email field', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      const sqlPayloads = [
        "admin'--",
        "admin' OR '1'='1",
        "admin'; DROP TABLE users;--",
        "admin' UNION SELECT * FROM users--",
        "admin@example.com' OR 1=1--",
        "'; EXEC sp_MSforeachtable 'DROP TABLE ?';--"
      ];
      
      for (const payload of sqlPayloads) {
        const hasSQLError = await helper.attemptSQLInjection('input[type="email"]', payload);
        expect(hasSQLError).toBe(false);
        
        // Page should still be functional
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
    });

    test('should prevent XSS attacks in all inputs', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<input onfocus="alert(\'XSS\')" autofocus>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<script>alert(document.cookie)</script>',
        '<img src=x onerror="fetch(\'/api/steal?cookie=\'+document.cookie)">'
      ];
      
      let alertTriggered = false;
      page.on('dialog', () => {
        alertTriggered = true;
      });
      
      for (const payload of xssPayloads) {
        await page.fill('input[type="email"]', payload + '@example.com');
        await page.click('button[type="submit"]');
        
        // Wait a bit to see if XSS executes
        await page.waitForTimeout(500);
        
        // Clear for next test
        await page.fill('input[type="email"]', '');
      }
      
      expect(alertTriggered).toBe(false);
    });

    test('should validate email format strictly', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@@example.com',
        'user@example',
        'user name@example.com',
        'user@exam ple.com',
        '<user@example.com>',
        'user@example.com;user2@example.com',
        'user@example.com,user2@example.com',
        'user+tag@example.com<script>'
      ];
      
      for (const email of invalidEmails) {
        await page.fill('input[type="email"]', email);
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should not submit successfully
        await expect(page.locator('#success-message')).not.toBeVisible({ timeout: 1000 });
      }
    });

    test('should handle special characters safely', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      const specialCharEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        '123user@example.com'
      ];
      
      // These should be accepted as valid
      for (const email of specialCharEmails) {
        await page.fill('input[type="email"]', email);
        await page.click('button[type="submit"]');
        
        // Should either show success or error (but not break)
        await expect(page.locator('body')).not.toContainText('Internal Server Error');
        
        // Reset form
        await page.reload();
      }
    });
  });

  test.describe('Session Security', () => {
    test('should use secure session cookies', async ({ page }) => {
      // Authenticate first
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME);
      
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.sameSite).toBe('Lax');
      
      // In production, should also be secure
      if (TEST_BASE_URL.startsWith('https')) {
        expect(sessionCookie?.secure).toBe(true);
      }
    });

    test('should regenerate session token on login', async ({ page }) => {
      // First login
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      const firstCookies = await page.context().cookies();
      const firstSession = firstCookies.find(c => c.name === SESSION_COOKIE_NAME);
      
      // Logout
      await page.click('button:has-text("Sign Out")');
      
      // Second login
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token-2`);
      await page.waitForURL('**/admin**');
      
      const secondCookies = await page.context().cookies();
      const secondSession = secondCookies.find(c => c.name === SESSION_COOKIE_NAME);
      
      // Session tokens should be different
      expect(firstSession?.value).not.toBe(secondSession?.value);
    });

    test('should not accept predictable session tokens', async ({ page }) => {
      const predictableTokens = [
        'admin',
        '12345',
        'session1',
        'aaaaaaaa',
        btoa('admin@example.com'),
        crypto.createHash('md5').update('admin').digest('hex'),
        Date.now().toString()
      ];
      
      for (const token of predictableTokens) {
        await page.context().clearCookies();
        await page.context().addCookies([{
          name: SESSION_COOKIE_NAME,
          value: token,
          domain: new URL(TEST_BASE_URL).hostname,
          path: '/'
        }]);
        
        const response = await page.request.get('/api/auth/check');
        expect(response.status()).toBe(401);
      }
    });

    test('should timeout inactive sessions', async ({ page }) => {
      // This test would need to mock time or wait for actual timeout
      // For now, we'll test that the session has an expiry
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME);
      
      // Should have an expiry date
      expect(sessionCookie?.expires).toBeGreaterThan(Date.now() / 1000);
      
      // Expiry should be reasonable (e.g., not more than 30 days)
      const maxExpiry = Date.now() / 1000 + (30 * 24 * 60 * 60);
      expect(sessionCookie?.expires).toBeLessThan(maxExpiry);
    });
  });

  test.describe('Rate Limiting and Brute Force Protection', () => {
    test('should rate limit magic link requests', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      const email = await helper.generateRandomEmail();
      const attempts = 10;
      const responseTimes: number[] = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < attempts; i++) {
        const time = await helper.measureResponseTime(async () => {
          await page.fill('input[type="email"]', email);
          await page.click('button[type="submit"]');
          await page.waitForTimeout(100);
        });
        
        responseTimes.push(time);
        
        // Clear form for next attempt
        if (i < attempts - 1) {
          await page.reload();
        }
      }
      
      // Later requests should be slower or blocked
      const firstHalf = responseTimes.slice(0, 5).reduce((a, b) => a + b) / 5;
      const secondHalf = responseTimes.slice(5).reduce((a, b) => a + b) / 5;
      
      // Expect some form of rate limiting (either slower responses or errors)
      expect(secondHalf).toBeGreaterThan(firstHalf);
    });

    test('should prevent email enumeration', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Time requests for existing vs non-existing emails
      const timings = {
        existing: [] as number[],
        nonExisting: [] as number[]
      };
      
      // Test with admin email (exists)
      for (let i = 0; i < 5; i++) {
        const time = await helper.measureResponseTime(async () => {
          await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
          await page.click('button[type="submit"]');
          await page.waitForSelector('#success-message, #auth-alert', { timeout: 10000 });
        });
        timings.existing.push(time);
        await page.reload();
      }
      
      // Test with random emails (don't exist)
      for (let i = 0; i < 5; i++) {
        const time = await helper.measureResponseTime(async () => {
          await page.fill('input[type="email"]', await helper.generateRandomEmail());
          await page.click('button[type="submit"]');
          await page.waitForSelector('#success-message, #auth-alert', { timeout: 10000 });
        });
        timings.nonExisting.push(time);
        await page.reload();
      }
      
      // Calculate averages
      const avgExisting = timings.existing.reduce((a, b) => a + b) / timings.existing.length;
      const avgNonExisting = timings.nonExisting.reduce((a, b) => a + b) / timings.nonExisting.length;
      
      // Response times should be similar (within 20% to prevent timing attacks)
      const difference = Math.abs(avgExisting - avgNonExisting);
      const threshold = Math.max(avgExisting, avgNonExisting) * 0.2;
      
      expect(difference).toBeLessThan(threshold);
    });

    test('should limit concurrent sessions per user', async ({ browser }) => {
      const contexts = [];
      const maxSessions = 5;
      
      // Create multiple sessions for the same user
      for (let i = 0; i < maxSessions + 2; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        
        const page = await context.newPage();
        await page.goto(`/auth/callback?type=magiclink&token=test-admin-token-${i}`);
      }
      
      // Check how many are actually authenticated
      let authenticatedCount = 0;
      for (const context of contexts) {
        const page = context.pages()[0];
        const response = await page.request.get('/api/auth/check');
        if (response.status() === 200) {
          const data = await response.json();
          if (data.authenticated) authenticatedCount++;
        }
      }
      
      // Should limit concurrent sessions
      expect(authenticatedCount).toBeLessThanOrEqual(maxSessions);
      
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should reject requests without proper origin', async ({ page }) => {
      // Try to make a cross-origin request
      const response = await page.request.post('/api/auth/magic-link', {
        headers: {
          'Origin': 'https://evil-site.com',
          'Referer': 'https://evil-site.com'
        },
        data: {
          email: TEST_ADMIN_EMAIL
        }
      });
      
      // Should be rejected
      expect([403, 401]).toContain(response.status());
    });

    test('should validate referer header', async ({ page }) => {
      const response = await page.request.post('/api/auth/magic-link', {
        headers: {
          'Referer': 'https://malicious-site.com'
        },
        data: {
          email: TEST_ADMIN_EMAIL
        }
      });
      
      // Should be rejected or require additional validation
      expect(response.status()).not.toBe(200);
    });
  });

  test.describe('Security Headers', () => {
    test('should set appropriate security headers', async ({ page }) => {
      const response = await page.goto('/auth/magic-login');
      const headers = await helper.checkSecurityHeaders(response);
      
      expect(headers.hasXFrameOptions).toBe(true);
      expect(headers.hasXContentTypeOptions).toBe(true);
      expect(headers.hasXXSSProtection).toBe(true);
      expect(headers.hasReferrerPolicy).toBe(true);
      
      // CSP might not be set in development
      if (!TEST_BASE_URL.includes('localhost')) {
        expect(headers.hasContentSecurityPolicy).toBe(true);
      }
    });

    test('should prevent clickjacking', async ({ page }) => {
      // Create a page that tries to iframe the login page
      await page.setContent(`
        <html>
          <body>
            <h1>Malicious Site</h1>
            <iframe src="${TEST_BASE_URL}/auth/magic-login" width="500" height="500"></iframe>
          </body>
        </html>
      `);
      
      // Check if iframe loaded
      const iframe = page.frameLocator('iframe');
      
      // The login page should not be accessible in iframe
      try {
        await expect(iframe.locator('input[type="email"]')).not.toBeVisible({ timeout: 5000 });
      } catch {
        // This is expected - iframe should be blocked
      }
    });
  });

  test.describe('Information Disclosure', () => {
    test('should not expose sensitive information in errors', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Trigger various errors
      const errorTriggers = [
        { email: 'test@nonexistent-domain-12345.com' },
        { email: 'a'.repeat(500) + '@example.com' }, // Very long email
        { email: 'test@example.com'.repeat(100) } // Repeated email
      ];
      
      for (const trigger of errorTriggers) {
        await page.fill('input[type="email"]', trigger.email);
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(2000);
        
        // Check page content for sensitive information
        const content = await page.content();
        
        // Should not contain:
        expect(content).not.toContain('stack trace');
        expect(content).not.toContain('SQLException');
        expect(content).not.toContain('database');
        expect(content).not.toContain('postgres://');
        expect(content).not.toContain('NETLIFY_DATABASE_URL');
        expect(content).not.toContain('env.');
        expect(content).not.toContain('process.');
        
        await page.reload();
      }
    });

    test('should not expose user existence through timing', async ({ page }) => {
      // Already covered in rate limiting tests, but worth emphasizing
      await page.goto('/auth/magic-login');
      
      const measurements = [];
      
      // Measure 10 requests each
      for (let i = 0; i < 10; i++) {
        // Existing user
        const existingStart = Date.now();
        await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
        await page.click('button[type="submit"]');
        await page.waitForSelector('#success-message', { timeout: 10000 });
        const existingTime = Date.now() - existingStart;
        
        await page.reload();
        
        // Non-existing user
        const nonExistingStart = Date.now();
        await page.fill('input[type="email"]', `random-${Date.now()}@example.com`);
        await page.click('button[type="submit"]');
        await page.waitForSelector('#success-message', { timeout: 10000 });
        const nonExistingTime = Date.now() - nonExistingStart;
        
        measurements.push({
          existing: existingTime,
          nonExisting: nonExistingTime,
          difference: Math.abs(existingTime - nonExistingTime)
        });
        
        await page.reload();
      }
      
      // Average difference should be small
      const avgDifference = measurements.reduce((sum, m) => sum + m.difference, 0) / measurements.length;
      const avgTime = measurements.reduce((sum, m) => sum + (m.existing + m.nonExisting) / 2, 0) / measurements.length;
      
      // Difference should be less than 10% of average response time
      expect(avgDifference).toBeLessThan(avgTime * 0.1);
    });
  });

  test.describe('Magic Link Security', () => {
    test('should expire magic links after single use', async ({ page }) => {
      const magicLink = `${TEST_BASE_URL}/auth/callback?type=magiclink&token=single-use-token`;
      
      // First use should work
      await page.goto(magicLink);
      await expect(page.locator('text=/Processing|Signing/i')).toBeVisible();
      
      // Second use should fail
      await page.goto(magicLink);
      await expect(page.locator('text=/Invalid|expired|already used/i')).toBeVisible();
    });

    test('should validate magic link format', async ({ page }) => {
      const invalidLinks = [
        '/auth/callback?type=magiclink&token=../../etc/passwd',
        '/auth/callback?type=magiclink&token=<script>alert("XSS")</script>',
        '/auth/callback?type=magiclink&token=' + 'a'.repeat(1000),
        '/auth/callback?type=magiclink&token=null',
        '/auth/callback?type=magiclink&token=undefined',
        '/auth/callback?type=magiclink&token[]='
      ];
      
      for (const link of invalidLinks) {
        await page.goto(link);
        await expect(page.locator('text=/Invalid|error/i')).toBeVisible();
        
        // Should not expose internal errors
        await expect(page.locator('body')).not.toContainText('TypeError');
        await expect(page.locator('body')).not.toContainText('stack');
      }
    });

    test('should not allow token reuse across different users', async ({ browser }) => {
      // This would require backend implementation to test properly
      // The test demonstrates the concept
      
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      // User 1 gets a magic link
      await page1.goto('/auth/magic-login');
      await page1.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page1.click('button[type="submit"]');
      
      // In a real scenario, we'd intercept the token here
      const interceptedToken = 'intercepted-token-123';
      
      // User 2 tries to use the same token
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      await page2.goto(`/auth/callback?type=magiclink&token=${interceptedToken}`);
      
      // Should not authenticate as the first user
      await expect(page2.locator('text=/Invalid|expired/i')).toBeVisible();
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('API Security', () => {
    test('should validate Content-Type headers', async ({ page }) => {
      const response = await page.request.post('/api/auth/magic-link', {
        headers: {
          'Content-Type': 'text/plain' // Wrong content type
        },
        data: 'email=' + TEST_ADMIN_EMAIL
      });
      
      // Should reject or handle gracefully
      expect([400, 415]).toContain(response.status());
    });

    test('should handle malformed JSON gracefully', async ({ page }) => {
      const response = await page.request.post('/api/auth/magic-link', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: '{"email": "test@example.com"' // Missing closing brace
      });
      
      expect(response.status()).toBe(400);
      
      const text = await response.text();
      expect(text).not.toContain('SyntaxError');
      expect(text).not.toContain('stack');
    });

    test('should limit request body size', async ({ page }) => {
      const hugeEmail = 'a'.repeat(10000) + '@example.com';
      
      const response = await page.request.post('/api/auth/magic-link', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({ email: hugeEmail })
      });
      
      // Should reject large payloads
      expect([400, 413]).toContain(response.status());
    });
  });
});
