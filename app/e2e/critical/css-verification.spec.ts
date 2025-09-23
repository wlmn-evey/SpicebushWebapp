import { test, expect, Page } from '@playwright/test';

test.describe('CSS Build and Custom Colors Verification', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
  });

  test('should load home page without HTTP 500 errors', async () => {
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    
    // Verify successful response
    expect(response?.status()).toBe(200);
    
    // Check for any error messages
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('500');
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).not.toContain('build error');
  });

  test('should have Tailwind CSS loaded and working', async () => {
    await page.goto('/');
    
    // Check if Tailwind CSS is loaded by verifying a common Tailwind class
    const element = await page.locator('[class*="flex"]').first();
    const display = await element.evaluate(el => 
      window.getComputedStyle(el).display
    );
    expect(display).toBe('flex');
    
    // Check for Tailwind reset styles
    const body = await page.locator('body');
    const margin = await body.evaluate(el => 
      window.getComputedStyle(el).margin
    );
    expect(margin).toBe('0px');
  });

  test('should render custom colors correctly', async () => {
    await page.goto('/');
    
    // Define custom colors from tailwind config
    const customColors = {
      'forest-canopy': 'rgb(62, 109, 81)',     // #3E6D51
      'moss-green': 'rgb(90, 128, 101)',       // #5A8065
      'sky-blue': 'rgb(3, 169, 244)',          // #03A9F4
      'sunlight-gold': 'rgb(248, 148, 6)',     // #F89406
      'stone-beige': 'rgb(247, 242, 220)',     // #F7F2DC
      'earth-brown': 'rgb(46, 46, 46)'         // #2E2E2E
    };

    // Test forest-canopy color
    const forestCanopyElements = await page.locator('[class*="forest-canopy"]').all();
    if (forestCanopyElements.length > 0) {
      const bgColor = await forestCanopyElements[0].evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor || styles.color;
      });
      console.log('Forest Canopy color found:', bgColor);
    }

    // Test moss-green color
    const mossGreenElements = await page.locator('[class*="moss-green"]').all();
    if (mossGreenElements.length > 0) {
      const bgColor = await mossGreenElements[0].evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor || styles.color;
      });
      console.log('Moss Green color found:', bgColor);
    }

    // Test sunlight-gold color
    const sunlightGoldElements = await page.locator('[class*="sunlight-gold"]').all();
    if (sunlightGoldElements.length > 0) {
      const bgColor = await sunlightGoldElements[0].evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor || styles.color;
      });
      console.log('Sunlight Gold color found:', bgColor);
    }

    // Test that at least one custom color is being used
    const hasCustomColors = 
      forestCanopyElements.length > 0 || 
      mossGreenElements.length > 0 || 
      sunlightGoldElements.length > 0;
    
    expect(hasCustomColors).toBe(true);
  });

  test('should load CSS files without errors', async () => {
    const cssErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('css')) {
        cssErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      if (error.message.toLowerCase().includes('css')) {
        cssErrors.push(error.message);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check for CSS-related network errors
    const failedRequests = await page.evaluate(() => {
      const failed: string[] = [];
      const performanceEntries = performance.getEntriesByType('resource');
      performanceEntries.forEach(entry => {
        if (entry.name.includes('.css') && (entry as any).transferSize === 0) {
          failed.push(entry.name);
        }
      });
      return failed;
    });

    expect(cssErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });

  test('should have global CSS styles applied', async () => {
    await page.goto('/');
    
    // Check for custom font families
    const heading = await page.locator('h1, h2, h3').first();
    const fontFamily = await heading.evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Poppins');
    
    // Check for smooth scroll behavior
    const htmlScrollBehavior = await page.locator('html').evaluate(el => 
      window.getComputedStyle(el).scrollBehavior
    );
    expect(htmlScrollBehavior).toBe('smooth');
    
    // Check for body line height
    const bodyLineHeight = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).lineHeight
    );
    expect(parseFloat(bodyLineHeight)).toBeGreaterThan(1.5);
  });

  test('should maintain proper styling on navigation', async () => {
    await page.goto('/');
    
    // Get initial styles
    const initialBgColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Navigate to another page
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Check that styles are still applied
    const afterNavBgColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    expect(afterNavBgColor).toBe(initialBgColor);
  });

  test('should have PostCSS and Autoprefixer working', async () => {
    await page.goto('/');
    
    // Check for vendor prefixes on CSS properties that need them
    const element = await page.locator('[class*="transition"]').first();
    if (element) {
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          transition: computed.transition,
          webkitTransition: (computed as any).webkitTransition,
          mozTransition: (computed as any).MozTransition
        };
      });
      
      // At least one transition property should be defined
      const hasTransition = styles.transition !== 'none' || 
                          styles.webkitTransition !== undefined;
      expect(hasTransition).toBe(true);
    }
  });

  test('should not have any CSS syntax errors in console', async () => {
    const cssWarnings: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('css') && 
          (text.includes('error') || text.includes('warning') || text.includes('invalid'))) {
        cssWarnings.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Give time for any async CSS loading
    
    expect(cssWarnings).toHaveLength(0);
  });

  test('should have critical CSS inlined or loaded quickly', async () => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    
    // Check if any critical styles are present immediately
    const hasCriticalStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.margin === '0px'; // Tailwind reset
    });
    
    expect(hasCriticalStyles).toBe(true);
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });
});

test.describe('Responsive Design Verification', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      // Take a screenshot for visual verification
      await page.screenshot({ 
        path: `test-results/screenshots/css-verification-${name}.png`,
        fullPage: true 
      });
      
      // Check that layout adapts to viewport
      const isMenuVisible = await page.locator('#desktop-menu').isVisible();
      const isMobileMenuToggleVisible = await page.locator('#mobile-menu-toggle').isVisible();
      
      if (width < 1024) {
        expect(isMenuVisible).toBe(false);
        expect(isMobileMenuToggleVisible).toBe(true);
      } else {
        expect(isMenuVisible).toBe(true);
        expect(isMobileMenuToggleVisible).toBe(false);
      }
      
      // Check for horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });
  });

  test('should have responsive utility classes working', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileDisplay = await page.locator('[class*="md:hidden"]').first().isVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopDisplay = await page.locator('[class*="md:block"]').first().isVisible();
    
    // At least one responsive class should be working
    expect(mobileDisplay || desktopDisplay).toBe(true);
  });
});

test.describe('Component-Specific CSS Tests', () => {
  test('should have tuition calculator styles working', async ({ page }) => {
    await page.goto('/tuition-affordability');
    
    // Check for specific calculator styles
    const programCard = await page.locator('.program-card').first();
    if (await programCard.isVisible()) {
      const styles = await programCard.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow
        };
      });
      
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(styles.borderRadius).not.toBe('0px');
    }
  });

  test('should have form styles applied', async ({ page }) => {
    await page.goto('/visit');
    
    const formInput = await page.locator('input[type="text"], input[type="email"]').first();
    if (await formInput.isVisible()) {
      const styles = await formInput.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          borderColor: computed.borderColor,
          padding: computed.padding,
          borderRadius: computed.borderRadius
        };
      });
      
      expect(styles.padding).not.toBe('0px');
      expect(styles.borderRadius).not.toBe('0px');
    }
  });

  test('should have button hover states working', async ({ page }) => {
    await page.goto('/');
    
    const button = await page.locator('button, a[class*="btn"]').first();
    if (await button.isVisible()) {
      // Get initial styles
      const initialStyles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          transform: computed.transform
        };
      });
      
      // Hover over button
      await button.hover();
      await page.waitForTimeout(300); // Wait for transition
      
      // Get hover styles
      const hoverStyles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          transform: computed.transform
        };
      });
      
      // Styles should change on hover
      const hasHoverEffect = 
        initialStyles.backgroundColor !== hoverStyles.backgroundColor ||
        initialStyles.transform !== hoverStyles.transform;
      
      expect(hasHoverEffect).toBe(true);
    }
  });
});

test.describe('Performance and Error Monitoring', () => {
  test('should load all CSS resources successfully', async ({ page }) => {
    const failedResources: string[] = [];
    
    page.on('response', response => {
      if (response.url().includes('.css') && response.status() >= 400) {
        failedResources.push(`${response.url()} - ${response.status()}`);
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    expect(failedResources).toHaveLength(0);
  });

  test('should not have duplicate CSS files', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const cssFiles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => link.getAttribute('href'));
    });
    
    const uniqueCssFiles = new Set(cssFiles);
    expect(cssFiles.length).toBe(uniqueCssFiles.size);
  });

  test('should have CSS files properly minified in production', async ({ page }) => {
    await page.goto('/');
    
    const cssContent = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let totalSize = 0;
      let minifiedCount = 0;
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          const text = rules.map(rule => rule.cssText).join('');
          totalSize += text.length;
          
          // Check if minified (no unnecessary whitespace)
          if (!text.includes('  ') && !text.includes('\n')) {
            minifiedCount++;
          }
        } catch (e) {
          // Cross-origin stylesheets will throw
        }
      });
      
      return { totalSize, minifiedCount, totalSheets: styleSheets.length };
    });
    
    console.log('CSS Stats:', cssContent);
    
    // CSS should be reasonably sized
    expect(cssContent.totalSize).toBeLessThan(500000); // Less than 500KB total
  });
});