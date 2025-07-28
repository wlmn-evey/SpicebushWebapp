import { test, expect } from '@playwright/test';

const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';

test.describe('Magic Link Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should load magic login page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/magic-login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds on fast connection
    expect(loadTime).toBeLessThan(3000);
    
    // Critical elements should be visible quickly
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle form submission within acceptable time', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    // Should show loading state immediately
    await expect(page.locator('#loading-spinner')).toBeVisible({ timeout: 500 });
    
    // Should complete within reasonable time
    await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
    
    const submitTime = Date.now() - startTime;
    
    // Form submission should complete within 10 seconds
    expect(submitTime).toBeLessThan(10000);
  });

  test('should handle callback processing efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/callback?type=magiclink&token=test-token');
    
    // Should show processing state quickly
    await expect(page.locator('text=Signing you in')).toBeVisible({ timeout: 1000 });
    
    // Should complete authentication flow
    await page.waitForURL('**/admin**', { timeout: 15000 });
    
    const callbackTime = Date.now() - startTime;
    
    // Callback processing should complete within 15 seconds
    expect(callbackTime).toBeLessThan(15000);
  });

  test('should handle concurrent authentication attempts', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    const startTime = Date.now();
    
    // Simulate concurrent magic link requests
    const requests = pages.map(async (page, index) => {
      await page.goto('/auth/magic-login');
      await page.fill('input[type="email"]', `admin${index}@spicebushmontessori.org`);
      await page.click('button[type="submit"]');
      return page.waitForSelector('#success-message', { timeout: 15000 });
    });
    
    await Promise.all(requests);
    
    const concurrentTime = Date.now() - startTime;
    
    // Concurrent requests should complete within reasonable time
    expect(concurrentTime).toBeLessThan(20000);
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should maintain performance under slow network conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Add 200ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    
    await page.goto('/auth/magic-login');
    
    // Should still load within acceptable time on slow connection
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8000 });
    
    const slowLoadTime = Date.now() - startTime;
    
    // Should load within 8 seconds on slow connection
    expect(slowLoadTime).toBeLessThan(8000);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    // LCP should be under 2.5 seconds for good performance
    expect(lcp).toBeLessThan(2500);
    
    // Measure Cumulative Layout Shift (CLS)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after a delay to collect layout shifts
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    // CLS should be under 0.1 for good performance
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('Magic Link Reliability Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should handle network interruptions gracefully', async ({ page }) => {
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    // Simulate network going offline during submission
    await page.context().setOffline(true);
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('#auth-alert')).toBeVisible({ timeout: 5000 });
    
    // Restore network and retry
    await page.context().setOffline(false);
    await page.click('button[type="submit"]');
    
    // Should succeed on retry
    await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
  });

  test('should recover from temporary server errors', async ({ page }) => {
    let requestCount = 0;
    
    // Mock server error on first request, success on second
    await page.route('**/auth/v1/otp', async (route) => {
      requestCount++;
      
      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        // Second request succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
    
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    // First attempt should fail
    await page.click('button[type="submit"]');
    await expect(page.locator('#auth-alert')).toBeVisible();
    
    // Retry should succeed
    await page.click('button[type="submit"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test('should handle session timeouts gracefully', async ({ page }) => {
    // Complete authentication
    await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page.waitForURL('**/admin**');
    
    // Simulate session expiration by clearing auth state
    await page.evaluate(() => {
      // Clear session storage
      sessionStorage.clear();
      localStorage.clear();
      
      // Clear auth cookies
      document.cookie = 'sbms-admin-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
    
    // Try to access admin page
    await page.goto('/admin/settings');
    
    // Should redirect to login
    await page.waitForURL('**/auth/login**');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should handle browser refresh during authentication', async ({ page }) => {
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('#success-message')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should return to initial state
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveValue('');
  });

  test('should handle multiple browser tabs correctly', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Authenticate in first tab
    await page1.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page1.waitForURL('**/admin**');
    
    // Second tab should also be authenticated
    await page2.goto('/admin');
    await expect(page2.locator('text=Admin Dashboard')).toBeVisible();
    
    // Logout in first tab
    await page1.click('button:has-text("Sign Out")');
    
    // Second tab should also be logged out
    await page2.reload();
    await page2.waitForURL('**/auth/login**');
    
    await page1.close();
    await page2.close();
  });

  test('should handle rapid successive authentication attempts', async ({ page }) => {
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    // Click submit button multiple times rapidly
    await Promise.all([
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]'),
      page.click('button[type="submit"]'),
    ]);
    
    // Should handle gracefully and show success
    await expect(page.locator('#success-message')).toBeVisible();
    
    // Should not show multiple success messages
    const successMessages = page.locator('#success-message');
    expect(await successMessages.count()).toBe(1);
  });
});

test.describe('Magic Link Load Testing', () => {
  test('should handle burst of authentication requests', async ({ browser }) => {
    const concurrentUsers = 10;
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts to simulate different users
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      pages.push(await context.newPage());
    }
    
    const startTime = Date.now();
    
    try {
      // Simulate concurrent magic link requests
      const requests = pages.map(async (page, index) => {
        await page.goto('/auth/magic-login');
        await page.fill('input[type="email"]', `admin${index}@spicebushmontessori.org`);
        await page.click('button[type="submit"]');
        
        // Wait for either success or error
        try {
          await page.waitForSelector('#success-message', { timeout: 15000 });
          return { success: true, index };
        } catch {
          // Check for error message
          const hasError = await page.locator('#auth-alert').isVisible();
          return { success: false, hasError, index };
        }
      });
      
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // At least 80% should succeed
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / concurrentUsers;
      expect(successRate).toBeGreaterThan(0.8);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds
      
      console.log(`Load test completed: ${successCount}/${concurrentUsers} successful in ${totalTime}ms`);
      
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should maintain performance under sustained load', async ({ browser }) => {
    const sustainedRequests = 5;
    const intervalMs = 2000; // 2 seconds between requests
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const results = [];
    
    try {
      for (let i = 0; i < sustainedRequests; i++) {
        const startTime = Date.now();
        
        await page.goto('/auth/magic-login');
        await page.fill('input[type="email"]', `admin${i}@spicebushmontessori.org`);
        await page.click('button[type="submit"]');
        
        try {
          await page.waitForSelector('#success-message', { timeout: 10000 });
          const responseTime = Date.now() - startTime;
          results.push({ success: true, responseTime, iteration: i });
        } catch {
          const responseTime = Date.now() - startTime;
          results.push({ success: false, responseTime, iteration: i });
        }
        
        // Wait before next request
        if (i < sustainedRequests - 1) {
          await page.waitForTimeout(intervalMs);
        }
      }
      
      // Analyze results
      const successCount = results.filter(r => r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      // Should maintain high success rate
      expect(successCount / sustainedRequests).toBeGreaterThan(0.8);
      
      // Response times should remain reasonable
      expect(avgResponseTime).toBeLessThan(5000);
      
      console.log(`Sustained load test: ${successCount}/${sustainedRequests} successful, avg response time: ${avgResponseTime}ms`);
      
    } finally {
      await context.close();
    }
  });
});

test.describe('Magic Link Memory and Resource Tests', () => {
  test('should not leak memory during repeated authentication', async ({ page }) => {
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform multiple authentication cycles
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth/magic-login');
      await page.fill('input[type="email"]', `admin${i}@spicebushmontessori.org`);
      await page.click('button[type="submit"]');
      await page.waitForSelector('#success-message', { timeout: 10000 });
      
      // Clear and reload
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      // Memory increase should be reasonable (less than 50%)
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('should clean up event listeners and timers', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // Check for potential memory leaks from event listeners
    const listenerCount = await page.evaluate(() => {
      // Count event listeners (this is a simplified check)
      const elements = document.querySelectorAll('*');
      let count = 0;
      
      elements.forEach(el => {
        // This is a basic check - in practice you'd need more sophisticated tools
        if (el.onclick || el.onsubmit || el.onchange) {
          count++;
        }
      });
      
      return count;
    });
    
    // Navigate away and back
    await page.goto('/auth/login');
    await page.goto('/auth/magic-login');
    
    const finalListenerCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let count = 0;
      
      elements.forEach(el => {
        if (el.onclick || el.onsubmit || el.onchange) {
          count++;
        }
      });
      
      return count;
    });
    
    // Listener count should not increase significantly
    expect(finalListenerCount).toBeLessThanOrEqual(listenerCount + 2);
  });
});
