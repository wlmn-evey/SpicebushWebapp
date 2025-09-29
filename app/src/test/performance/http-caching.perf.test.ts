/**
 * HTTP Caching Headers Performance Tests
 * Verifies caching headers for static assets, images, and HTML pages
 * Tests middleware implementation and cache behavior
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock Astro middleware context
const createMockContext = (pathname: string, contentType?: string) => ({
  url: new URL(`http://localhost:3000${pathname}`),
  cookies: {
    get: vi.fn().mockReturnValue(undefined)
  },
  redirect: vi.fn()
});

const createMockResponse = (contentType?: string) => ({
  status: 200,
  statusText: 'OK',
  headers: new Headers(contentType ? { 'content-type': contentType } : {}),
  body: 'mock body'
});

const createMockNext = (response: any) => vi.fn().mockResolvedValue(response);

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { value: false },
            error: null
          })
        })
      })
    })
  })
}));

// Import middleware after mocking
import { onRequest } from '../../middleware';

describe('HTTP Caching Headers Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {
          PUBLIC_SUPABASE_URL: 'http://localhost:54321',
          PUBLIC_SUPABASE_ANON_KEY: 'test-key'
        }
      }
    });
  });

  describe('Static Assets Caching', () => {
    test('should apply aggressive caching to _astro assets (1 year, immutable)', async () => {
      const context = createMockContext('/_astro/main.123abc.js');
      const response = createMockResponse('application/javascript');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should cache CSS assets with long-term caching', async () => {
      const context = createMockContext('/_astro/styles.456def.css');
      const response = createMockResponse('text/css');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should cache JavaScript bundles with immutable directive', async () => {
      const context = createMockContext('/_astro/vendor.789ghi.js');
      const response = createMockResponse('application/javascript');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toContain('immutable');
      expect(headers.get('Cache-Control')).toContain('max-age=31536000'); // 1 year
    });
  });

  describe('Image Assets Caching', () => {
    test('should apply moderate caching to WebP images (1 month)', async () => {
      const context = createMockContext('/images/test.webp');
      const response = createMockResponse('image/webp');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should cache JPEG images appropriately', async () => {
      const context = createMockContext('/images/homepage/hero.jpg');
      const response = createMockResponse('image/jpeg');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should cache PNG images with same policy', async () => {
      const context = createMockContext('/images/logo.png');
      const response = createMockResponse('image/png');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
    });

    test('should cache SVG images appropriately', async () => {
      const context = createMockContext('/favicon.svg');
      const response = createMockResponse('image/svg+xml');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
    });
  });

  describe('Font Assets Caching', () => {
    test('should cache WOFF2 fonts with long-term caching', async () => {
      const context = createMockContext('/fonts/Inter.woff2');
      const response = createMockResponse('font/woff2');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should cache WOFF fonts appropriately', async () => {
      const context = createMockContext('/fonts/Inter.woff');
      const response = createMockResponse('font/woff');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=2592000'); // 30 days
    });
  });

  describe('HTML Pages Caching', () => {
    test('should apply short cache with revalidation to HTML pages', async () => {
      const context = createMockContext('/');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=3600');
    });

    test('should apply security headers to HTML pages', async () => {
      const context = createMockContext('/about');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      expect(headers.get('X-Frame-Options')).toBe('DENY');
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    test('should add preload hints for homepage', async () => {
      const context = createMockContext('/');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      const linkHeader = headers.get('Link');
      expect(linkHeader).toBeDefined();
      expect(linkHeader).toContain('rel=preload');
      expect(linkHeader).toContain('as=image');
      expect(linkHeader).toContain('type=image/webp');
      expect(linkHeader).toContain('homepage-montessori-children-autumn-hero');
      expect(linkHeader).toContain('rel=preconnect');
      expect(linkHeader).toContain('fonts.googleapis.com');
      expect(linkHeader).toContain('fonts.gstatic.com');
    });

    test('should not add preload hints for non-homepage HTML pages', async () => {
      const context = createMockContext('/about');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const headers = result.headers;

      const linkHeader = headers.get('Link');
      expect(linkHeader).toBeNull();
    });
  });

  describe('Cache Control Directives Validation', () => {
    test('should verify cache-control directive format for static assets', async () => {
      const context = createMockContext('/_astro/bundle.js');
      const response = createMockResponse('application/javascript');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const cacheControl = result.headers.get('Cache-Control');

      expect(cacheControl).toMatch(/^public, max-age=\d+, immutable$/);
      
      const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1];
      expect(parseInt(maxAge || '0')).toBe(31536000); // 1 year in seconds
    });

    test('should verify stale-while-revalidate directive for HTML', async () => {
      const context = createMockContext('/programs');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      const cacheControl = result.headers.get('Cache-Control');

      expect(cacheControl).toMatch(/stale-while-revalidate=\d+/);
      
      const swr = cacheControl?.match(/stale-while-revalidate=(\d+)/)?.[1];
      expect(parseInt(swr || '0')).toBe(3600); // 1 hour
      
      const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1];
      expect(parseInt(maxAge || '0')).toBe(300); // 5 minutes
    });
  });

  describe('Cache Performance Scenarios', () => {
    test('should handle different asset types with appropriate caching', async () => {
      const testCases = [
        { path: '/_astro/main.js', expected: 'public, max-age=31536000, immutable' },
        { path: '/images/hero.webp', expected: 'public, max-age=2592000' },
        { path: '/fonts/Inter.woff2', expected: 'public, max-age=2592000' },
        { path: '/', expected: 'public, max-age=300, stale-while-revalidate=3600' }
      ];

      for (const testCase of testCases) {
        const context = createMockContext(testCase.path);
        const contentType = getContentType(testCase.path);
        const response = createMockResponse(contentType);
        const next = createMockNext(response);

        const result = await onRequest(context, next);
        expect(result.headers.get('Cache-Control')).toBe(testCase.expected);
      }
    });

    test('should verify security headers are consistently applied', async () => {
      const securityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'X-XSS-Protection'
      ];

      const context = createMockContext('/contact');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);

      securityHeaders.forEach(header => {
        expect(result.headers.get(header)).toBeDefined();
        expect(result.headers.get(header)).not.toBe('');
      });
    });
  });

  describe('Cache Bypass Scenarios', () => {
    test('should not interfere with API endpoints', async () => {
      const context = createMockContext('/api/contact');
      const response = createMockResponse('application/json');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      
      // API endpoints should not get static asset caching
      expect(result.headers.get('Cache-Control')).not.toBe('public, max-age=31536000, immutable');
    });

    test('should handle admin routes without static caching', async () => {
      const context = createMockContext('/admin/settings');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      
      // Admin pages should get HTML caching, not static asset caching
      expect(result.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=3600');
    });
  });

  describe('Performance Impact Verification', () => {
    test('should apply caching headers efficiently without performance overhead', async () => {
      const context = createMockContext('/');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const startTime = performance.now();
      await onRequest(context, next);
      const endTime = performance.now();

      // Middleware should execute quickly (under 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });

    test('should handle multiple concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => {
        const context = createMockContext(`/page-${i}`);
        const response = createMockResponse('text/html');
        const next = createMockNext(response);
        return onRequest(context, next);
      });

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      // All requests should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
      
      // All should have proper caching headers
      results.forEach(result => {
        expect(result.headers.get('Cache-Control')).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing content-type gracefully', async () => {
      const context = createMockContext('/unknown-file');
      const response = createMockResponse(); // No content-type
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      
      // Should not crash and should preserve original response
      expect(result.status).toBe(200);
      expect(result.headers).toBeDefined();
    });

    test('should handle malformed URLs gracefully', async () => {
      const context = createMockContext('/path/with spaces/file.html');
      const response = createMockResponse('text/html');
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      
      // Should still apply HTML caching rules
      expect(result.headers.get('Cache-Control')).toBeDefined();
    });

    test('should preserve existing headers while adding cache headers', async () => {
      const context = createMockContext('/_astro/main.js');
      const existingHeaders = new Headers({
        'custom-header': 'custom-value',
        'x-existing': 'existing-value'
      });
      const response = {
        status: 200,
        statusText: 'OK',
        headers: existingHeaders,
        body: 'mock body'
      };
      const next = createMockNext(response);

      const result = await onRequest(context, next);
      
      // Should preserve existing headers
      expect(result.headers.get('custom-header')).toBe('custom-value');
      expect(result.headers.get('x-existing')).toBe('existing-value');
      
      // Should add cache headers
      expect(result.headers.get('Cache-Control')).toBeDefined();
    });
  });
});

// Helper function to determine content type based on file extension
function getContentType(path: string): string {
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.html') || path === '/') return 'text/html';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  return 'text/plain';
}