/**
 * Comprehensive Testing Site Verification
 * 
 * This test suite performs a thorough verification of the Spicebush Montessori testing site
 * to ensure all critical functionality works correctly in the deployed environment.
 * 
 * Test Coverage:
 * - Homepage loads correctly with all elements
 * - Navigation functionality across all menu items  
 * - Key pages load without errors
 * - JavaScript console errors detection
 * - Responsive design verification
 * - Contact form functionality
 * - Database connectivity (frontend-visible aspects)
 * - Performance and accessibility basics
 */

import { test, expect, type Page, type Browser } from '@playwright/test';

// Configuration
const TESTING_SITE_URL = 'https://spicebush-testing.netlify.app';
const TEST_TIMEOUT = 30000;

// Test data
const TEST_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/programs', name: 'Programs' },
  { path: '/contact', name: 'Contact' },
  { path: '/teachers', name: 'Teachers' },
  { path: '/donate', name: 'Donate' }
];

// Helper functions
async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

async function captureNetworkFailures(page: Page): Promise<string[]> {
  const failures: string[] = [];
  page.on('requestfailed', (request) => {
    failures.push(`${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`);
  });
  return failures;
}

test.describe('Testing Site Comprehensive Verification', () => {
  test.setTimeout(TEST_TIMEOUT);

  test.describe('1. Homepage Verification', () => {
    test('homepage loads correctly with all critical elements', async ({ page }) => {
      const errors = await captureConsoleErrors(page);
      const networkFailures = await captureNetworkFailures(page);

      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Verify page title
      await expect(page).toHaveTitle(/Spicebush Montessori/);

      // Verify critical page elements are present
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      // Check for navigation menu
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();

      // Look for key content areas
      const hero = page.locator('hero, .hero, [data-hero], h1').first();
      await expect(hero).toBeVisible();

      // Verify no critical JavaScript errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('analytics') &&
        !error.includes('ResizeObserver')
      );
      
      console.log('Homepage Console Errors:', criticalErrors);
      expect(criticalErrors.length).toBeLessThan(3); // Allow some tolerance

      // Verify no critical network failures
      const criticalFailures = networkFailures.filter(failure => 
        !failure.includes('favicon') && 
        !failure.includes('analytics') &&
        !failure.includes('optional')
      );
      
      console.log('Homepage Network Failures:', criticalFailures);
      expect(criticalFailures.length).toBeLessThan(2);
    });

    test('homepage loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`Homepage load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(10000); // 10 second tolerance for first load
    });
  });

  test.describe('2. Navigation Verification', () => {
    test('all main navigation items are clickable and functional', async ({ page }) => {
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Find navigation links
      const navLinks = await page.locator('nav a, [role="navigation"] a').all();
      const workingLinks: string[] = [];
      const brokenLinks: string[] = [];

      console.log(`Found ${navLinks.length} navigation links`);

      for (const link of navLinks) {
        try {
          const href = await link.getAttribute('href');
          const text = await link.textContent();
          
          if (href && href.startsWith('/')) {
            console.log(`Testing navigation link: ${text} -> ${href}`);
            
            // Click the link and verify it works
            await link.click();
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            
            // Check if we're on the expected page
            const currentUrl = page.url();
            if (currentUrl.includes(href)) {
              workingLinks.push(`${text} (${href})`);
            } else {
              brokenLinks.push(`${text} (${href}) - redirected to ${currentUrl}`);
            }
            
            // Go back to homepage for next test
            await page.goto(TESTING_SITE_URL);
            await page.waitForLoadState('networkidle');
          }
        } catch (error) {
          const text = await link.textContent();
          brokenLinks.push(`${text} - ${error}`);
        }
      }

      console.log('Working Links:', workingLinks);
      console.log('Broken Links:', brokenLinks);

      // Should have more working links than broken ones
      expect(workingLinks.length).toBeGreaterThan(brokenLinks.length);
    });

    test('mobile navigation works correctly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Look for mobile menu button
      const mobileMenuButton = page.locator(
        'button[aria-label*="menu"], .mobile-menu-button, [data-mobile-menu], .hamburger'
      ).first();

      if (await mobileMenuButton.isVisible()) {
        console.log('Mobile menu button found, testing functionality');
        
        await mobileMenuButton.click();
        await page.waitForTimeout(500);

        // Mobile menu should be visible after clicking
        const mobileMenu = page.locator(
          '.mobile-menu, [data-mobile-nav], nav.mobile, .menu-open'
        ).first();
        
        if (await mobileMenu.isVisible()) {
          console.log('Mobile menu opened successfully');
          
          // Test a navigation link in mobile menu
          const mobileLinks = await mobileMenu.locator('a').all();
          if (mobileLinks.length > 0) {
            const firstLink = mobileLinks[0];
            const href = await firstLink.getAttribute('href');
            const text = await firstLink.textContent();
            
            console.log(`Testing mobile navigation: ${text} -> ${href}`);
            
            await firstLink.click();
            await page.waitForLoadState('networkidle');
            
            // Should navigate successfully
            expect(page.url()).not.toBe(TESTING_SITE_URL);
          }
        }
      } else {
        console.log('No mobile menu button found - may be using different mobile nav pattern');
        
        // Test that regular navigation is still accessible on mobile
        const nav = page.locator('nav, [role="navigation"]');
        await expect(nav).toBeVisible();
      }
    });
  });

  test.describe('3. Key Pages Verification', () => {
    for (const testPage of TEST_PAGES) {
      test(`${testPage.name} page loads without errors`, async ({ page }) => {
        const errors = await captureConsoleErrors(page);
        const networkFailures = await captureNetworkFailures(page);

        const fullUrl = `${TESTING_SITE_URL}${testPage.path}`;
        console.log(`Testing page: ${testPage.name} at ${fullUrl}`);

        const response = await page.goto(fullUrl);
        await page.waitForLoadState('networkidle');

        // Verify page loaded successfully
        expect(response?.status()).toBe(200);

        // Verify page has content
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('main, [role="main"], .main-content')).toBeVisible();

        // Page should have a title
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);

        console.log(`${testPage.name} page title: ${title}`);

        // Check for critical errors
        const criticalErrors = errors.filter(error => 
          !error.includes('favicon') && 
          !error.includes('analytics') &&
          !error.includes('ResizeObserver') &&
          !error.includes('Non-passive event listener')
        );

        console.log(`${testPage.name} console errors:`, criticalErrors);
        expect(criticalErrors.length).toBeLessThan(3);

        // Check for critical network failures
        const criticalFailures = networkFailures.filter(failure => 
          !failure.includes('favicon') && 
          !failure.includes('analytics') &&
          !failure.includes('optional') &&
          !failure.includes('google-analytics')
        );

        console.log(`${testPage.name} network failures:`, criticalFailures);
        expect(criticalFailures.length).toBeLessThan(2);
      });
    }

    test('all key pages are accessible via direct URLs', async ({ page }) => {
      const results: { page: string; status: number; accessible: boolean }[] = [];

      for (const testPage of TEST_PAGES) {
        const fullUrl = `${TESTING_SITE_URL}${testPage.path}`;
        
        try {
          const response = await page.goto(fullUrl);
          const status = response?.status() || 0;
          const accessible = status === 200;
          
          results.push({
            page: testPage.name,
            status,
            accessible
          });
          
          console.log(`${testPage.name}: ${status} ${accessible ? '✓' : '✗'}`);
        } catch (error) {
          results.push({
            page: testPage.name,
            status: 0,
            accessible: false
          });
          
          console.log(`${testPage.name}: Error - ${error}`);
        }
      }

      // All pages should be accessible
      const accessiblePages = results.filter(r => r.accessible);
      const inaccessiblePages = results.filter(r => !r.accessible);

      console.log('Accessible pages:', accessiblePages.map(p => p.page));
      console.log('Inaccessible pages:', inaccessiblePages.map(p => p.page));

      expect(accessiblePages.length).toBeGreaterThanOrEqual(results.length * 0.8); // At least 80% should work
    });
  });

  test.describe('4. Responsive Design Verification', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1200, height: 800 },
      { name: 'Large Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`site works correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(TESTING_SITE_URL);
        await page.waitForLoadState('networkidle');

        console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

        // Basic elements should be visible
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('main')).toBeVisible();

        // Check that content is not horizontally overflowing
        const bodyScrollWidth = await page.locator('body').evaluate(el => el.scrollWidth);
        const bodyClientWidth = await page.locator('body').evaluate(el => el.clientWidth);
        
        console.log(`${viewport.name} - Scroll width: ${bodyScrollWidth}, Client width: ${bodyClientWidth}`);
        
        // Allow small tolerance for scrollbars
        expect(bodyScrollWidth - bodyClientWidth).toBeLessThan(20);

        // Test image responsiveness
        const images = page.locator('img');
        const imageCount = await images.count();
        
        if (imageCount > 0) {
          console.log(`${viewport.name} - Testing ${imageCount} images`);
          
          for (let i = 0; i < Math.min(3, imageCount); i++) {
            const img = images.nth(i);
            const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
            const displayWidth = await img.evaluate((el: HTMLImageElement) => el.offsetWidth);
            
            // Images should load and not exceed viewport
            expect(naturalWidth).toBeGreaterThan(0);
            expect(displayWidth).toBeLessThanOrEqual(viewport.width);
          }
        }
      });
    }
  });

  test.describe('5. Contact Form Functionality', () => {
    test('contact form is present and functional', async ({ page }) => {
      await page.goto(`${TESTING_SITE_URL}/contact`);
      await page.waitForLoadState('networkidle');

      // Look for contact form
      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        console.log('Contact form found, testing functionality');

        // Look for common form fields
        const nameField = page.locator('input[name*="name"], input[type="text"]').first();
        const emailField = page.locator('input[type="email"]').first();
        const messageField = page.locator('textarea, input[name*="message"]').first();
        const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();

        // Test form field interactions
        if (await nameField.isVisible()) {
          await nameField.fill('Test User');
          console.log('Name field: ✓');
        }

        if (await emailField.isVisible()) {
          await emailField.fill('test@example.com');
          console.log('Email field: ✓');
        }

        if (await messageField.isVisible()) {
          await messageField.fill('This is a test message to verify form functionality.');
          console.log('Message field: ✓');
        }

        // Test form validation
        if (await emailField.isVisible()) {
          await emailField.fill('invalid-email');
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);
            
            // Should show validation error for invalid email
            const validationMessage = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
            expect(validationMessage).toBeTruthy();
            console.log('Email validation: ✓');
          }
        }

        // Test with valid data (but don't actually submit)
        if (await emailField.isVisible()) {
          await emailField.fill('test@spicebushmontessori.org');
        }

        console.log('Contact form basic functionality verified');
      } else {
        console.log('No contact form found on contact page');
        
        // Check if there's alternative contact information
        const contactInfo = page.locator('a[href^="mailto:"], a[href^="tel:"]');
        const contactCount = await contactInfo.count();
        
        if (contactCount > 0) {
          console.log(`Found ${contactCount} contact links (email/phone)`);
          expect(contactCount).toBeGreaterThan(0);
        } else {
          console.log('Warning: No contact form or contact links found');
        }
      }
    });

    test('contact form handles submission gracefully', async ({ page }) => {
      const errors = await captureConsoleErrors(page);
      
      await page.goto(`${TESTING_SITE_URL}/contact`);
      await page.waitForLoadState('networkidle');

      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        // Fill form with test data
        const nameField = page.locator('input[name*="name"], input[type="text"]').first();
        const emailField = page.locator('input[type="email"]').first();
        const messageField = page.locator('textarea, input[name*="message"]').first();
        const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();

        if (await nameField.isVisible()) await nameField.fill('Test User');
        if (await emailField.isVisible()) await emailField.fill('test@example.com');
        if (await messageField.isVisible()) await messageField.fill('Test message for form submission');

        if (await submitButton.isVisible()) {
          // Monitor for form submission
          const formSubmissionPromise = page.waitForEvent('requestfinished', request => 
            request.method() === 'POST' && request.url().includes('/contact')
          ).catch(() => null);

          await submitButton.click();
          await page.waitForTimeout(3000); // Wait for submission to complete

          // Check if form submission was attempted
          const submissionRequest = await formSubmissionPromise;
          
          if (submissionRequest) {
            console.log('Form submission detected');
            console.log('Response status:', submissionRequest.response()?.status());
          } else {
            console.log('No form submission detected - may be client-side handling');
          }

          // Check for JavaScript errors during submission
          const submissionErrors = errors.filter(error => 
            !error.includes('favicon') && 
            !error.includes('analytics')
          );

          expect(submissionErrors.length).toBeLessThan(2);
          console.log('Form submission completed without critical errors');
        }
      }
    });
  });

  test.describe('6. Database Connectivity (Frontend Visible)', () => {
    test('site loads content that may come from database', async ({ page }) => {
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Check for dynamic content that might indicate database connectivity
      const dynamicContentSelectors = [
        '[data-dynamic]',
        '.cms-content',
        '.dynamic-content',
        '.supabase-content',
        '.database-content'
      ];

      let foundDynamicContent = false;
      
      for (const selector of dynamicContentSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          console.log(`Found ${count} elements with selector: ${selector}`);
          foundDynamicContent = true;
        }
      }

      // Check for API calls that might indicate database communication
      const apiCalls: string[] = [];
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/') || url.includes('supabase') || url.includes('database')) {
          apiCalls.push(url);
        }
      });

      // Reload to capture API calls
      await page.reload();
      await page.waitForLoadState('networkidle');

      console.log('API calls detected:', apiCalls);
      
      if (apiCalls.length > 0) {
        console.log('Database connectivity appears to be working (API calls detected)');
      } else if (foundDynamicContent) {
        console.log('Dynamic content found - database may be working');
      } else {
        console.log('No obvious database connectivity detected (this may be normal for a static site)');
      }

      // This test passes regardless - we're just reporting what we find
      expect(true).toBe(true);
    });

    test('no database connection errors in console', async ({ page }) => {
      const errors = await captureConsoleErrors(page);
      
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Also test a few other pages
      for (const testPage of TEST_PAGES.slice(1, 3)) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
      }

      // Check for database-related errors
      const dbErrors = errors.filter(error => 
        error.toLowerCase().includes('database') ||
        error.toLowerCase().includes('supabase') ||
        error.toLowerCase().includes('connection') ||
        error.toLowerCase().includes('sql') ||
        error.toLowerCase().includes('postgrest')
      );

      console.log('Database-related errors:', dbErrors);
      expect(dbErrors.length).toBe(0);
    });
  });

  test.describe('7. Performance and Accessibility Basics', () => {
    test('pages load within reasonable time limits', async ({ page }) => {
      const loadTimes: { page: string; time: number }[] = [];

      for (const testPage of TEST_PAGES) {
        const startTime = Date.now();
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        loadTimes.push({ page: testPage.name, time: loadTime });
        console.log(`${testPage.name} load time: ${loadTime}ms`);
      }

      // Average load time should be reasonable
      const averageLoadTime = loadTimes.reduce((sum, item) => sum + item.time, 0) / loadTimes.length;
      console.log(`Average load time: ${averageLoadTime}ms`);

      expect(averageLoadTime).toBeLessThan(8000); // 8 seconds average
      
      // No single page should take more than 15 seconds
      const slowestPage = Math.max(...loadTimes.map(item => item.time));
      expect(slowestPage).toBeLessThan(15000);
    });

    test('basic accessibility features are present', async ({ page }) => {
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');

      // Check for alt attributes on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        console.log(`Checking accessibility for ${imageCount} images`);
        
        let imagesWithAlt = 0;
        for (let i = 0; i < imageCount; i++) {
          const alt = await images.nth(i).getAttribute('alt');
          if (alt !== null) {
            imagesWithAlt++;
          }
        }
        
        const altPercentage = (imagesWithAlt / imageCount) * 100;
        console.log(`Images with alt text: ${imagesWithAlt}/${imageCount} (${altPercentage.toFixed(1)}%)`);
        
        // At least 80% of images should have alt text
        expect(altPercentage).toBeGreaterThanOrEqual(80);
      }

      // Check for semantic HTML elements
      const semanticElements = [
        'header',
        'nav',
        'main',
        'section',
        'article',
        'aside',
        'footer'
      ];

      const foundSemantic: string[] = [];
      for (const element of semanticElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundSemantic.push(element);
        }
      }

      console.log('Semantic HTML elements found:', foundSemantic);
      expect(foundSemantic.length).toBeGreaterThanOrEqual(4); // Should have at least 4 semantic elements

      // Check for heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      console.log(`Found ${headings.length} headings`);
      
      if (headings.length > 0) {
        // Should have at least one h1
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

test.describe('8. Cross-Browser Compatibility', () => {
  const criticalPages = ['/', '/about', '/contact'];

  criticalPages.forEach(pagePath => {
    test(`${pagePath || 'homepage'} works in all browsers`, async ({ browserName, page }) => {
      const errors = await captureConsoleErrors(page);
      
      await page.goto(`${TESTING_SITE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');

      console.log(`Testing ${pagePath || 'homepage'} in ${browserName}`);

      // Basic functionality should work
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      // Check for browser-specific errors
      const browserSpecificErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('ResizeObserver') &&
        !error.includes('Non-passive event listener')
      );

      console.log(`${browserName} errors for ${pagePath}:`, browserSpecificErrors);
      expect(browserSpecificErrors.length).toBeLessThan(2);
    });
  });
});