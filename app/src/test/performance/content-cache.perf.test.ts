/**
 * Performance Tests for Content Cache Implementation
 * Tests caching effectiveness, TTL validation, cache invalidation, and performance metrics
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import {
  getCollection,
  getEntry,
  getAllSettings,
  getSetting,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  cacheUtils
} from '../../lib/content-cache';

// Mock the direct database functions
vi.mock('../../lib/content-db-direct', () => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
  getAllSettings: vi.fn(),
  getSetting: vi.fn(),
}));

import {
  getCollection as getCollectionDirect,
  getEntry as getEntryDirect,
  getAllSettings as getAllSettingsDirect,
  getSetting as getSettingDirect,
} from '../../lib/content-db-direct';

describe('Content Cache Performance Tests', () => {
  beforeEach(() => {
    // Reset all mocks and cache state before each test
    vi.clearAllMocks();
    cacheUtils.clearAll();
    cacheUtils.resetMetrics();
  });

  afterEach(() => {
    // Clean up after each test
    cacheUtils.clearAll();
  });

  describe('Cache Hit Performance', () => {
    test('should cache collection data and serve from cache on subsequent requests', async () => {
      const mockData = [
        { id: 'test1', data: { title: 'Test 1' } },
        { id: 'test2', data: { title: 'Test 2' } }
      ];

      (getCollectionDirect as any).mockResolvedValue(mockData);

      // First request - cache miss
      const startTime1 = performance.now();
      const result1 = await getCollection('blog');
      const endTime1 = performance.now();

      // Second request - cache hit (should be faster)
      const startTime2 = performance.now();
      const result2 = await getCollection('blog');
      const endTime2 = performance.now();

      const time1 = endTime1 - startTime1;
      const time2 = endTime2 - startTime2;

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(getCollectionDirect).toHaveBeenCalledTimes(1); // Only called once due to caching

      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);

      const metrics = cacheUtils.getMetrics();
      expect(metrics.queries).toBe(2);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.hitRate).toBe('50.0%');
    });

    test('should demonstrate 80% query reduction for batched homepage data', async () => {
      const mockBlogData = [{ id: 'blog1', data: { title: 'Blog 1' } }];
      const mockStaffData = [{ id: 'staff1', data: { name: 'Teacher 1' } }];
      const mockTestimonialData = [{ id: 'test1', data: { content: 'Great school!' } }];

      (getCollectionDirect as any)
        .mockResolvedValueOnce(mockBlogData)
        .mockResolvedValueOnce(mockStaffData)
        .mockResolvedValueOnce(mockTestimonialData);

      // First homepage data load
      const result1 = await getHomepageData();
      
      // Simulate multiple homepage requests (typical user behavior)
      const result2 = await getHomepageData();
      const result3 = await getHomepageData();
      const result4 = await getHomepageData();
      const result5 = await getHomepageData();

      expect(result1).toEqual({
        blog: mockBlogData,
        staff: mockStaffData,
        testimonials: mockTestimonialData
      });

      // Should have called the direct functions only 3 times (once per collection)
      // Instead of 15 times (5 requests × 3 collections)
      expect(getCollectionDirect).toHaveBeenCalledTimes(3);

      const metrics = cacheUtils.getMetrics();
      // 15 total queries (5 homepage requests × 3 collections each)
      expect(metrics.queries).toBe(15);
      // 12 cache hits out of 15 queries = 80% cache hit rate
      expect(metrics.cacheHits).toBe(12);
      expect(metrics.cacheMisses).toBe(3);
      expect(parseFloat(metrics.hitRate)).toBeGreaterThanOrEqual(80.0);
    });
  });

  describe('TTL (Time To Live) Validation', () => {
    test('should respect 5-minute default TTL for blog content', async () => {
      const mockData = [{ id: 'blog1', data: { title: 'Blog 1' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      try {
        // First request
        await getCollection('blog');
        expect(getCollectionDirect).toHaveBeenCalledTimes(1);

        // Request within TTL (4 minutes later)
        currentTime += 4 * 60 * 1000;
        await getCollection('blog');
        expect(getCollectionDirect).toHaveBeenCalledTimes(1); // Still cached

        // Request after TTL expires (6 minutes total)
        currentTime += 2 * 60 * 1000;
        await getCollection('blog');
        expect(getCollectionDirect).toHaveBeenCalledTimes(2); // Cache expired, new fetch
      } finally {
        Date.now = originalNow;
      }
    });

    test('should use appropriate TTL for different content types', async () => {
      const mockSettings = { key1: 'value1' };
      const mockStaff = [{ id: 'teacher1', data: { name: 'Teacher' } }];
      
      (getAllSettingsDirect as any).mockResolvedValue(mockSettings);
      (getCollectionDirect as any).mockResolvedValue(mockStaff);

      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      try {
        // Test settings (30-minute TTL)
        await getAllSettings();
        currentTime += 15 * 60 * 1000; // 15 minutes later
        await getAllSettings();
        expect(getAllSettingsDirect).toHaveBeenCalledTimes(1); // Still cached

        // Test staff (15-minute TTL)
        await getCollection('staff');
        currentTime += 10 * 60 * 1000; // 10 minutes later
        await getCollection('staff');
        expect(getCollectionDirect).toHaveBeenCalledTimes(1); // Still cached

        currentTime += 6 * 60 * 1000; // 16 minutes total for staff
        await getCollection('staff');
        expect(getCollectionDirect).toHaveBeenCalledTimes(2); // Staff cache expired
        
        // Settings should still be cached (25 minutes total)
        await getAllSettings();
        expect(getAllSettingsDirect).toHaveBeenCalledTimes(1); // Still cached
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate collection cache when requested', async () => {
      const mockData = [{ id: 'blog1', data: { title: 'Blog 1' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // First request - populate cache
      await getCollection('blog');
      expect(getCollectionDirect).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await getCollection('blog');
      expect(getCollectionDirect).toHaveBeenCalledTimes(1);

      // Invalidate cache
      cacheUtils.invalidateCollection('blog');

      // Third request - should fetch again
      await getCollection('blog');
      expect(getCollectionDirect).toHaveBeenCalledTimes(2);
    });

    test('should invalidate both collection and entry caches for a collection', async () => {
      const mockCollectionData = [{ id: 'blog1', data: { title: 'Blog 1' } }];
      const mockEntryData = { id: 'blog1', data: { title: 'Blog 1' } };
      
      (getCollectionDirect as any).mockResolvedValue(mockCollectionData);
      (getEntryDirect as any).mockResolvedValue(mockEntryData);

      // Populate both caches
      await getCollection('blog');
      await getEntry('blog', 'test-slug');

      // Verify cache is working
      await getCollection('blog');
      await getEntry('blog', 'test-slug');
      expect(getCollectionDirect).toHaveBeenCalledTimes(1);
      expect(getEntryDirect).toHaveBeenCalledTimes(1);

      // Invalidate collection
      cacheUtils.invalidateCollection('blog');

      // Both should fetch again
      await getCollection('blog');
      await getEntry('blog', 'test-slug');
      expect(getCollectionDirect).toHaveBeenCalledTimes(2);
      expect(getEntryDirect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Metrics Tracking', () => {
    test('should accurately track query counts and cache performance', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Reset metrics to start clean
      cacheUtils.resetMetrics();

      // Perform various operations
      await getCollection('blog');      // Miss
      await getCollection('blog');      // Hit
      await getCollection('staff');     // Miss
      await getCollection('blog');      // Hit
      await getCollection('staff');     // Hit

      const metrics = cacheUtils.getMetrics();
      
      expect(metrics.queries).toBe(5);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(3);
      expect(metrics.hitRate).toBe('60.0%');
      expect(metrics.totalEntries).toBeGreaterThan(0);
      expect(metrics.validEntries).toBeGreaterThan(0);
    });

    test('should provide cache memory usage estimates', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      await getCollection('blog');
      await getCollection('staff');
      await getCollection('testimonials');

      const metrics = cacheUtils.getMetrics();
      
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.totalEntries).toBe(3);
      expect(typeof metrics.memoryUsage).toBe('number');
    });
  });

  describe('Batch Loading Performance', () => {
    test('should load multiple collections efficiently', async () => {
      const mockBlogData = [{ id: 'blog1', data: { title: 'Blog 1' } }];
      const mockStaffData = [{ id: 'staff1', data: { name: 'Teacher 1' } }];
      const mockTuitionData = [{ id: 'tuition1', data: { amount: 1000 } }];

      (getCollectionDirect as any)
        .mockResolvedValueOnce(mockBlogData)
        .mockResolvedValueOnce(mockStaffData)
        .mockResolvedValueOnce(mockTuitionData);

      const startTime = performance.now();
      const result = await getBatchedPageData(['blog', 'staff', 'tuition']);
      const endTime = performance.now();

      expect(result).toEqual({
        blog: mockBlogData,
        staff: mockStaffData,
        tuition: mockTuitionData
      });

      // Should execute all requests in parallel
      expect(getCollectionDirect).toHaveBeenCalledTimes(3);
      
      // Batch loading should be faster than sequential loading
      // (This is hard to test precisely, but we can verify it completes quickly)
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should efficiently load admin data with both collections and settings', async () => {
      const mockCollections = {
        blog: [{ id: 'blog1' }],
        staff: [{ id: 'staff1' }],
        tuition: [{ id: 'tuition1' }],
        hours: [{ id: 'hours1' }]
      };
      const mockSettings = { setting1: 'value1' };

      (getCollectionDirect as any)
        .mockResolvedValueOnce(mockCollections.blog)
        .mockResolvedValueOnce(mockCollections.staff)
        .mockResolvedValueOnce(mockCollections.tuition)
        .mockResolvedValueOnce(mockCollections.hours);
      
      (getAllSettingsDirect as any).mockResolvedValue(mockSettings);

      const result = await getAdminData();

      expect(result).toEqual({
        collections: mockCollections,
        settings: mockSettings
      });

      // Should call collections and settings in parallel
      expect(getCollectionDirect).toHaveBeenCalledTimes(4);
      expect(getAllSettingsDirect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Preloading', () => {
    test('should preload common data successfully', async () => {
      const mockData = { test: 'data' };
      (getCollectionDirect as any).mockResolvedValue(mockData);
      (getAllSettingsDirect as any).mockResolvedValue(mockData);

      // Spy on console.log to verify success message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cacheUtils.preloadCommonData();

      expect(getCollectionDirect).toHaveBeenCalledWith('blog');
      expect(getCollectionDirect).toHaveBeenCalledWith('staff');
      expect(getCollectionDirect).toHaveBeenCalledWith('hours');
      expect(getAllSettingsDirect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Content cache preloaded successfully');

      consoleSpy.mockRestore();
    });

    test('should handle preload failures gracefully', async () => {
      (getCollectionDirect as any).mockRejectedValue(new Error('Database error'));
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await cacheUtils.preloadCommonData();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to preload cache:', expect.any(Error));
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should achieve target performance metrics', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `item${i}`,
        data: { title: `Item ${i}`, content: 'Some content'.repeat(50) }
      }));

      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Benchmark cache miss
      const startCacheMiss = performance.now();
      await getCollection('blog');
      const endCacheMiss = performance.now();
      const cacheMissTime = endCacheMiss - startCacheMiss;

      // Benchmark cache hit
      const startCacheHit = performance.now();
      await getCollection('blog');
      const endCacheHit = performance.now();
      const cacheHitTime = endCacheHit - startCacheHit;

      // Cache hit should be at least 10x faster than cache miss
      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.1);
      
      // Both should complete within reasonable time
      expect(cacheMissTime).toBeLessThan(100); // Under 100ms
      expect(cacheHitTime).toBeLessThan(10);   // Under 10ms
    });

    test('should maintain performance under load', async () => {
      const mockData = [{ id: 'test', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Simulate high load with many concurrent requests
      const requests = Array.from({ length: 100 }, () => getCollection('blog'));
      
      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();

      // All requests should return the same data
      results.forEach(result => {
        expect(result).toEqual(mockData);
      });

      // Should complete all 100 requests quickly due to caching
      expect(endTime - startTime).toBeLessThan(50); // Under 50ms total
      
      // Should only make one actual database call
      expect(getCollectionDirect).toHaveBeenCalledTimes(1);

      const metrics = cacheUtils.getMetrics();
      expect(metrics.queries).toBe(100);
      expect(metrics.cacheHits).toBe(99);
      expect(metrics.cacheMisses).toBe(1);
    });
  });
});