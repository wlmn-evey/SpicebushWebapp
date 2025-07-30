/**
 * Performance Tests for Image Preloading Implementation
 * Tests preload link generation, responsive images, WebP fallbacks, and loading effectiveness
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CRITICAL_IMAGES,
  generatePreloadLinks,
  preloadImages,
  generateResponsiveSrcSet,
  getOptimizedImagePath,
  createResponsiveImage
} from '../../lib/image-preloader';

// Mock DOM environment for browser tests
const mockDocument = {
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn()
  }
};

const mockLink = {
  rel: '',
  as: '',
  href: '',
  type: '',
  media: '',
  fetchPriority: '',
  onload: null as any,
  onerror: null as any
};

describe('Image Preloader Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock link object
    Object.assign(mockLink, {
      rel: '',
      as: '',
      href: '',
      type: '',
      media: '',
      fetchPriority: '',
      onload: null,
      onerror: null
    });
  });

  describe('Critical Image Preloading', () => {
    test('should define critical images for above-the-fold content', () => {
      expect(CRITICAL_IMAGES).toBeDefined();
      expect(Array.isArray(CRITICAL_IMAGES)).toBe(true);
      expect(CRITICAL_IMAGES.length).toBeGreaterThan(0);

      // Verify hero image is included
      const heroImage = CRITICAL_IMAGES.find(img => 
        img.src.includes('homepage-montessori-children-autumn-hero')
      );
      expect(heroImage).toBeDefined();
      expect(heroImage?.fetchpriority).toBe('high');
      expect(heroImage?.type).toBe('image/webp');
    });

    test('should generate proper preload links for critical images', () => {
      const preloadLinks = generatePreloadLinks(CRITICAL_IMAGES);
      
      expect(preloadLinks).toContain('rel="preload"');
      expect(preloadLinks).toContain('as="image"');
      expect(preloadLinks).toContain('type="image/webp"');
      expect(preloadLinks).toContain('fetchpriority="high"');
      
      // Should have responsive media queries
      expect(preloadLinks).toContain('media="(min-width: 768px)"');
      expect(preloadLinks).toContain('media="(max-width: 767px)"');

      // Count the number of preload links
      const linkCount = (preloadLinks.match(/<link/g) || []).length;
      expect(linkCount).toBe(CRITICAL_IMAGES.length);
    });

    test('should prioritize WebP format with proper media queries', () => {
      const desktopHeroImage = CRITICAL_IMAGES.find(img => 
        img.src.includes('1920x1080.webp')
      );
      const mobileHeroImage = CRITICAL_IMAGES.find(img => 
        img.src.includes('1280w.webp') && img.media?.includes('max-width')
      );

      expect(desktopHeroImage).toBeDefined();
      expect(desktopHeroImage?.media).toBe('(min-width: 768px)');
      expect(desktopHeroImage?.type).toBe('image/webp');
      expect(desktopHeroImage?.fetchpriority).toBe('high');

      expect(mobileHeroImage).toBeDefined();
      expect(mobileHeroImage?.media).toBe('(max-width: 767px)');
      expect(mobileHeroImage?.type).toBe('image/webp');
      expect(mobileHeroImage?.fetchpriority).toBe('high');
    });
  });

  describe('Programmatic Image Preloading', () => {
    test('should preload images programmatically via JavaScript', async () => {
      // Mock document.createElement
      mockDocument.createElement.mockReturnValue(mockLink);
      global.document = mockDocument as any;

      const testImages = [
        {
          src: '/test-image-1.webp',
          type: 'image/webp' as const,
          fetchpriority: 'high' as const
        },
        {
          src: '/test-image-2.webp',
          type: 'image/webp' as const,
          media: '(min-width: 768px)'
        }
      ];

      // Mock successful loading
      mockDocument.createElement.mockImplementation(() => {
        const link = { ...mockLink };
        setTimeout(() => {
          if (link.onload) link.onload();
        }, 0);
        return link;
      });

      const promise = preloadImages(testImages);
      
      // Verify links are created and configured correctly
      expect(mockDocument.createElement).toHaveBeenCalledTimes(2);
      expect(mockDocument.createElement).toHaveBeenCalledWith('link');
      
      await promise;
      
      // Verify appendChild was called for each image
      expect(mockDocument.head.appendChild).toHaveBeenCalledTimes(2);
    });

    test('should handle preload failures gracefully', async () => {
      global.document = mockDocument as any;

      const testImages = [
        {
          src: '/non-existent-image.webp',
          type: 'image/webp' as const
        }
      ];

      // Mock failed loading
      mockDocument.createElement.mockImplementation(() => {
        const link = { ...mockLink };
        setTimeout(() => {
          if (link.onerror) link.onerror(new Error('Failed to load'));
        }, 0);
        return link;
      });

      await expect(preloadImages(testImages)).rejects.toThrow('Failed to preload');
    });
  });

  describe('Responsive Image Generation', () => {
    test('should generate proper responsive srcsets with WebP and fallback', () => {
      const result = generateResponsiveSrcSet('homepage', 'hero-image');

      expect(result.webp).toContain('320w.webp 320w');
      expect(result.webp).toContain('640w.webp 640w');
      expect(result.webp).toContain('960w.webp 960w');
      expect(result.webp).toContain('1280w.webp 1280w');
      expect(result.webp).toContain('1920w.webp 1920w');

      expect(result.fallback).toContain('640w.jpg 640w');
      expect(result.fallback).toContain('1280w.jpg 1280w');

      expect(result.sizes).toContain('(max-width: 640px) 100vw');
      expect(result.sizes).toContain('(max-width: 1280px) 50vw');
      expect(result.sizes).toContain('33vw');
    });

    test('should generate optimized image paths for different categories', () => {
      const testCases = [
        { slug: 'homepage-montessori-children-autumn', expected: '/images/optimized/homepage/' },
        { slug: 'about-montessori-child-observing', expected: '/images/optimized/about/' },
        { slug: 'admissions-montessori-collaborative', expected: '/images/optimized/admissions/' },
        { slug: 'programs-montessori-bird-puzzle', expected: '/images/optimized/programs/' },
        { slug: 'teachers-leah-walker', expected: '/images/optimized/teachers/' },
        { slug: 'gallery-montessori-watercolor', expected: '/images/optimized/gallery/' },
        { slug: 'random-photo-name', expected: '/images/optimized/gallery/' } // Default
      ];

      testCases.forEach(({ slug, expected }) => {
        const path = getOptimizedImagePath(slug, '1280w', 'webp');
        expect(path).toStartWith(expected);
        expect(path).toContain(`${slug}-1280w.webp`);
      });
    });

    test('should create responsive image HTML with proper picture element', () => {
      const html = createResponsiveImage(
        'homepage-montessori-children-autumn',
        'Children playing in autumn leaves',
        'hero-image',
        'eager'
      );

      expect(html).toContain('<picture>');
      expect(html).toContain('<source');
      expect(html).toContain('type="image/webp"');
      expect(html).toContain('type="image/jpeg"');
      expect(html).toContain('alt="Children playing in autumn leaves"');
      expect(html).toContain('class="hero-image"');
      expect(html).toContain('loading="eager"');
      expect(html).toContain('decoding="async"');
      expect(html).toContain('</picture>');
    });
  });

  describe('Performance Optimization Verification', () => {
    test('should verify WebP format prioritization', () => {
      CRITICAL_IMAGES.forEach(image => {
        expect(image.type).toBe('image/webp');
      });

      const html = createResponsiveImage('test-image', 'Test alt text');
      const sources = html.match(/<source[^>]*>/g) || [];
      
      // WebP source should come first
      expect(sources[0]).toContain('type="image/webp"');
      expect(sources[1]).toContain('type="image/jpeg"');
    });

    test('should verify high priority fetchpriority for critical images', () => {
      const criticalImages = CRITICAL_IMAGES.filter(img => img.fetchpriority === 'high');
      expect(criticalImages.length).toBeGreaterThan(0);
      
      const preloadLinks = generatePreloadLinks(CRITICAL_IMAGES);
      expect(preloadLinks).toContain('fetchpriority="high"');
    });

    test('should verify responsive breakpoints for different screen sizes', () => {
      const mobileImage = CRITICAL_IMAGES.find(img => 
        img.media?.includes('max-width: 767px')
      );
      const desktopImage = CRITICAL_IMAGES.find(img => 
        img.media?.includes('min-width: 768px')
      );

      expect(mobileImage).toBeDefined();
      expect(desktopImage).toBeDefined();

      // Mobile image should be smaller
      expect(mobileImage?.src).toContain('1280w');
      expect(desktopImage?.src).toContain('1920x1080');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should preload images within performance target', async () => {
      global.document = mockDocument as any;

      // Mock fast loading
      mockDocument.createElement.mockImplementation(() => {
        const link = { ...mockLink };
        setTimeout(() => {
          if (link.onload) link.onload();
        }, 1); // 1ms mock load time
        return link;
      });

      const startTime = performance.now();
      await preloadImages(CRITICAL_IMAGES);
      const endTime = performance.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100); // Under 100ms
    });

    test('should generate preload links efficiently', () => {
      const startTime = performance.now();
      const links = generatePreloadLinks(CRITICAL_IMAGES);
      const endTime = performance.now();

      expect(links).toBeDefined();
      expect(links.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(10); // Under 10ms
    });

    test('should create responsive image HTML efficiently', () => {
      const startTime = performance.now();
      
      // Generate multiple responsive images
      const images = Array.from({ length: 50 }, (_, i) => 
        createResponsiveImage(`test-image-${i}`, `Test image ${i}`)
      );
      
      const endTime = performance.now();

      expect(images).toHaveLength(50);
      images.forEach(html => {
        expect(html).toContain('<picture>');
        expect(html).toContain('type="image/webp"');
      });

      // Should generate all images quickly
      expect(endTime - startTime).toBeLessThan(50); // Under 50ms for 50 images
    });
  });

  describe('Integration with Layout', () => {
    test('should provide correct preload links for homepage', () => {
      const preloadLinks = generatePreloadLinks(CRITICAL_IMAGES);
      
      // Should include all critical homepage images
      expect(preloadLinks).toContain('homepage-montessori-children-autumn-hero');
      expect(preloadLinks).toContain('homepage-spicebush-logo-brand-identity');
      
      // Links should be properly formatted for HTML head insertion
      const linkElements = preloadLinks.split('\n').filter(link => link.trim());
      linkElements.forEach(link => {
        expect(link).toMatch(/^<link\s+[^>]*\/?>$/);
      });
    });

    test('should verify fallback image paths exist', () => {
      const srcSet = generateResponsiveSrcSet('homepage', 'test-image');
      
      // Fallback images should use common formats
      expect(srcSet.fallback).toContain('.jpg');
      
      // Should include reasonable breakpoints
      expect(srcSet.fallback).toContain('640w');
      expect(srcSet.fallback).toContain('1280w');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle missing image data gracefully', () => {
      const emptyImages: any[] = [];
      const preloadLinks = generatePreloadLinks(emptyImages);
      
      expect(preloadLinks).toBe('');
    });

    test('should handle malformed image objects', () => {
      const malformedImages = [
        { src: '', type: undefined }, // Missing required fields
        { src: '/valid-image.webp', type: 'image/webp' } // Valid image
      ] as any[];

      const preloadLinks = generatePreloadLinks(malformedImages);
      
      // Should still generate valid HTML, filtering out invalid attributes
      expect(preloadLinks).toContain('<link');
      expect(preloadLinks).toContain('href="/valid-image.webp"');
    });

    test('should handle image path edge cases', () => {
      const edgeCases = [
        '',
        'no-category-prefix',
        'multiple-homepage-homepage-test',
        'mixed-CaSe-HoMePaGe-test'
      ];

      edgeCases.forEach(slug => {
        const path = getOptimizedImagePath(slug);
        expect(path).toStartWith('/images/optimized/');
        expect(path).toContain('.webp');
      });
    });
  });
});