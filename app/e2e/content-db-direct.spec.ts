import { test, expect } from '@playwright/test';

test.describe('Direct Database Content Access', () => {
  test('should load blog posts from database', async ({ page }) => {
    await page.goto('/blog');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check that blog posts container exists
    const blogContainer = page.locator('[data-testid="blog-posts"], .blog-posts, main');
    await expect(blogContainer).toBeVisible();
    
    // Verify that at least one blog post is rendered
    const blogPosts = page.locator('article, [class*="blog-post"], [class*="post-card"]');
    const postCount = await blogPosts.count();
    
    expect(postCount).toBeGreaterThan(0);
  });

  test('should load individual blog post', async ({ page }) => {
    // First, navigate to blog page to get a valid slug
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    
    // Click on the first blog post link
    const firstPostLink = page.locator('a[href^="/blog/"]').first();
    const postHref = await firstPostLink.getAttribute('href');
    
    if (postHref) {
      await firstPostLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a blog post page
      expect(page.url()).toContain('/blog/');
      
      // Check for blog post content
      const postTitle = page.locator('h1, [class*="title"]').first();
      await expect(postTitle).toBeVisible();
      
      const postContent = page.locator('article, [class*="content"], .prose');
      await expect(postContent).toBeVisible();
    }
  });

  test('should display hours information', async ({ page }) => {
    await page.goto('/');
    
    // Look for hours widget or navigate to a page with hours
    const hoursSection = page.locator('[class*="hours"], [data-testid="hours-info"]');
    
    if (await hoursSection.isVisible()) {
      // Verify hours are displayed
      const dayElements = hoursSection.locator('[class*="day"]');
      const dayCount = await dayElements.count();
      
      expect(dayCount).toBeGreaterThan(0);
    }
  });

  test('should load teacher information', async ({ page }) => {
    // Navigate to about page or homepage where teachers might be shown
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Look for teachers section
    const teachersSection = page.locator('[class*="teacher"], [data-testid="teachers"]');
    
    if (await teachersSection.count() > 0) {
      // Verify teacher cards are displayed
      const teacherCards = teachersSection.locator('[class*="teacher-card"], [class*="staff"]');
      const teacherCount = await teacherCards.count();
      
      expect(teacherCount).toBeGreaterThan(0);
    }
  });

  test('should handle database errors gracefully', async ({ page }) => {
    // Navigate to test page that might trigger DB errors
    const response = await page.goto('/test-direct-db', { 
      waitUntil: 'networkidle' 
    });
    
    // Page should load even if database has issues
    expect(response?.status()).toBeLessThan(500);
    
    // Check for any error messages
    const errorMessages = page.locator('[class*="error"], [role="alert"]');
    const errorCount = await errorMessages.count();
    
    // If errors are shown, they should be user-friendly
    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent();
      expect(errorText).not.toContain('stack trace');
      expect(errorText).not.toContain('postgres://');
    }
  });

  test('should load settings-based content', async ({ page }) => {
    await page.goto('/');
    
    // Check if coming soon mode is active
    const comingSoonElements = page.locator('[class*="coming-soon"], [data-testid="coming-soon"]');
    const isComingSoon = await comingSoonElements.count() > 0;
    
    if (isComingSoon) {
      // Verify coming soon page elements
      const heading = page.locator('h1, h2').first();
      await expect(heading).toContainText(/coming soon|under construction/i);
    } else {
      // Verify normal site content
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });
});

test.describe('Content Type Specific Tests', () => {
  test('should load photo gallery if photos exist', async ({ page }) => {
    // Try both gallery and homepage for photos
    const pagesToCheck = ['/', '/about', '/gallery'];
    
    for (const path of pagesToCheck) {
      await page.goto(path);
      
      const images = page.locator('img[src*="/images/"], img[src*="/optimized/"]');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Verify images load properly
        const firstImage = images.first();
        await expect(firstImage).toBeVisible();
        
        // Check image has valid src
        const src = await firstImage.getAttribute('src');
        expect(src).toBeTruthy();
        
        break; // Found images, no need to check other pages
      }
    }
  });

  test('should load testimonials if they exist', async ({ page }) => {
    await page.goto('/');
    
    const testimonials = page.locator('[class*="testimonial"], [data-testid="testimonials"]');
    
    if (await testimonials.count() > 0) {
      // Verify testimonial content
      const testimonialText = testimonials.locator('[class*="quote"], blockquote');
      const textCount = await testimonialText.count();
      
      expect(textCount).toBeGreaterThan(0);
      
      // Check for author attribution
      const authors = testimonials.locator('[class*="author"], cite');
      expect(await authors.count()).toBeGreaterThan(0);
    }
  });

  test('should load tuition information', async ({ page }) => {
    // Navigate to admissions or tuition calculator
    await page.goto('/admissions/tuition-calculator');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if tuition data is loaded
    const tuitionElements = page.locator('[class*="tuition"], [data-testid="tuition"]');
    
    if (await tuitionElements.count() > 0) {
      // Verify tuition rates or calculator is present
      const priceElements = page.locator('[class*="price"], [class*="rate"], [class*="cost"]');
      expect(await priceElements.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Database Connection Monitoring', () => {
  test('test page shows successful connection', async ({ page }) => {
    await page.goto('/test-direct-db');
    await page.waitForLoadState('networkidle');
    
    // Look for success indicators
    const successElements = page.locator('text=/connected|success|✓/i');
    const successCount = await successElements.count();
    
    expect(successCount).toBeGreaterThan(0);
    
    // Verify data sections are shown
    const dataSections = page.locator('h2, h3, [class*="section"]');
    const sectionCount = await dataSections.count();
    
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('verifies all content types can be accessed', async ({ page }) => {
    await page.goto('/test-direct-db');
    await page.waitForLoadState('networkidle');
    
    // Expected content types
    const contentTypes = ['blog', 'events', 'staff', 'settings'];
    
    for (const contentType of contentTypes) {
      const typeElement = page.locator(`text=/${contentType}/i`);
      await expect(typeElement).toBeVisible();
    }
  });
});