import { test, expect, Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Test configuration
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

interface UXIssue {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Navigation' | 'Performance' | 'Accessibility' | 'Visual' | 'Functionality' | 'Content' | 'Responsive';
  page: string;
  description: string;
  element?: string;
  screenshot?: string;
  recommendation?: string;
}

const issues: UXIssue[] = [];

// Helper function to add issues
function reportIssue(issue: UXIssue) {
  issues.push(issue);
  console.log(`[${issue.severity}] ${issue.category} - ${issue.page}: ${issue.description}`);
}

// Helper function to test performance
async function testPagePerformance(page: Page, pageName: string) {
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  if (loadTime > 3000) {
    reportIssue({
      severity: 'High',
      category: 'Performance',
      page: pageName,
      description: `Page load time exceeds 3 seconds (${loadTime}ms)`,
      recommendation: 'Optimize images, reduce JavaScript bundle size, implement lazy loading'
    });
  }
}

// Helper function to test accessibility
async function testAccessibility(page: Page, pageName: string) {
  try {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    accessibilityScanResults.violations.forEach((violation) => {
      const severity = violation.impact === 'critical' || violation.impact === 'serious' ? 'Critical' : 
                      violation.impact === 'moderate' ? 'High' : 'Medium';
      
      reportIssue({
        severity: severity as any,
        category: 'Accessibility',
        page: pageName,
        description: `${violation.description} (${violation.nodes.length} instances)`,
        element: violation.nodes[0]?.target.join(' '),
        recommendation: violation.helpUrl
      });
    });
  } catch (error) {
    console.error(`Accessibility test failed for ${pageName}:`, error);
  }
}

// Helper function to test navigation
async function testNavigation(page: Page, viewport: string) {
  // Test main navigation
  try {
    const navMenu = await page.locator('nav, [role="navigation"]').first();
    if (!await navMenu.isVisible()) {
      reportIssue({
        severity: 'Critical',
        category: 'Navigation',
        page: 'Global',
        description: `Navigation menu not visible on ${viewport}`,
        recommendation: 'Ensure navigation is accessible on all viewports'
      });
    }
    
    // Test mobile menu if applicable
    if (viewport === 'mobile') {
      const hamburger = await page.locator('[aria-label*="menu"], .hamburger, .menu-toggle').first();
      if (await hamburger.isVisible()) {
        await hamburger.click();
        await page.waitForTimeout(500);
        const mobileMenu = await page.locator('.mobile-menu, [role="navigation"]:visible').first();
        if (!await mobileMenu.isVisible()) {
          reportIssue({
            severity: 'High',
            category: 'Navigation',
            page: 'Global',
            description: 'Mobile menu does not open when hamburger is clicked',
            recommendation: 'Fix mobile menu toggle functionality'
          });
        }
      }
    }
  } catch (error) {
    console.error('Navigation test error:', error);
  }
}

// Helper function to test forms
async function testForm(page: Page, formSelector: string, pageName: string) {
  try {
    const form = await page.locator(formSelector).first();
    if (await form.isVisible()) {
      // Test form validation
      const submitButton = await form.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Check for validation messages
        const requiredFields = await form.locator('[required]').all();
        for (const field of requiredFields) {
          const validationMessage = await field.evaluate((el: HTMLInputElement) => el.validationMessage);
          if (!validationMessage) {
            reportIssue({
              severity: 'Medium',
              category: 'Functionality',
              page: pageName,
              description: 'Required field validation not working properly',
              element: await field.getAttribute('name') || 'unnamed field',
              recommendation: 'Implement proper HTML5 validation or custom validation messages'
            });
          }
        }
      }
      
      // Test keyboard navigation
      const firstInput = await form.locator('input, textarea, select').first();
      if (await firstInput.isVisible()) {
        await firstInput.focus();
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => document.activeElement?.tagName);
        if (!activeElement) {
          reportIssue({
            severity: 'High',
            category: 'Accessibility',
            page: pageName,
            description: 'Form keyboard navigation not working',
            recommendation: 'Ensure all form elements are keyboard accessible'
          });
        }
      }
    }
  } catch (error) {
    console.error(`Form test error on ${pageName}:`, error);
  }
}

// Helper function to check broken links
async function checkBrokenLinks(page: Page, pageName: string) {
  const links = await page.locator('a[href]').all();
  for (const link of links) {
    try {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const response = await page.request.head(href).catch(() => null);
        if (!response || response.status() >= 400) {
          reportIssue({
            severity: 'High',
            category: 'Functionality',
            page: pageName,
            description: `Broken link found: ${href}`,
            element: await link.textContent() || 'unnamed link',
            recommendation: 'Fix or remove broken links'
          });
        }
      }
    } catch (error) {
      // Skip link check errors
    }
  }
}

// Helper function to check images
async function checkImages(page: Page, pageName: string) {
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    const src = await img.getAttribute('src');
    
    if (!alt && alt !== '') {
      reportIssue({
        severity: 'High',
        category: 'Accessibility',
        page: pageName,
        description: 'Image missing alt text',
        element: src || 'unknown image',
        recommendation: 'Add descriptive alt text to all images'
      });
    }
    
    // Check if image loads
    const isLoaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight !== 0);
    if (!isLoaded) {
      reportIssue({
        severity: 'High',
        category: 'Content',
        page: pageName,
        description: `Image failed to load: ${src}`,
        recommendation: 'Fix image path or replace with working image'
      });
    }
  }
}

test.describe('Comprehensive UX Testing', () => {
  test.beforeAll(() => {
    issues.length = 0; // Clear issues array
  });
  
  test.afterAll(() => {
    // Generate report
    console.log('\n\n=== UX TEST REPORT ===\n');
    console.log(`Total issues found: ${issues.length}\n`);
    
    // Group by severity
    const bySeverity = {
      Critical: issues.filter(i => i.severity === 'Critical'),
      High: issues.filter(i => i.severity === 'High'),
      Medium: issues.filter(i => i.severity === 'Medium'),
      Low: issues.filter(i => i.severity === 'Low')
    };
    
    console.log('Issues by Severity:');
    Object.entries(bySeverity).forEach(([severity, items]) => {
      console.log(`  ${severity}: ${items.length}`);
    });
    
    // Group by category
    console.log('\nIssues by Category:');
    const categories = [...new Set(issues.map(i => i.category))];
    categories.forEach(cat => {
      const count = issues.filter(i => i.category === cat).length;
      console.log(`  ${cat}: ${count}`);
    });
    
    // Detailed report
    console.log('\n=== DETAILED ISSUES ===\n');
    ['Critical', 'High', 'Medium', 'Low'].forEach(severity => {
      const severityIssues = bySeverity[severity as keyof typeof bySeverity];
      if (severityIssues.length > 0) {
        console.log(`\n${severity.toUpperCase()} ISSUES (${severityIssues.length}):\n`);
        severityIssues.forEach((issue, index) => {
          console.log(`${index + 1}. [${issue.category}] ${issue.page}`);
          console.log(`   Description: ${issue.description}`);
          if (issue.element) console.log(`   Element: ${issue.element}`);
          if (issue.recommendation) console.log(`   Recommendation: ${issue.recommendation}`);
          console.log('');
        });
      }
    });
  });

  // Test 1: Homepage across all viewports
  test.describe('Homepage Testing', () => {
    Object.entries(viewports).forEach(([name, viewport]) => {
      test(`Homepage - ${name} viewport`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        
        // Performance test
        await testPagePerformance(page, `Homepage (${name})`);
        
        // Navigation test
        await testNavigation(page, name);
        
        // Accessibility test
        await testAccessibility(page, `Homepage (${name})`);
        
        // Visual tests
        const hero = await page.locator('section:first-of-type, .hero, [class*="hero"]').first();
        if (await hero.isVisible()) {
          const heroHeight = await hero.evaluate(el => el.getBoundingClientRect().height);
          if (heroHeight > viewport.height * 0.9) {
            reportIssue({
              severity: 'Medium',
              category: 'Visual',
              page: `Homepage (${name})`,
              description: 'Hero section takes up more than 90% of viewport height',
              recommendation: 'Consider reducing hero height for better content visibility'
            });
          }
        }
        
        // Check images
        await checkImages(page, `Homepage (${name})`);
        
        // Check CTAs
        const ctaButtons = await page.locator('a[href*="tour"], a[href*="contact"], button:has-text("Schedule"), button:has-text("Contact")').all();
        if (ctaButtons.length === 0) {
          reportIssue({
            severity: 'High',
            category: 'Content',
            page: `Homepage (${name})`,
            description: 'No clear call-to-action buttons found',
            recommendation: 'Add prominent CTAs for scheduling tours or contacting'
          });
        }
      });
    });
  });

  // Test 2: Main navigation pages
  test.describe('Main Pages Testing', () => {
    const mainPages = [
      { path: '/about', name: 'About' },
      { path: '/programs', name: 'Programs' },
      { path: '/admissions', name: 'Admissions' },
      { path: '/our-principles', name: 'Our Principles' },
      { path: '/contact', name: 'Contact' },
      { path: '/blog', name: 'Blog' }
    ];
    
    for (const pageInfo of mainPages) {
      test(`${pageInfo.name} page - Desktop`, async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        
        try {
          await page.goto(pageInfo.path);
          await testPagePerformance(page, pageInfo.name);
          await testAccessibility(page, pageInfo.name);
          await checkImages(page, pageInfo.name);
          await checkBrokenLinks(page, pageInfo.name);
          
          // Page-specific tests
          if (pageInfo.path === '/contact') {
            await testForm(page, 'form', pageInfo.name);
          }
          
          if (pageInfo.path === '/programs') {
            const programCards = await page.locator('[class*="program"], [class*="card"]').all();
            if (programCards.length === 0) {
              reportIssue({
                severity: 'High',
                category: 'Content',
                page: pageInfo.name,
                description: 'No program information cards found',
                recommendation: 'Add clear program listings with details'
              });
            }
          }
          
          if (pageInfo.path === '/admissions') {
            const tuitionInfo = await page.locator('text=/tuition|fee|cost|price/i').first();
            if (!await tuitionInfo.isVisible()) {
              reportIssue({
                severity: 'Medium',
                category: 'Content',
                page: pageInfo.name,
                description: 'Tuition information not readily visible',
                recommendation: 'Make tuition/fee information more prominent'
              });
            }
          }
        } catch (error) {
          reportIssue({
            severity: 'Critical',
            category: 'Functionality',
            page: pageInfo.name,
            description: `Page failed to load: ${error}`,
            recommendation: 'Fix page routing or server errors'
          });
        }
      });
      
      test(`${pageInfo.name} page - Mobile`, async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        
        try {
          await page.goto(pageInfo.path);
          await testNavigation(page, 'mobile');
          
          // Test touch targets
          const clickableElements = await page.locator('a, button, input, select, textarea').all();
          for (const element of clickableElements) {
            if (await element.isVisible()) {
              const box = await element.boundingBox();
              if (box && (box.width < 44 || box.height < 44)) {
                reportIssue({
                  severity: 'High',
                  category: 'Accessibility',
                  page: `${pageInfo.name} (Mobile)`,
                  description: 'Touch target too small (less than 44x44 pixels)',
                  element: await element.textContent() || 'unnamed element',
                  recommendation: 'Increase touch target size to at least 44x44 pixels'
                });
              }
            }
          }
        } catch (error) {
          console.error(`Mobile test failed for ${pageInfo.name}:`, error);
        }
      });
    }
  });

  // Test 3: User journeys
  test.describe('User Journey Testing', () => {
    test('Parent Information Journey', async ({ page }) => {
      await page.goto('/');
      
      // Journey: Parent looking for enrollment information
      try {
        // Step 1: Find programs
        const programsLink = await page.locator('a:has-text("Programs"), a[href*="programs"]').first();
        if (!await programsLink.isVisible()) {
          reportIssue({
            severity: 'Critical',
            category: 'Navigation',
            page: 'Homepage',
            description: 'Programs link not easily findable',
            recommendation: 'Make Programs link more prominent in navigation'
          });
        } else {
          await programsLink.click();
          await page.waitForLoadState('networkidle');
          
          // Step 2: Find age-appropriate program
          const ageGroups = await page.locator('text=/toddler|primary|elementary|3-6|6-9/i').all();
          if (ageGroups.length === 0) {
            reportIssue({
              severity: 'High',
              category: 'Content',
              page: 'Programs',
              description: 'Age groups not clearly defined',
              recommendation: 'Clearly label programs by age group'
            });
          }
          
          // Step 3: Find enrollment info
          const enrollLink = await page.locator('a:has-text("Enroll"), a:has-text("Admissions"), a[href*="admission"]').first();
          if (await enrollLink.isVisible()) {
            await enrollLink.click();
            await page.waitForLoadState('networkidle');
            
            // Step 4: Find tour scheduling
            const tourButton = await page.locator('a:has-text("Schedule"), button:has-text("Schedule"), a[href*="tour"]').first();
            if (!await tourButton.isVisible()) {
              reportIssue({
                severity: 'High',
                category: 'Functionality',
                page: 'Admissions',
                description: 'Tour scheduling option not easily findable',
                recommendation: 'Add prominent "Schedule a Tour" button'
              });
            }
          }
        }
      } catch (error) {
        reportIssue({
          severity: 'Critical',
          category: 'Functionality',
          page: 'User Journey',
          description: `Parent information journey failed: ${error}`,
          recommendation: 'Fix navigation flow for parent enrollment process'
        });
      }
    });
    
    test('Contact Journey', async ({ page }) => {
      await page.goto('/');
      
      try {
        // Find contact information
        const contactLink = await page.locator('a:has-text("Contact"), a[href*="contact"]').first();
        if (!await contactLink.isVisible()) {
          // Check footer
          const footerContact = await page.locator('footer a:has-text("Contact")').first();
          if (!await footerContact.isVisible()) {
            reportIssue({
              severity: 'Critical',
              category: 'Navigation',
              page: 'Global',
              description: 'Contact link not found in header or footer',
              recommendation: 'Add contact link to main navigation and footer'
            });
          }
        } else {
          await contactLink.click();
          await page.waitForLoadState('networkidle');
          
          // Check for essential contact info
          const phone = await page.locator('text=/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/').first();
          const email = await page.locator('a[href^="mailto:"]').first();
          const address = await page.locator('address, text=/\d+.*Street|Avenue|Road|Drive/i').first();
          
          if (!await phone.isVisible()) {
            reportIssue({
              severity: 'High',
              category: 'Content',
              page: 'Contact',
              description: 'Phone number not found',
              recommendation: 'Add clear phone number for inquiries'
            });
          }
          
          if (!await email.isVisible()) {
            reportIssue({
              severity: 'High',
              category: 'Content',
              page: 'Contact',
              description: 'Email address not found',
              recommendation: 'Add clear email address for inquiries'
            });
          }
          
          if (!await address.isVisible()) {
            reportIssue({
              severity: 'Medium',
              category: 'Content',
              page: 'Contact',
              description: 'Physical address not clearly displayed',
              recommendation: 'Add clear school address'
            });
          }
        }
      } catch (error) {
        console.error('Contact journey error:', error);
      }
    });
  });

  // Test 4: Forms and Interactive Elements
  test.describe('Forms Testing', () => {
    test('Tour Scheduling Form', async ({ page }) => {
      try {
        await page.goto('/admissions/schedule-tour');
        await testForm(page, 'form', 'Tour Scheduling');
        
        // Test date picker if present
        const datePicker = await page.locator('input[type="date"], [class*="date"]').first();
        if (await datePicker.isVisible()) {
          await datePicker.click();
          // Check if date picker opens
          const calendar = await page.locator('[role="dialog"], .calendar, [class*="picker"]').first();
          if (!await calendar.isVisible({ timeout: 1000 })) {
            reportIssue({
              severity: 'Medium',
              category: 'Functionality',
              page: 'Tour Scheduling',
              description: 'Date picker not functioning properly',
              recommendation: 'Implement accessible date picker'
            });
          }
        }
      } catch (error) {
        console.error('Tour form test error:', error);
      }
    });
    
    test('Contact Form', async ({ page }) => {
      await page.goto('/contact');
      const form = await page.locator('form').first();
      if (await form.isVisible()) {
        await testForm(page, 'form', 'Contact');
        
        // Test form submission feedback
        const nameInput = await form.locator('input[name*="name"], input[type="text"]').first();
        const emailInput = await form.locator('input[type="email"]').first();
        const messageInput = await form.locator('textarea').first();
        
        if (await nameInput.isVisible() && await emailInput.isVisible() && await messageInput.isVisible()) {
          await nameInput.fill('Test User');
          await emailInput.fill('test@example.com');
          await messageInput.fill('This is a test message');
          
          // Don't actually submit, just check for feedback mechanisms
          const submitButton = await form.locator('button[type="submit"]').first();
          const buttonText = await submitButton.textContent();
          if (!buttonText?.toLowerCase().includes('send') && !buttonText?.toLowerCase().includes('submit')) {
            reportIssue({
              severity: 'Low',
              category: 'Content',
              page: 'Contact Form',
              description: 'Submit button text not clear',
              recommendation: 'Use clear action text like "Send Message"'
            });
          }
        }
      }
    });
  });

  // Test 5: Admin Area
  test.describe('Admin Area Testing', () => {
    test('Admin Login Flow', async ({ page }) => {
      try {
        await page.goto('/auth/login');
        
        // Check for secure connection warning
        if (!page.url().startsWith('https://') && !page.url().includes('localhost')) {
          reportIssue({
            severity: 'Critical',
            category: 'Functionality',
            page: 'Admin Login',
            description: 'Login page not served over HTTPS',
            recommendation: 'Implement SSL/TLS for all authentication pages'
          });
        }
        
        // Test login form
        await testForm(page, 'form', 'Admin Login');
        
        // Check for password visibility toggle
        const passwordInput = await page.locator('input[type="password"]').first();
        if (await passwordInput.isVisible()) {
          const toggleButton = await page.locator('button[aria-label*="password"], [class*="toggle"]').first();
          if (!await toggleButton.isVisible()) {
            reportIssue({
              severity: 'Low',
              category: 'Functionality',
              page: 'Admin Login',
              description: 'No password visibility toggle',
              recommendation: 'Add option to show/hide password'
            });
          }
        }
        
        // Check for forgot password link
        const forgotLink = await page.locator('a:has-text("Forgot"), a[href*="forgot"]').first();
        if (!await forgotLink.isVisible()) {
          reportIssue({
            severity: 'Medium',
            category: 'Functionality',
            page: 'Admin Login',
            description: 'No forgot password option',
            recommendation: 'Add password recovery option'
          });
        }
      } catch (error) {
        console.error('Admin login test error:', error);
      }
    });
  });

  // Test 6: Performance Testing
  test('Performance Metrics', async ({ page }) => {
    const pagesToTest = ['/', '/programs', '/about', '/contact'];
    
    for (const path of pagesToTest) {
      await page.goto(path);
      
      // Measure Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          let lcp = 0;
          let fid = 0;
          let cls = 0;
          
          // LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            lcp = entries[entries.length - 1].startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // CLS
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => {
            resolve({ lcp, cls });
          }, 3000);
        });
      }) as { lcp: number; cls: number };
      
      if (metrics.lcp > 2500) {
        reportIssue({
          severity: 'High',
          category: 'Performance',
          page: path,
          description: `Largest Contentful Paint too slow (${metrics.lcp.toFixed(0)}ms)`,
          recommendation: 'Optimize images and critical rendering path'
        });
      }
      
      if (metrics.cls > 0.1) {
        reportIssue({
          severity: 'Medium',
          category: 'Performance',
          page: path,
          description: `High Cumulative Layout Shift (${metrics.cls.toFixed(3)})`,
          recommendation: 'Add dimensions to images and embeds to prevent layout shifts'
        });
      }
    }
  });

  // Test 7: SEO and Meta Tags
  test('SEO Testing', async ({ page }) => {
    const pagesToTest = [
      { path: '/', expectedTitle: 'Spicebush' },
      { path: '/about', expectedTitle: 'About' },
      { path: '/programs', expectedTitle: 'Programs' }
    ];
    
    for (const pageTest of pagesToTest) {
      await page.goto(pageTest.path);
      
      // Check title
      const title = await page.title();
      if (!title || title.length < 10) {
        reportIssue({
          severity: 'High',
          category: 'Content',
          page: pageTest.path,
          description: 'Page title too short or missing',
          recommendation: 'Add descriptive page titles (50-60 characters)'
        });
      }
      
      // Check meta description
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
      if (!metaDescription || metaDescription.length < 50) {
        reportIssue({
          severity: 'Medium',
          category: 'Content',
          page: pageTest.path,
          description: 'Meta description missing or too short',
          recommendation: 'Add meta descriptions (150-160 characters)'
        });
      }
      
      // Check h1
      const h1Count = await page.locator('h1').count();
      if (h1Count === 0) {
        reportIssue({
          severity: 'High',
          category: 'Content',
          page: pageTest.path,
          description: 'No H1 heading found',
          recommendation: 'Add one H1 heading per page'
        });
      } else if (h1Count > 1) {
        reportIssue({
          severity: 'Medium',
          category: 'Content',
          page: pageTest.path,
          description: `Multiple H1 headings found (${h1Count})`,
          recommendation: 'Use only one H1 per page'
        });
      }
    }
  });
});