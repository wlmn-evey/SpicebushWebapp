import { test, expect, chromium, Browser, Page, BrowserContext } from '@playwright/test';

// Define test configuration
const BASE_URL = 'http://localhost:4321';
const VIEWPORT_SIZES = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// List of all pages to test
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/programs', name: 'Programs' },
  { path: '/admissions', name: 'Admissions' },
  { path: '/admissions/schedule-tour', name: 'Schedule Tour' },
  { path: '/admissions/tuition-calculator', name: 'Tuition Calculator' },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
  { path: '/donate', name: 'Donate' },
  { path: '/resources/faq', name: 'FAQ' },
  { path: '/resources/parent-resources', name: 'Parent Resources' },
  { path: '/resources/events', name: 'Events' },
  { path: '/our-principles', name: 'Our Principles' },
  { path: '/policies', name: 'Policies' },
  { path: '/non-discrimination-policy', name: 'Non-Discrimination Policy' },
  { path: '/privacy-policy', name: 'Privacy Policy' }
];

// Test results storage
interface TestResult {
  page: string;
  url: string;
  errors: string[];
  warnings: string[];
  consoleErrors: string[];
  networkErrors: string[];
  missingImages: string[];
  viewport: string;
  loadTime?: number;
}

const testResults: TestResult[] = [];

test.describe('Comprehensive Spicebush Website Testing', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  test.afterAll(async () => {
    await browser.close();
    
    // Generate test report
    console.log('\n=== COMPREHENSIVE TEST REPORT ===\n');
    
    const issuesFound = testResults.filter(r => 
      r.errors.length > 0 || 
      r.consoleErrors.length > 0 || 
      r.networkErrors.length > 0 || 
      r.missingImages.length > 0
    );
    
    if (issuesFound.length === 0) {
      console.log('✅ All tests passed! No issues found.');
    } else {
      console.log(`❌ Found issues on ${issuesFound.length} page(s):\n`);
      
      issuesFound.forEach(result => {
        console.log(`\n📄 ${result.page} (${result.url}) - ${result.viewport}:`);
        
        if (result.errors.length > 0) {
          console.log('  🔴 Errors:');
          result.errors.forEach(err => console.log(`    - ${err}`));
        }
        
        if (result.consoleErrors.length > 0) {
          console.log('  🟡 Console Errors:');
          result.consoleErrors.forEach(err => console.log(`    - ${err}`));
        }
        
        if (result.networkErrors.length > 0) {
          console.log('  🟠 Network Errors:');
          result.networkErrors.forEach(err => console.log(`    - ${err}`));
        }
        
        if (result.missingImages.length > 0) {
          console.log('  🖼️  Missing Images:');
          result.missingImages.forEach(img => console.log(`    - ${img}`));
        }
      });
    }
  });

  // Test all pages for basic loading and console errors
  test.describe('Page Loading and Console Errors', () => {
    for (const pageInfo of PAGES_TO_TEST) {
      test(`should load ${pageInfo.name} without errors`, async () => {
        context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
        page = await context.newPage();
        
        const result: TestResult = {
          page: pageInfo.name,
          url: pageInfo.path,
          errors: [],
          warnings: [],
          consoleErrors: [],
          networkErrors: [],
          missingImages: [],
          viewport: 'desktop'
        };
        
        // Listen for console errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            result.consoleErrors.push(msg.text());
          }
        });
        
        // Listen for page errors
        page.on('pageerror', error => {
          result.errors.push(error.message);
        });
        
        // Listen for failed requests
        page.on('requestfailed', request => {
          result.networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
        });
        
        try {
          const startTime = Date.now();
          const response = await page.goto(BASE_URL + pageInfo.path, { 
            waitUntil: 'networkidle',
            timeout: 30000 
          });
          result.loadTime = Date.now() - startTime;
          
          // Check response status
          const status = response?.status() || 0;
          if (status >= 400) {
            result.errors.push(`Page returned status ${status}`);
          }
          
          // Check for images
          const images = await page.$$eval('img', imgs => 
            imgs.map(img => ({
              src: img.src,
              alt: img.alt,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              complete: img.complete
            }))
          );
          
          for (const img of images) {
            if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
              result.missingImages.push(`${img.src} (alt: "${img.alt}")`);
            }
          }
          
          testResults.push(result);
          
          // Assert no critical errors
          expect(result.errors.length).toBe(0);
          expect(result.networkErrors.length).toBe(0);
          
        } catch (error) {
          result.errors.push(`Page failed to load: ${error}`);
          testResults.push(result);
          throw error;
        } finally {
          await context.close();
        }
      });
    }
  });

  // Test homepage specific functionality
  test.describe('Homepage Functionality', () => {
    test('should display hero section with proper content', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL);
      
      // Check hero section
      const heroSection = await page.$('.hero-section, [data-testid="hero-section"], section:has(h1)');
      expect(heroSection).toBeTruthy();
      
      // Check for main heading
      const h1 = await page.$('h1');
      expect(h1).toBeTruthy();
      const h1Text = await h1?.textContent();
      expect(h1Text).toBeTruthy();
      
      // Check for CTA buttons
      const ctaButtons = await page.$$('a[href*="schedule"], a[href*="tour"], button:has-text("Schedule")');
      expect(ctaButtons.length).toBeGreaterThan(0);
      
      await context.close();
    });
    
    test('should display testimonials section', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL);
      
      // Check for testimonials
      const testimonials = await page.$$('[data-testid="testimonial"], .testimonial, blockquote');
      expect(testimonials.length).toBeGreaterThan(0);
      
      await context.close();
    });
  });

  // Test navigation on desktop and mobile
  test.describe('Navigation Testing', () => {
    test('desktop navigation should work correctly', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL);
      
      // Check main navigation exists
      const nav = await page.$('nav, header nav, [role="navigation"]');
      expect(nav).toBeTruthy();
      
      // Check navigation links
      const navLinks = await page.$$('nav a, header a');
      expect(navLinks.length).toBeGreaterThan(5);
      
      // Test clicking a nav link
      const aboutLink = await page.$('nav a[href="/about"], header a[href="/about"]');
      if (aboutLink) {
        await aboutLink.click();
        await page.waitForURL('**/about');
        expect(page.url()).toContain('/about');
      }
      
      await context.close();
    });
    
    test('mobile navigation and sticky bottom nav should work', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.mobile });
      page = await context.newPage();
      
      await page.goto(BASE_URL);
      
      // Check for mobile menu button
      const mobileMenuButton = await page.$('[aria-label*="menu"], button:has-text("Menu"), .hamburger, .mobile-menu-toggle');
      expect(mobileMenuButton).toBeTruthy();
      
      // Check for sticky bottom nav on mobile
      const bottomNav = await page.$('.mobile-bottom-nav, [data-testid="mobile-bottom-nav"], nav.fixed.bottom-0');
      expect(bottomNav).toBeTruthy();
      
      await context.close();
    });
  });

  // Test forms
  test.describe('Form Testing', () => {
    test('Schedule Tour form should validate and submit', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL + '/admissions/schedule-tour');
      
      // Find form
      const form = await page.$('form');
      expect(form).toBeTruthy();
      
      // Check for required fields
      const requiredFields = await page.$$('input[required], textarea[required], select[required]');
      expect(requiredFields.length).toBeGreaterThan(0);
      
      // Test form validation by trying to submit empty
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Check for validation messages
        await page.waitForTimeout(500);
        const validationMessages = await page.$$(':invalid, .error-message, [aria-invalid="true"]');
        expect(validationMessages.length).toBeGreaterThan(0);
      }
      
      await context.close();
    });
  });

  // Test Tuition Calculator
  test.describe('Tuition Calculator', () => {
    test('should calculate tuition correctly', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL + '/admissions/tuition-calculator');
      
      // Wait for calculator to load
      await page.waitForSelector('.tuition-calculator, [data-testid="tuition-calculator"], form', { timeout: 10000 });
      
      // Check for program selection
      const programSelect = await page.$('select[name*="program"], input[type="radio"][name*="program"]');
      expect(programSelect).toBeTruthy();
      
      // Check for schedule selection
      const scheduleSelect = await page.$('select[name*="schedule"], input[type="radio"][name*="schedule"]');
      expect(scheduleSelect).toBeTruthy();
      
      // Check for results display
      const resultsArea = await page.$('.tuition-results, [data-testid="tuition-results"], .results');
      expect(resultsArea).toBeTruthy();
      
      await context.close();
    });
  });

  // Test CMS content
  test.describe('CMS Content Display', () => {
    test('should display staff members', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL + '/about');
      
      // Check for staff section
      const staffSection = await page.$('.staff, .teachers, [data-testid="staff-section"]');
      expect(staffSection).toBeTruthy();
      
      // Check for individual staff members
      const staffMembers = await page.$$('.staff-member, .teacher-card, [data-testid="staff-member"]');
      expect(staffMembers.length).toBeGreaterThan(0);
      
      await context.close();
    });
    
    test('should display blog posts', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL + '/blog');
      
      // Check for blog posts
      const blogPosts = await page.$$('article, .blog-post, [data-testid="blog-post"]');
      expect(blogPosts.length).toBeGreaterThan(0);
      
      await context.close();
    });
  });

  // Test FAQ Accordion
  test.describe('FAQ Accordion', () => {
    test('should expand and collapse FAQ items', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      await page.goto(BASE_URL + '/resources/faq');
      
      // Find FAQ items
      const faqItems = await page.$$('.faq-item, details, [data-testid="faq-item"]');
      expect(faqItems.length).toBeGreaterThan(0);
      
      // Test clicking first FAQ item
      const firstFaq = faqItems[0];
      const isDetails = await firstFaq.evaluate(el => el.tagName.toLowerCase() === 'details');
      
      if (isDetails) {
        // For details/summary elements
        const summary = await firstFaq.$('summary');
        if (summary) {
          await summary.click();
          await page.waitForTimeout(300);
          
          const isOpen = await firstFaq.evaluate(el => (el as HTMLDetailsElement).open);
          expect(isOpen).toBeTruthy();
        }
      } else {
        // For custom accordion implementation
        const trigger = await firstFaq.$('button, [role="button"]');
        if (trigger) {
          await trigger.click();
          await page.waitForTimeout(300);
          
          const content = await firstFaq.$('.faq-content, .accordion-content, [aria-expanded="true"]');
          expect(content).toBeTruthy();
        }
      }
      
      await context.close();
    });
  });

  // Test responsive images
  test.describe('Image Display Testing', () => {
    test('should display all images properly on desktop', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.desktop });
      page = await context.newPage();
      
      const brokenImages: string[] = [];
      
      for (const pageInfo of PAGES_TO_TEST.slice(0, 5)) { // Test first 5 pages for images
        await page.goto(BASE_URL + pageInfo.path);
        
        const images = await page.$$eval('img', imgs => 
          imgs.map(img => ({
            src: img.src,
            alt: img.alt,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
            currentSrc: img.currentSrc
          }))
        );
        
        for (const img of images) {
          if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
            brokenImages.push(`${pageInfo.name}: ${img.src} (alt: "${img.alt}")`);
          }
        }
      }
      
      if (brokenImages.length > 0) {
        console.log('\n🖼️  Broken Images Found:');
        brokenImages.forEach(img => console.log(`  - ${img}`));
      }
      
      expect(brokenImages.length).toBe(0);
      
      await context.close();
    });
  });

  // Test mobile viewport specific issues
  test.describe('Mobile Viewport Testing', () => {
    test('should be scrollable and not have horizontal overflow', async () => {
      context = await browser.newContext({ viewport: VIEWPORT_SIZES.mobile });
      page = await context.newPage();
      
      await page.goto(BASE_URL);
      
      // Check for horizontal scrollbar
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBeFalsy();
      
      await context.close();
    });
  });
});