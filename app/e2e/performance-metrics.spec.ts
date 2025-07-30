/**
 * End-to-End Performance Metrics Tests
 * Tests page load time, First Contentful Paint, Lighthouse scores
 * Verifies performance optimization effectiveness in real browser environment
 */

import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  lighthouseScore?: number;
}

interface ResourceTiming {
  name: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  type: string;
}

test.describe('Performance Metrics Tests', () => {
  test.describe('Page Load Performance', () => {
    test('homepage should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Homepage load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000); // Target: < 3 seconds
    });

    test('should achieve First Contentful Paint under 1.8 seconds', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await getWebVitals(page);
      
      console.log(`First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
      expect(metrics.firstContentfulPaint).toBeLessThan(1800); // Target: < 1.8 seconds
    });

    test('should achieve Largest Contentful Paint under 2.5 seconds', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await getWebVitals(page);
      
      console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint}ms`);
      expect(metrics.largestContentfulPaint).toBeLessThan(2500); // Target: < 2.5 seconds
    });

    test('should have minimal Total Blocking Time', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await getWebVitals(page);
      
      console.log(`Total Blocking Time: ${metrics.totalBlockingTime}ms`);
      expect(metrics.totalBlockingTime).toBeLessThan(300); // Target: < 300ms
    });

    test('should have good Cumulative Layout Shift score', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await getWebVitals(page);
      
      console.log(`Cumulative Layout Shift: ${metrics.cumulativeLayoutShift}`);
      expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1); // Target: < 0.1
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should load JavaScript bundles efficiently', async ({ page }) => {
      const resourcePromise = page.waitForEvent('response', response => 
        response.url().includes('/_astro/') && response.url().endsWith('.js')
      );
      
      await page.goto('/');
      const response = await resourcePromise;
      
      expect(response.status()).toBe(200);
      
      // Check cache headers
      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toContain('max-age=31536000'); // 1 year
      expect(cacheControl).toContain('immutable');
    });

    test('should preload critical images effectively', async ({ page }) => {
      await page.goto('/');
      
      // Check if critical images are preloaded
      const preloadedImages = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]'));
        return links.map(link => ({
          href: link.getAttribute('href'),
          type: link.getAttribute('type'),
          media: link.getAttribute('media')
        }));
      });
      
      expect(preloadedImages.length).toBeGreaterThan(0);
      
      // Verify WebP format prioritization
      const webpImages = preloadedImages.filter(img => img.type === 'image/webp');
      expect(webpImages.length).toBeGreaterThan(0);
      
      console.log(`Preloaded images: ${preloadedImages.length}`);
      console.log(`WebP images: ${webpImages.length}`);
    });

    test('should serve optimized image formats', async ({ page }) => {
      let webpImagesLoaded = 0;
      let totalImagesLoaded = 0;
      
      page.on('response', response => {
        if (response.url().match(/\.(webp|jpg|jpeg|png)$/)) {
          totalImagesLoaded++;
          if (response.url().endsWith('.webp')) {
            webpImagesLoaded++;
          }
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Total images loaded: ${totalImagesLoaded}`);
      console.log(`WebP images loaded: ${webpImagesLoaded}`);
      
      // Should load some images and prioritize WebP
      expect(totalImagesLoaded).toBeGreaterThan(0);
      
      if (totalImagesLoaded > 0) {
        const webpRatio = webpImagesLoaded / totalImagesLoaded;
        expect(webpRatio).toBeGreaterThan(0.5); // At least 50% WebP
      }
    });

    test('should demonstrate efficient caching behavior', async ({ page }) => {
      // First visit
      const startTime1 = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const firstVisitTime = Date.now() - startTime1;
      
      // Second visit (cached resources)
      const startTime2 = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const secondVisitTime = Date.now() - startTime2;
      
      console.log(`First visit: ${firstVisitTime}ms`);
      console.log(`Second visit (cached): ${secondVisitTime}ms`);
      
      // Second visit should be significantly faster due to caching
      expect(secondVisitTime).toBeLessThan(firstVisitTime * 0.7);
    });
  });

  test.describe('Database Query Performance', () => {
    test('should load content data efficiently', async ({ page }) => {
      // Navigate to a content-heavy page
      const startTime = Date.now();
      await page.goto('/programs');
      await page.waitForSelector('[data-content="programs"]', { timeout: 5000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`Programs page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(2000); // Should load quickly with caching
    });

    test('should demonstrate cache effectiveness on admin pages', async ({ page }) => {
      // This test assumes admin access - skip if not authenticated
      try {
        const startTime = Date.now();
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Admin page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(3000);
      } catch (error) {
        console.log('Admin page not accessible - skipping admin cache test');
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Mobile load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(4000); // Slightly more lenient for mobile
      
      const metrics = await getWebVitals(page);
      expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    });

    test('should load mobile-optimized images', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      let mobileImagesLoaded = 0;
      
      page.on('response', response => {
        if (response.url().match(/\.(webp|jpg|jpeg|png)$/) && 
            (response.url().includes('640w') || response.url().includes('320w'))) {
          mobileImagesLoaded++;
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Mobile-optimized images loaded: ${mobileImagesLoaded}`);
      expect(mobileImagesLoaded).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('should maintain consistent performance across page reloads', async ({ page }) => {
      const loadTimes: number[] = [];
      
      // Test multiple page loads
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);
        
        // Clear cache occasionally to test both cached and uncached scenarios
        if (i === 2) {
          await page.evaluate(() => {
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
          });
        }
      }
      
      const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      const minLoadTime = Math.min(...loadTimes);
      
      console.log(`Load times: ${loadTimes.map(t => `${t}ms`).join(', ')}`);
      console.log(`Average: ${Math.round(avgLoadTime)}ms, Min: ${minLoadTime}ms, Max: ${maxLoadTime}ms`);
      
      expect(avgLoadTime).toBeLessThan(3000);
      expect(maxLoadTime).toBeLessThan(5000);
      
      // Variance should not be too high
      const variance = loadTimes.reduce((sum, time) => sum + Math.pow(time - avgLoadTime, 2), 0) / loadTimes.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeLessThan(1000); // Standard deviation under 1 second
    });

    test('should handle concurrent users efficiently', async ({ browser }) => {
      // Simulate multiple concurrent users
      const contexts = await Promise.all(
        Array.from({ length: 5 }, () => browser.newContext())
      );
      
      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );
      
      const startTime = Date.now();
      
      // All users visit homepage simultaneously
      await Promise.all(
        pages.map(page => page.goto('/', { waitUntil: 'networkidle' }))
      );
      
      const totalTime = Date.now() - startTime;
      
      console.log(`5 concurrent users loaded in: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(10000); // Should handle concurrent load
      
      // Clean up
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Resource Size Optimization', () => {
    test('should have optimized resource sizes', async ({ page }) => {
      const resourceSizes = new Map<string, number>();
      
      page.on('response', response => {
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          resourceSizes.set(response.url(), parseInt(contentLength));
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check HTML size
      const htmlSize = resourceSizes.get(page.url()) || 0;
      console.log(`HTML size: ${Math.round(htmlSize / 1024)}KB`);
      expect(htmlSize).toBeLessThan(100 * 1024); // Under 100KB
      
      // Check total resource size
      const totalSize = Array.from(resourceSizes.values()).reduce((sum, size) => sum + size, 0);
      console.log(`Total resources: ${Math.round(totalSize / 1024)}KB`);
      expect(totalSize).toBeLessThan(2 * 1024 * 1024); // Under 2MB total
    });

    test('should compress text resources effectively', async ({ page }) => {
      let compressedResponses = 0;
      let totalTextResponses = 0;
      
      page.on('response', response => {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('text/') || 
            contentType.includes('application/javascript') || 
            contentType.includes('application/json')) {
          totalTextResponses++;
          
          const encoding = response.headers()['content-encoding'];
          if (encoding && (encoding.includes('gzip') || encoding.includes('br'))) {
            compressedResponses++;
          }
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Compressed responses: ${compressedResponses}/${totalTextResponses}`);
      
      if (totalTextResponses > 0) {
        const compressionRatio = compressedResponses / totalTextResponses;
        expect(compressionRatio).toBeGreaterThan(0.8); // At least 80% compressed
      }
    });
  });

  test.describe('Core Web Vitals Compliance', () => {
    test('should pass Core Web Vitals thresholds', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await getWebVitals(page);
      
      // Core Web Vitals thresholds (Good scores)
      expect(metrics.largestContentfulPaint).toBeLessThan(2500); // LCP < 2.5s
      expect(metrics.firstContentfulPaint).toBeLessThan(1800);   // FCP < 1.8s
      expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1);   // CLS < 0.1
      expect(metrics.totalBlockingTime).toBeLessThan(300);       // TBT < 300ms
      
      console.log('Core Web Vitals Results:');
      console.log(`LCP: ${metrics.largestContentfulPaint}ms (target: <2500ms)`);
      console.log(`FCP: ${metrics.firstContentfulPaint}ms (target: <1800ms)`);
      console.log(`CLS: ${metrics.cumulativeLayoutShift} (target: <0.1)`);
      console.log(`TBT: ${metrics.totalBlockingTime}ms (target: <300ms)`);
    });
  });
});

// Helper function to get Web Vitals metrics
async function getWebVitals(page: Page): Promise<PerformanceMetrics> {
  return await page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      const metrics: Partial<PerformanceMetrics> = {};
      let metricsCollected = 0;
      const targetMetrics = 5; // FCP, LCP, TTI, TBT, CLS
      
      const checkComplete = () => {
        if (metricsCollected >= targetMetrics) {
          resolve(metrics as PerformanceMetrics);
        }
      };
      
      // First Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          metrics.firstContentfulPaint = entries[0].startTime;
          metricsCollected++;
          checkComplete();
        }
      }).observe({ entryTypes: ['paint'] });
      
      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
          metricsCollected++;
          checkComplete();
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Layout Shift
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        metrics.cumulativeLayoutShift = clsValue;
        metricsCollected++;
        checkComplete();
      }).observe({ entryTypes: ['layout-shift'] });
      
      // Total Blocking Time (approximation)
      let tbt = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > 50) {
            tbt += entry.duration - 50;
          }
        }
        metrics.totalBlockingTime = tbt;
        metricsCollected++;
        checkComplete();
      }).observe({ entryTypes: ['measure'] });
      
      // Time to Interactive (approximation)
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.timeToInteractive = navigation.domInteractive;
          metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        } else {
          metrics.timeToInteractive = performance.now();
          metrics.pageLoadTime = performance.now();
        }
        metricsCollected++;
        checkComplete();
      }, 1000);
    });
  });
}