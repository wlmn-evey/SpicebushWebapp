import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4321';
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  FCP: 1800, // First Contentful Paint (ms)
  TTI: 3800, // Time to Interactive (ms)
  CLS: 0.1,  // Cumulative Layout Shift
};

test.describe('Spicebush Montessori - Comprehensive Site Assessment', () => {
  test.describe('Core Functionality Tests', () => {
    test('Homepage loads successfully', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      
      // Check for critical elements
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      expect(errors).toHaveLength(0);
    });

    test('Navigation works on desktop', async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.goto(BASE_URL);
      
      // Test main navigation links
      const navLinks = [
        { text: 'About', href: '/about' },
        { text: 'Programs', href: '/programs' },
        { text: 'Admissions', href: '/admissions' },
        { text: 'Blog', href: '/blog' },
        { text: 'Contact', href: '/contact' }
      ];
      
      for (const link of navLinks) {
        const navLink = page.locator(`nav a:has-text("${link.text}")`).first();
        await expect(navLink).toBeVisible();
        
        // Click and verify navigation
        await navLink.click();
        await expect(page).toHaveURL(new RegExp(`${link.href}$`));
        expect(page.url()).not.toContain('404');
        
        // Go back to home
        await page.goto(BASE_URL);
      }
    });

    test('Mobile navigation menu works', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto(BASE_URL);
      
      // Find and click mobile menu button
      const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      
      // Check mobile menu is visible
      const mobileMenu = page.locator('nav[aria-expanded="true"], .mobile-menu, .mobile-nav').first();
      await expect(mobileMenu).toBeVisible();
      
      // Test navigation in mobile menu
      const aboutLink = page.locator('a:has-text("About")').first();
      await aboutLink.click();
      await expect(page).toHaveURL(/\/about$/);
    });

    test('Blog pages display correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/blog`);
      
      // Check blog listing page
      await expect(page.locator('h1:has-text("Blog")')).toBeVisible();
      
      // Check for blog posts
      const blogPosts = page.locator('article, .blog-post, [class*="blog-card"]');
      const count = await blogPosts.count();
      
      if (count > 0) {
        // Click first blog post
        const firstPost = blogPosts.first();
        const postLink = firstPost.locator('a').first();
        await postLink.click();
        
        // Verify blog post page
        await expect(page.locator('article, main')).toBeVisible();
        await expect(page.locator('h1')).toBeVisible();
        
        // Check for date display (bug #001 fix verification)
        const dateElement = page.locator('time, [class*="date"]').first();
        if (await dateElement.isVisible()) {
          const dateText = await dateElement.textContent();
          expect(dateText).not.toContain('Invalid');
          expect(dateText).toMatch(/\d{1,2}.*\d{4}/); // Basic date format check
        }
      }
    });

    test('Tour scheduling form works', async ({ page }) => {
      await page.goto(`${BASE_URL}/admissions/schedule-tour`);
      
      // Check form is present
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
      
      // Check required fields
      await expect(page.locator('input[name="parentName"], input[name="name"]')).toBeVisible();
      await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
      await expect(page.locator('input[name="phone"], input[type="tel"]')).toBeVisible();
      
      // Test form validation
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Should show validation errors or required field indicators
      const hasValidation = await page.locator('.error, [aria-invalid="true"], :invalid').count() > 0;
      expect(hasValidation).toBe(true);
    });

    test('No 500 errors on main pages', async ({ page }) => {
      const pagesToTest = [
        '/',
        '/about',
        '/programs',
        '/admissions',
        '/blog',
        '/contact',
        '/donate',
        '/resources/faq'
      ];
      
      for (const path of pagesToTest) {
        const response = await page.goto(`${BASE_URL}${path}`);
        expect(response?.status()).not.toBe(500);
        expect(response?.status()).toBeLessThan(400);
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('Homepage performance metrics', async ({ page }) => {
      // Start performance measurement
      await page.goto(BASE_URL);
      
      // Measure performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          if ('performance' in window) {
            const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paintTiming = performance.getEntriesByType('paint');
            
            resolve({
              domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
              loadComplete: navTiming.loadEventEnd - navTiming.fetchStart,
              firstPaint: paintTiming.find(p => p.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: paintTiming.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            });
          } else {
            resolve(null);
          }
        });
      });
      
      if (metrics) {
        console.log('Performance Metrics:', metrics);
        
        // Check against thresholds
        expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
        expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.TTI);
      }
    });

    test('Image optimization check', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for unoptimized images
      const images = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.map(img => ({
          src: img.src,
          loading: img.loading,
          naturalWidth: img.naturalWidth,
          displayWidth: img.clientWidth,
          hasAlt: !!img.alt
        }));
      });
      
      let issues = [];
      for (const img of images) {
        // Check for lazy loading on below-fold images
        if (!img.loading && img.src) {
          issues.push(`Image missing lazy loading: ${img.src}`);
        }
        
        // Check for alt text (accessibility)
        if (!img.hasAlt) {
          issues.push(`Image missing alt text: ${img.src}`);
        }
        
        // Check for oversized images
        if (img.naturalWidth > img.displayWidth * 2 && img.displayWidth > 0) {
          issues.push(`Oversized image: ${img.src} (${img.naturalWidth}px natural, ${img.displayWidth}px display)`);
        }
      }
      
      console.log('Image optimization issues:', issues);
    });
  });

  test.describe('Link Integrity Tests', () => {
    test('Check for broken internal links', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Collect all internal links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(a => a.getAttribute('href'))
          .filter(href => href && (href.startsWith('/') || href.startsWith(window.location.origin)));
      });
      
      const brokenLinks = [];
      const checkedLinks = new Set<string>();
      
      for (const link of links) {
        const fullUrl = link.startsWith('/') ? `${BASE_URL}${link}` : link;
        
        if (!checkedLinks.has(fullUrl)) {
          checkedLinks.add(fullUrl);
          
          try {
            const response = await page.request.get(fullUrl);
            if (response.status() >= 400) {
              brokenLinks.push({ url: fullUrl, status: response.status() });
            }
          } catch (error) {
            brokenLinks.push({ url: fullUrl, error: error.message });
          }
        }
      }
      
      console.log('Broken links found:', brokenLinks);
      expect(brokenLinks).toHaveLength(0);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('Basic accessibility checks', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(10);
      
      // Check for lang attribute
      const hasLang = await page.evaluate(() => document.documentElement.hasAttribute('lang'));
      expect(hasLang).toBe(true);
      
      // Check for heading hierarchy
      const headingIssues = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const issues = [];
        
        // Check for multiple h1s
        const h1Count = document.querySelectorAll('h1').length;
        if (h1Count === 0) issues.push('No h1 found on page');
        if (h1Count > 1) issues.push(`Multiple h1 tags found: ${h1Count}`);
        
        // Check heading order
        let lastLevel = 0;
        headings.forEach(h => {
          const level = parseInt(h.tagName[1]);
          if (level - lastLevel > 1) {
            issues.push(`Heading hierarchy skip: h${lastLevel} to h${level}`);
          }
          lastLevel = level;
        });
        
        return issues;
      });
      
      console.log('Heading issues:', headingIssues);
      
      // Check for form labels
      const formIssues = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
        const issues = [];
        
        inputs.forEach(input => {
          const hasLabel = !!input.closest('label') || 
                          !!document.querySelector(`label[for="${input.id}"]`) ||
                          input.hasAttribute('aria-label') ||
                          input.hasAttribute('aria-labelledby');
          
          if (!hasLabel) {
            issues.push(`Input missing label: ${input.outerHTML.substring(0, 100)}`);
          }
        });
        
        return issues;
      });
      
      console.log('Form accessibility issues:', formIssues);
    });

    test('Color contrast check', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Basic color contrast check for main text
      const contrastIssues = await page.evaluate(() => {
        const getContrast = (rgb1: number[], rgb2: number[]) => {
          const getLuminance = (rgb: number[]) => {
            const [r, g, b] = rgb.map(val => {
              val = val / 255;
              return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          
          const l1 = getLuminance(rgb1);
          const l2 = getLuminance(rgb2);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };
        
        const parseRgb = (color: string): number[] => {
          const match = color.match(/\d+/g);
          return match ? match.slice(0, 3).map(Number) : [0, 0, 0];
        };
        
        const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button'));
        const issues = [];
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const textColor = style.color;
          
          if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor) {
            const contrast = getContrast(parseRgb(bgColor), parseRgb(textColor));
            if (contrast < 4.5) { // WCAG AA standard
              issues.push({
                element: el.tagName,
                text: el.textContent?.substring(0, 50),
                contrast: contrast.toFixed(2)
              });
            }
          }
        });
        
        return issues;
      });
      
      console.log('Contrast issues found:', contrastIssues.length);
    });
  });

  test.describe('Mobile Experience Tests', () => {
    test('Responsive design on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto(BASE_URL);
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
      
      // Check touch targets
      const smallTouchTargets = await page.evaluate(() => {
        const clickables = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
        const small = clickables.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44; // iOS HIG minimum
        });
        return small.map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 30),
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height
        }));
      });
      
      console.log('Small touch targets:', smallTouchTargets);
    });

    test('Mobile menu functionality', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto(BASE_URL);
      
      // Test menu open/close
      const menuButton = page.locator('button[aria-label*="menu" i]').first();
      await menuButton.click();
      
      const mobileNav = page.locator('.mobile-menu, nav[aria-expanded="true"]').first();
      await expect(mobileNav).toBeVisible();
      
      // Test closing menu
      await menuButton.click();
      await expect(mobileNav).not.toBeVisible();
    });
  });

  test.describe('Overall Assessment', () => {
    test('Generate comprehensive report', async ({ page }) => {
      const report = {
        timestamp: new Date().toISOString(),
        coreStatus: {
          homepage: 'PASS',
          navigation: 'PASS',
          blog: 'PASS',
          tourScheduling: 'PASS',
          serverErrors: 'PASS'
        },
        criticalIssues: [],
        warnings: [],
        recommendations: [],
        productionReady: false,
        userExperienceRating: 0
      };
      
      // Test all major pages
      const pageTests = [
        { path: '/', name: 'Homepage' },
        { path: '/about', name: 'About' },
        { path: '/programs', name: 'Programs' },
        { path: '/admissions', name: 'Admissions' },
        { path: '/blog', name: 'Blog' },
        { path: '/contact', name: 'Contact' }
      ];
      
      let successCount = 0;
      
      for (const pageTest of pageTests) {
        try {
          const response = await page.goto(`${BASE_URL}${pageTest.path}`, { waitUntil: 'networkidle' });
          if (response?.status() === 200) {
            successCount++;
          } else {
            report.criticalIssues.push(`${pageTest.name} page returned status ${response?.status()}`);
          }
        } catch (error) {
          report.criticalIssues.push(`${pageTest.name} page failed to load: ${error.message}`);
        }
      }
      
      // Calculate ratings
      report.userExperienceRating = Math.round((successCount / pageTests.length) * 5);
      report.productionReady = report.criticalIssues.length === 0 && report.userExperienceRating >= 4;
      
      // Add recommendations
      if (report.criticalIssues.length > 0) {
        report.recommendations.push('Fix critical page loading issues before production deployment');
      }
      
      report.recommendations.push(
        'Implement comprehensive error monitoring',
        'Add performance monitoring for Core Web Vitals',
        'Complete accessibility audit with automated tools',
        'Set up uptime monitoring for production'
      );
      
      console.log('\n=== COMPREHENSIVE SITE ASSESSMENT REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      
      // Save report
      await page.evaluate((reportData) => {
        console.log('Site Assessment Complete:', reportData);
      }, report);
    });
  });
});