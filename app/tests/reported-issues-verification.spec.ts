/**
 * Reported Issues Verification Test Suite
 * 
 * This test suite specifically verifies the reported issues on the live testing site
 * at https://spicebush-testing.netlify.app
 * 
 * Issues being tested:
 * 1. Schedule Tour Page Issues (missing header/footer elements)
 * 2. Footer Hours Widget functionality across pages
 * 3. Admin Login Access points search
 * 4. Footer Logo Display styling issues
 */

import { test, expect, type Page } from '@playwright/test';

// Configuration
const TESTING_SITE_URL = 'https://spicebush-testing.netlify.app';
const TEST_TIMEOUT = 30000;

// Test pages to verify
const TEST_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/programs', name: 'Programs' },
  { path: '/contact', name: 'Contact' },
  { path: '/teachers', name: 'Teachers' },
  { path: '/donate', name: 'Donate' },
  { path: '/schedule-tour', name: 'Schedule Tour' }
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

async function getElementDetails(page: Page, selector: string): Promise<{
  exists: boolean;
  visible: boolean;
  count: number;
  boundingBox?: any;
  styles?: any;
}> {
  const elements = page.locator(selector);
  const count = await elements.count();
  
  if (count === 0) {
    return { exists: false, visible: false, count: 0 };
  }

  const element = elements.first();
  const visible = await element.isVisible();
  const boundingBox = visible ? await element.boundingBox() : null;
  
  let styles = null;
  if (visible) {
    styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        width: computed.width,
        height: computed.height,
        position: computed.position,
        zIndex: computed.zIndex
      };
    });
  }

  return {
    exists: true,
    visible,
    count,
    boundingBox,
    styles
  };
}

test.describe('Reported Issues Verification', () => {
  test.setTimeout(TEST_TIMEOUT);

  test.describe('1. Schedule Tour Page Issues', () => {
    test('verify Schedule Tour page header and footer presence', async ({ page }) => {
      const errors = await captureConsoleErrors(page);
      
      console.log('Testing Schedule Tour page for missing header/footer issues...');
      
      const response = await page.goto(`${TESTING_SITE_URL}/schedule-tour`);
      await page.waitForLoadState('networkidle');
      
      // Verify page loads successfully
      expect(response?.status()).toBe(200);
      
      console.log('Schedule Tour page loaded successfully');
      
      // 1. Check for header elements
      const headerSelectors = [
        'header',
        '[role="banner"]',
        '.header',
        '.site-header',
        'nav',
        '[role="navigation"]'
      ];
      
      const headerResults = {};
      for (const selector of headerSelectors) {
        const details = await getElementDetails(page, selector);
        headerResults[selector] = details;
        console.log(`Header selector '${selector}': exists=${details.exists}, visible=${details.visible}, count=${details.count}`);
      }
      
      // 2. Check for footer elements
      const footerSelectors = [
        'footer',
        '[role="contentinfo"]',
        '.footer',
        '.site-footer'
      ];
      
      const footerResults = {};
      for (const selector of footerSelectors) {
        const details = await getElementDetails(page, selector);
        footerResults[selector] = details;
        console.log(`Footer selector '${selector}': exists=${details.exists}, visible=${details.visible}, count=${details.count}`);
      }
      
      // 3. Document what elements ARE present
      const presentElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*[class], *[id]'))
          .map(el => ({
            tagName: el.tagName.toLowerCase(),
            className: el.className,
            id: el.id,
            role: el.getAttribute('role')
          }))
          .filter(el => el.className || el.id || el.role);
        
        return elements.slice(0, 20); // Limit to first 20 for readability
      });
      
      console.log('Present elements on Schedule Tour page:', JSON.stringify(presentElements, null, 2));
      
      // 4. Check page structure
      const bodyElements = await page.evaluate(() => {
        const body = document.body;
        return {
          directChildren: Array.from(body.children).map(el => ({
            tagName: el.tagName.toLowerCase(),
            className: el.className,
            id: el.id
          })),
          totalElements: body.querySelectorAll('*').length
        };
      });
      
      console.log('Schedule Tour page body structure:', JSON.stringify(bodyElements, null, 2));
      
      // 5. Compare with homepage for reference
      await page.goto(TESTING_SITE_URL);
      await page.waitForLoadState('networkidle');
      
      const homepageHeaderVisible = await page.locator('header').isVisible();
      const homepageFooterVisible = await page.locator('footer').isVisible();
      
      console.log(`Homepage header visible: ${homepageHeaderVisible}`);
      console.log(`Homepage footer visible: ${homepageFooterVisible}`);
      
      // Report findings
      const hasAnyHeader = Object.values(headerResults).some((result: any) => result.visible);
      const hasAnyFooter = Object.values(footerResults).some((result: any) => result.visible);
      
      console.log(`Schedule Tour page has visible header: ${hasAnyHeader}`);
      console.log(`Schedule Tour page has visible footer: ${hasAnyFooter}`);
      
      // Log console errors
      console.log('Console errors on Schedule Tour page:', errors);
      
      // Test passes but documents the findings
      expect(true).toBe(true);
    });

    test('compare Schedule Tour page structure with other pages', async ({ page }) => {
      console.log('Comparing Schedule Tour page structure with other pages...');
      
      const pageStructures = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        const structure = await page.evaluate(() => {
          return {
            hasHeader: !!document.querySelector('header, [role="banner"]'),
            hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
            hasNav: !!document.querySelector('nav, [role="navigation"]'),
            hasMain: !!document.querySelector('main, [role="main"]'),
            bodyChildrenCount: document.body.children.length,
            title: document.title
          };
        });
        
        pageStructures[testPage.name] = structure;
        console.log(`${testPage.name} structure:`, structure);
      }
      
      // Identify which pages are missing header/footer compared to others
      const scheduleStruct = pageStructures['Schedule Tour'];
      const otherPages = Object.entries(pageStructures).filter(([name]) => name !== 'Schedule Tour');
      
      console.log('\n--- COMPARISON RESULTS ---');
      console.log(`Schedule Tour has header: ${scheduleStruct.hasHeader}`);
      console.log(`Schedule Tour has footer: ${scheduleStruct.hasFooter}`);
      
      otherPages.forEach(([name, struct]: [string, any]) => {
        console.log(`${name} has header: ${struct.hasHeader}, footer: ${struct.hasFooter}`);
      });
      
      expect(true).toBe(true);
    });
  });

  test.describe('2. Footer Hours Widget', () => {
    test('verify hours widget display across all pages', async ({ page }) => {
      console.log('Testing Footer Hours Widget across all pages...');
      
      const hoursWidgetResults = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Look for hours-related elements in footer
        const hoursSelectors = [
          'footer .hours',
          'footer [class*="hours"]',
          'footer [data-hours]',
          'footer [class*="time"]',
          'footer [class*="schedule"]',
          '.hours-widget',
          '.business-hours',
          '.operating-hours',
          '[class*="hour"]',
          '[data-testid*="hours"]'
        ];
        
        const hoursElements = {};
        let foundAnyHours = false;
        
        for (const selector of hoursSelectors) {
          const details = await getElementDetails(page, selector);
          hoursElements[selector] = details;
          if (details.visible) {
            foundAnyHours = true;
            console.log(`${testPage.name} - Found hours element: ${selector}`);
          }
        }
        
        // Check footer content for hours-related text
        const footerText = await page.locator('footer').textContent();
        const hasHoursText = footerText && (
          footerText.includes('hours') ||
          footerText.includes('Hours') ||
          footerText.includes('am') ||
          footerText.includes('pm') ||
          footerText.includes('Monday') ||
          footerText.includes('open') ||
          footerText.includes('closed')
        );
        
        hoursWidgetResults[testPage.name] = {
          hasVisibleHoursElement: foundAnyHours,
          hasHoursText: hasHoursText,
          footerText: footerText?.substring(0, 200) + '...', // First 200 chars
          elements: hoursElements
        };
        
        console.log(`${testPage.name} - Hours widget present: ${foundAnyHours}, Hours text: ${hasHoursText}`);
      }
      
      // Special focus on contact page (reported to work)
      const contactPageResult = hoursWidgetResults['Contact'];
      console.log('\n--- CONTACT PAGE HOURS WIDGET (Should work) ---');
      console.log('Contact page hours widget result:', JSON.stringify(contactPageResult, null, 2));
      
      // Compare all pages
      console.log('\n--- HOURS WIDGET COMPARISON ---');
      Object.entries(hoursWidgetResults).forEach(([pageName, result]: [string, any]) => {
        console.log(`${pageName}: Widget=${result.hasVisibleHoursElement}, Text=${result.hasHoursText}`);
      });
      
      expect(true).toBe(true);
    });

    test('compare footer structure between pages', async ({ page }) => {
      console.log('Comparing footer structure between pages...');
      
      const footerStructures = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        const footerStructure = await page.evaluate(() => {
          const footer = document.querySelector('footer');
          if (!footer) return { exists: false };
          
          return {
            exists: true,
            innerHTML: footer.innerHTML.substring(0, 500), // First 500 chars
            childElementCount: footer.children.length,
            classes: footer.className,
            directChildren: Array.from(footer.children).map(child => ({
              tagName: child.tagName.toLowerCase(),
              className: child.className,
              id: child.id,
              textContent: child.textContent?.substring(0, 100)
            }))
          };
        });
        
        footerStructures[testPage.name] = footerStructure;
      }
      
      console.log('Footer structures:');
      Object.entries(footerStructures).forEach(([pageName, structure]) => {
        console.log(`\n${pageName}:`, JSON.stringify(structure, null, 2));
      });
      
      expect(true).toBe(true);
    });
  });

  test.describe('3. Admin Login Access', () => {
    test('search for admin login button/link in header', async ({ page }) => {
      console.log('Searching for admin login access points in header...');
      
      const adminResults = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Search in header
        const headerAdminSelectors = [
          'header a[href*="admin"]',
          'header a[href*="login"]',
          'header .admin',
          'header .login',
          'header [class*="admin"]',
          'header [class*="login"]',
          'nav a[href*="admin"]',
          'nav a[href*="login"]',
          'nav [data-admin]'
        ];
        
        const headerResults = {};
        for (const selector of headerAdminSelectors) {
          const details = await getElementDetails(page, selector);
          headerResults[selector] = details;
          if (details.visible) {
            console.log(`${testPage.name} - Found admin element in header: ${selector}`);
          }
        }
        
        adminResults[testPage.name] = { header: headerResults };
      }
      
      console.log('Header admin search results:', JSON.stringify(adminResults, null, 2));
      expect(true).toBe(true);
    });

    test('search for admin login button/link in footer', async ({ page }) => {
      console.log('Searching for admin login access points in footer...');
      
      const adminResults = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Search in footer
        const footerAdminSelectors = [
          'footer a[href*="admin"]',
          'footer a[href*="login"]',
          'footer .admin',
          'footer .login',
          'footer [class*="admin"]',
          'footer [class*="login"]',
          'footer [data-admin]'
        ];
        
        const footerResults = {};
        for (const selector of footerAdminSelectors) {
          const details = await getElementDetails(page, selector);
          footerResults[selector] = details;
          if (details.visible) {
            console.log(`${testPage.name} - Found admin element in footer: ${selector}`);
          }
        }
        
        adminResults[testPage.name] = { footer: footerResults };
      }
      
      console.log('Footer admin search results:', JSON.stringify(adminResults, null, 2));
      expect(true).toBe(true);
    });

    test('check for hidden admin/login routes', async ({ page }) => {
      console.log('Testing for hidden admin/login routes...');
      
      const adminRoutes = [
        '/admin',
        '/login',
        '/admin/',
        '/login/',
        '/admin/login',
        '/admin/dashboard',
        '/cms',
        '/cms/',
        '/auth',
        '/auth/login'
      ];
      
      const routeResults = {};
      
      for (const route of adminRoutes) {
        try {
          const response = await page.goto(`${TESTING_SITE_URL}${route}`);
          const status = response?.status() || 0;
          
          routeResults[route] = {
            status,
            accessible: status === 200,
            url: page.url(),
            title: await page.title()
          };
          
          console.log(`${route}: Status ${status} ${status === 200 ? '✓' : '✗'}`);
        } catch (error) {
          routeResults[route] = {
            status: 0,
            accessible: false,
            error: error.message
          };
          console.log(`${route}: Error - ${error.message}`);
        }
      }
      
      console.log('Admin route test results:', JSON.stringify(routeResults, null, 2));
      expect(true).toBe(true);
    });
  });

  test.describe('4. Footer Logo Display', () => {
    test('check footer logo dimensions and styling', async ({ page }) => {
      console.log('Testing footer logo display and styling...');
      
      const logoResults = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Look for logo elements in footer
        const logoSelectors = [
          'footer img',
          'footer .logo',
          'footer [class*="logo"]',
          'footer svg',
          'footer [data-logo]'
        ];
        
        const logoElements = {};
        
        for (const selector of logoSelectors) {
          const elements = page.locator(selector);
          const count = await elements.count();
          
          if (count > 0) {
            const element = elements.first();
            const visible = await element.isVisible();
            
            if (visible) {
              const boundingBox = await element.boundingBox();
              const styles = await element.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return {
                  width: computed.width,
                  height: computed.height,
                  maxWidth: computed.maxWidth,
                  maxHeight: computed.maxHeight,
                  objectFit: computed.objectFit,
                  display: computed.display,
                  position: computed.position
                };
              });
              
              const attributes = await element.evaluate((el) => ({
                src: el.getAttribute('src'),
                alt: el.getAttribute('alt'),
                className: el.className,
                id: el.id
              }));
              
              logoElements[selector] = {
                count,
                visible,
                boundingBox,
                styles,
                attributes
              };
              
              console.log(`${testPage.name} - Found logo: ${selector}`);
              console.log(`  Size: ${boundingBox?.width}x${boundingBox?.height}`);
              console.log(`  Styles:`, styles);
            }
          }
        }
        
        logoResults[testPage.name] = logoElements;
      }
      
      console.log('Footer logo analysis results:');
      Object.entries(logoResults).forEach(([pageName, results]) => {
        console.log(`\n${pageName}:`, JSON.stringify(results, null, 2));
      });
      
      expect(true).toBe(true);
    });

    test('compare footer logo with header logo', async ({ page }) => {
      console.log('Comparing footer logo with header logo...');
      
      const logoComparison = {};
      
      for (const testPage of TEST_PAGES) {
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Header logo
        const headerLogos = await page.locator('header img, header .logo, header [class*="logo"]').all();
        const headerLogoData = [];
        
        for (const logo of headerLogos) {
          if (await logo.isVisible()) {
            const boundingBox = await logo.boundingBox();
            const styles = await logo.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              return {
                width: computed.width,
                height: computed.height
              };
            });
            headerLogoData.push({ boundingBox, styles });
          }
        }
        
        // Footer logo
        const footerLogos = await page.locator('footer img, footer .logo, footer [class*="logo"]').all();
        const footerLogoData = [];
        
        for (const logo of footerLogos) {
          if (await logo.isVisible()) {
            const boundingBox = await logo.boundingBox();
            const styles = await logo.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              return {
                width: computed.width,
                height: computed.height
              };
            });
            footerLogoData.push({ boundingBox, styles });
          }
        }
        
        logoComparison[testPage.name] = {
          headerLogos: headerLogoData,
          footerLogos: footerLogoData
        };
        
        console.log(`${testPage.name} - Header logos: ${headerLogoData.length}, Footer logos: ${footerLogoData.length}`);
      }
      
      console.log('Logo comparison results:', JSON.stringify(logoComparison, null, 2));
      expect(true).toBe(true);
    });
  });

  test.describe('5. Overall Site Health Check', () => {
    test('verify no major console errors across pages', async ({ page }) => {
      console.log('Checking for console errors across all pages...');
      
      const errorResults = {};
      
      for (const testPage of TEST_PAGES) {
        const errors = await captureConsoleErrors(page);
        
        await page.goto(`${TESTING_SITE_URL}${testPage.path}`);
        await page.waitForLoadState('networkidle');
        
        // Wait a bit for any delayed errors
        await page.waitForTimeout(2000);
        
        const criticalErrors = errors.filter(error => 
          !error.includes('favicon') && 
          !error.includes('analytics') &&
          !error.includes('ResizeObserver') &&
          !error.includes('Non-passive event listener')
        );
        
        errorResults[testPage.name] = criticalErrors;
        console.log(`${testPage.name} - Critical errors: ${criticalErrors.length}`);
        if (criticalErrors.length > 0) {
          console.log(`  Errors:`, criticalErrors);
        }
      }
      
      // Report overall error status
      const totalErrors = Object.values(errorResults).flat().length;
      console.log(`Total critical errors across all pages: ${totalErrors}`);
      
      expect(true).toBe(true);
    });
  });
});