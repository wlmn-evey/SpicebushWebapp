import { test, expect } from '@playwright/test';

test.describe('Database Error Verification', () => {
  // Pages to test for database errors
  const pagesToTest = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/programs', name: 'Programs' },
    { path: '/admissions', name: 'Admissions' },
    { path: '/contact', name: 'Contact' },
    { path: '/blog', name: 'Blog' },
    { path: '/donate', name: 'Donate' },
    { path: '/our-principles', name: 'Our Principles' }
  ];

  test.beforeEach(async ({ page }) => {
    // Set up console error listener
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Check for database-related errors
        if (text.includes('relation') && text.includes('does not exist')) {
          throw new Error(`Database error detected: ${text}`);
        }
        if (text.includes('supabase') && text.includes('error')) {
          throw new Error(`Supabase error detected: ${text}`);
        }
      }
    });

    // Set up response listener for API errors
    page.on('response', response => {
      if (response.status() >= 400) {
        const url = response.url();
        if (url.includes('supabase') || url.includes('/api/')) {
          console.error(`API Error: ${response.status()} - ${url}`);
        }
      }
    });
  });

  pagesToTest.forEach(({ path, name }) => {
    test(`${name} page should load without database errors`, async ({ page }) => {
      // Navigate to the page
      const response = await page.goto(path);
      
      // Check response status
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Check for error messages in the page content
      const pageContent = await page.content();
      expect(pageContent).not.toContain('relation');
      expect(pageContent).not.toContain('does not exist');
      expect(pageContent).not.toContain('Database error');
      expect(pageContent).not.toContain('Supabase error');
      
      // Check for specific database-dependent elements
      if (path === '/') {
        // Homepage should show hours widget
        const hoursSection = await page.locator('[data-testid="hours-widget"], .hours-info, .hours-widget').first();
        await expect(hoursSection).toBeVisible({ timeout: 10000 });
      }
      
      if (path === '/contact') {
        // Contact form should be visible
        const contactForm = await page.locator('form').first();
        await expect(contactForm).toBeVisible();
      }
      
      if (path === '/blog') {
        // Blog should show posts or empty state
        const blogContent = await page.locator('main').first();
        await expect(blogContent).toBeVisible();
      }
    });
  });

  test('Hours widget should display data from database', async ({ page }) => {
    await page.goto('/');
    
    // Wait for hours widget to load
    const hoursWidget = await page.locator('.hours-info, .hours-widget, [data-testid="hours-widget"]').first();
    await expect(hoursWidget).toBeVisible({ timeout: 10000 });
    
    // Check that it contains day information
    const hoursContent = await hoursWidget.textContent();
    expect(hoursContent).toBeTruthy();
    
    // Should contain at least one day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const containsDay = days.some(day => hoursContent?.includes(day));
    expect(containsDay).toBe(true);
  });

  test('Contact form should submit successfully', async ({ page }) => {
    await page.goto('/contact');
    
    // Fill out the form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '555-0123');
    await page.selectOption('select[name="interest"]', 'tour');
    await page.fill('textarea[name="message"]', 'This is a test message');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should either redirect to success page or show success message
    await page.waitForURL(/contact-success|contact/, { timeout: 10000 });
    
    // Check for success indicators
    const pageUrl = page.url();
    const pageContent = await page.content();
    
    const isSuccess = 
      pageUrl.includes('contact-success') ||
      pageContent.includes('Thank you') ||
      pageContent.includes('successfully') ||
      pageContent.includes('We\'ll be in touch');
    
    expect(isSuccess).toBe(true);
  });

  test('Newsletter signup should work', async ({ page }) => {
    await page.goto('/');
    
    // Find newsletter form
    const newsletterForm = await page.locator('form').filter({ hasText: /newsletter|subscribe/i }).first();
    
    if (await newsletterForm.isVisible()) {
      // Fill email
      const emailInput = await newsletterForm.locator('input[type="email"]').first();
      await emailInput.fill('newsletter-test@example.com');
      
      // Submit
      const submitButton = await newsletterForm.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = await page.locator('text=/success|thank|subscribed/i').first();
      const isSuccess = await successMessage.isVisible().catch(() => false);
      
      expect(isSuccess).toBe(true);
    }
  });

  test('Admin routes should not throw database errors', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/settings',
      '/admin/photos',
      '/admin/hours',
      '/admin/tuition'
    ];

    for (const route of adminRoutes) {
      const response = await page.goto(route);
      
      // Admin routes might redirect to login, but shouldn't throw database errors
      expect(response?.status()).toBeLessThan(500);
      
      // Check console for database errors
      await page.waitForTimeout(1000);
      
      const pageContent = await page.content();
      expect(pageContent).not.toContain('relation');
      expect(pageContent).not.toContain('does not exist');
    }
  });

  test('API endpoints should respond without database errors', async ({ request }) => {
    const apiEndpoints = [
      '/api/settings',
      '/api/content/hours',
      '/api/newsletter/subscribe',
      '/api/communications/send'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await request.get(endpoint);
        
        // Even if unauthorized, should not be a 500 error
        expect(response.status()).toBeLessThan(500);
        
        // Check response body for database errors
        const body = await response.text();
        expect(body).not.toContain('relation');
        expect(body).not.toContain('does not exist');
      } catch (error) {
        // API might not exist, but shouldn't be a database error
        expect(error.message).not.toContain('relation');
        expect(error.message).not.toContain('does not exist');
      }
    }
  });
});