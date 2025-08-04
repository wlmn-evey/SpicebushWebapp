import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { performance } from 'perf_hooks';

/**
 * Integration tests for Bug #048 performance fix
 * These tests verify that pages load in reasonable time and no collection errors occur
 */
describe('Bug #048: Page Load Performance Integration Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || 'http://localhost:4321';
  
  // Performance thresholds
  const ACCEPTABLE_LOAD_TIME = 5000; // 5 seconds (was 25+ seconds before fix)
  const FAST_LOAD_TIME = 2000; // 2 seconds target
  
  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  describe('Homepage Performance', () => {
    it('should load within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await page.goto(baseUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(response?.status()).toBe(200);
      expect(loadTime).toBeLessThan(ACCEPTABLE_LOAD_TIME);
      
      // Log performance for debugging
      console.log(`Homepage load time: ${loadTime.toFixed(2)}ms`);
    });
    
    it('should not have collection-related errors in console', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Check for specific error patterns that indicated Bug #048
      const collectionErrors = consoleErrors.filter(error => 
        error.includes('collection does not exist') ||
        error.includes("relation \"public.photos\" does not exist") ||
        error.includes("relation \"public.coming-soon\" does not exist")
      );
      
      expect(collectionErrors).toHaveLength(0);
    });
  });
  
  describe('Admin Pages Performance', () => {
    it('should load admin dashboard quickly', async () => {
      const startTime = performance.now();
      
      const response = await page.goto(`${baseUrl}/admin`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(response?.status()).toBe(200);
      expect(loadTime).toBeLessThan(ACCEPTABLE_LOAD_TIME);
      
      console.log(`Admin dashboard load time: ${loadTime.toFixed(2)}ms`);
    });
    
    it('should handle photo collection without errors', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
      
      // Wait for photo stats to potentially load
      await page.waitForTimeout(1000);
      
      // Check that no photo collection errors occurred
      const photoErrors = consoleErrors.filter(error => 
        error.includes('photos') && 
        (error.includes('collection does not exist') || error.includes('relation'))
      );
      
      expect(photoErrors).toHaveLength(0);
    });
  });
  
  describe('Content Pages Performance', () => {
    const contentPages = [
      '/programs',
      '/about',
      '/contact',
      '/blog'
    ];
    
    contentPages.forEach(pagePath => {
      it(`should load ${pagePath} quickly without errors`, async () => {
        const startTime = performance.now();
        const consoleErrors: string[] = [];
        
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        const response = await page.goto(`${baseUrl}${pagePath}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Verify successful load
        expect(response?.status()).toBe(200);
        
        // Verify performance
        expect(loadTime).toBeLessThan(ACCEPTABLE_LOAD_TIME);
        
        // Verify no collection errors
        const collectionErrors = consoleErrors.filter(error => 
          error.includes('collection does not exist') ||
          error.includes('relation') && error.includes('does not exist')
        );
        expect(collectionErrors).toHaveLength(0);
        
        console.log(`${pagePath} load time: ${loadTime.toFixed(2)}ms`);
      });
    });
  });
  
  describe('Network Analysis', () => {
    it('should not make excessive database requests', async () => {
      const requests: string[] = [];
      
      // Track network requests
      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/') || url.includes('supabase')) {
          requests.push(url);
        }
      });
      
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Count database-related requests
      const dbRequests = requests.filter(url => 
        url.includes('/rest/v1/') || 
        url.includes('/storage/v1/')
      );
      
      // Should have reasonable number of requests (not hundreds)
      expect(dbRequests.length).toBeLessThan(50);
      
      console.log(`Total API requests: ${requests.length}`);
      console.log(`Database requests: ${dbRequests.length}`);
    });
  });
  
  describe('Performance Metrics', () => {
    it('should have good Core Web Vitals', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          // Time to First Byte
          ttfb: navigation.responseStart - navigation.requestStart,
          // DOM Content Loaded
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          // Load Complete
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          // Total duration
          totalDuration: navigation.loadEventEnd - navigation.fetchStart
        };
      });
      
      // Verify good performance metrics
      expect(metrics.ttfb).toBeLessThan(800); // TTFB under 800ms
      expect(metrics.domContentLoaded).toBeLessThan(1500); // DOM ready under 1.5s
      expect(metrics.totalDuration).toBeLessThan(ACCEPTABLE_LOAD_TIME);
      
      console.log('Performance Metrics:', metrics);
    });
  });
});