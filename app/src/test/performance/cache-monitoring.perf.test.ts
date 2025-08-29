/**
 * Cache Metrics Monitoring and Reporting Tests
 * Tests cache performance monitoring, metrics collection, and reporting functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheUtils } from '../../lib/content-cache';

// Mock the direct database functions for testing
vi.mock('../../lib/content-db-direct', () => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
  getAllSettings: vi.fn(),
  getSetting: vi.fn()
}));

import {
  getCollection as getCollectionDirect,
  getEntry as getEntryDirect,
  getAllSettings as getAllSettingsDirect
} from '../../lib/content-db-direct';

import {
  getCollection,
  getEntry,
  getAllSettings,
  getSetting,
  getHomepageData
} from '../../lib/content-cache';

describe('Cache Metrics Monitoring Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheUtils.clearAll();
    cacheUtils.resetMetrics();
  });

  afterEach(() => {
    cacheUtils.clearAll();
  });

  describe('Metrics Collection', () => {
    test('should track query counts accurately', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Initial state
      let metrics = cacheUtils.getMetrics();
      expect(metrics.queries).toBe(0);

      // Perform queries
      await getCollection('blog');
      await getCollection('staff');
      await getCollection('blog'); // Cache hit

      metrics = cacheUtils.getMetrics();
      expect(metrics.queries).toBe(3);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(1);
    });

    test('should calculate hit rate correctly', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Perform operations to generate metrics
      await getCollection('blog');      // Miss
      await getCollection('blog');      // Hit
      await getCollection('blog');      // Hit
      await getCollection('staff');     // Miss
      await getCollection('blog');      // Hit

      const metrics = cacheUtils.getMetrics();
      
      expect(metrics.queries).toBe(5);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(3);
      expect(metrics.hitRate).toBe('60.0%');
    });

    test('should track cache memory usage estimates', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      await getCollection('blog');
      await getCollection('staff');
      await getCollection('testimonials');

      const metrics = cacheUtils.getMetrics();
      
      expect(metrics.totalEntries).toBe(3);
      expect(metrics.validEntries).toBe(3);
      expect(metrics.expiredEntries).toBe(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    test('should distinguish between valid and expired entries', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      try {
        // Add some cache entries
        await getCollection('blog');
        await getCollection('staff');

        // Fast forward time to expire entries
        currentTime += 10 * 60 * 1000; // 10 minutes later

        const metrics = cacheUtils.getMetrics();
        
        expect(metrics.totalEntries).toBe(2);
        expect(metrics.expiredEntries).toBe(2);
        expect(metrics.validEntries).toBe(0);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance improvement over time', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `item${i}`,
        data: { title: `Item ${i}` }
      }));
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Measure initial performance (cache miss)
      const startMiss = performance.now();
      await getCollection('blog');
      const missDuration = performance.now() - startMiss;

      // Measure cached performance (cache hit)
      const startHit = performance.now();
      await getCollection('blog');
      const hitDuration = performance.now() - startHit;

      console.log(`Cache miss: ${missDuration.toFixed(2)}ms`);
      console.log(`Cache hit: ${hitDuration.toFixed(2)}ms`);
      console.log(`Performance improvement: ${(missDuration / hitDuration).toFixed(1)}x faster`);

      // Cache hit should be at least 5x faster
      expect(hitDuration).toBeLessThan(missDuration * 0.2);

      const metrics = cacheUtils.getMetrics();
      expect(metrics.hitRate).toBe('50.0%');
    });

    test('should monitor cache effectiveness under load', async () => {
      const mockCollections = {
        blog: [{ id: 'blog1' }],
        staff: [{ id: 'staff1' }],
        testimonials: [{ id: 'test1' }]
      };

      (getCollectionDirect as any)
        .mockResolvedValueOnce(mockCollections.blog)
        .mockResolvedValueOnce(mockCollections.staff)
        .mockResolvedValueOnce(mockCollections.testimonials);

      // Simulate multiple homepage loads (heavy cache usage)
      const homepageLoads = Array.from({ length: 20 }, () => getHomepageData());
      
      const startTime = performance.now();
      await Promise.all(homepageLoads);
      const totalTime = performance.now() - startTime;

      console.log(`20 homepage loads completed in: ${totalTime.toFixed(2)}ms`);
      
      const metrics = cacheUtils.getMetrics();
      console.log(`Cache hit rate: ${metrics.hitRate}`);
      console.log(`Total queries: ${metrics.queries}`);
      
      // Should achieve high cache hit rate
      expect(parseFloat(metrics.hitRate)).toBeGreaterThan(80);
      
      // Should complete quickly due to caching
      expect(totalTime).toBeLessThan(100);
      
      // Should only make 3 database calls (one per collection)
      expect(getCollectionDirect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache Health Monitoring', () => {
    test('should detect cache health issues', async () => {
      // Test scenario: High miss rate indicates potential problems
      const mockData = [{ id: 'test1' }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Simulate poor cache performance (many different queries)
      const collections = ['blog', 'staff', 'testimonials', 'hours', 'tuition', 'photos'];
      
      for (const collection of collections) {
        await getCollection(collection);
      }

      const metrics = cacheUtils.getMetrics();
      
      // With all cache misses, hit rate should be low
      expect(metrics.queries).toBe(6);
      expect(metrics.cacheMisses).toBe(6);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.hitRate).toBe('0.0%');
      
      // This would indicate need for cache prewarming
      if (parseFloat(metrics.hitRate) < 50) {
        console.warn('⚠️ Low cache hit rate detected - consider cache prewarming');
      }
    });

    test('should monitor cache memory efficiency', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        data: { 
          title: `Item ${i}`,
          content: 'Large content string'.repeat(100)
        }
      }));

      (getCollectionDirect as any).mockResolvedValue(largeData);

      // Add multiple large collections to cache
      await getCollection('blog');
      await getCollection('staff');
      await getCollection('testimonials');

      const metrics = cacheUtils.getMetrics();
      
      console.log(`Cache memory usage: ${metrics.memoryUsage} bytes (estimated)`);
      console.log(`Entries cached: ${metrics.totalEntries}`);
      
      // Memory usage should be reasonable
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.totalEntries).toBe(3);
      
      // If memory usage gets too high, should trigger cleanup
      if (metrics.memoryUsage > 10000) {
        console.warn('⚠️ High cache memory usage - consider implementing size limits');
      }
    });
  });

  describe('Metrics Reporting', () => {
    test('should generate comprehensive performance report', async () => {
      const mockData = [{ id: 'test1', data: { title: 'Test' } }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Generate some cache activity
      await getCollection('blog');
      await getCollection('blog'); // Hit
      await getCollection('staff');
      await getCollection('blog'); // Hit
      await getSetting('test-setting');

      const metrics = cacheUtils.getMetrics();
      
      // Verify all expected metrics are present
      expect(metrics).toHaveProperty('queries');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('totalEntries');
      expect(metrics).toHaveProperty('validEntries');
      expect(metrics).toHaveProperty('expiredEntries');
      expect(metrics).toHaveProperty('memoryUsage');

      // Generate performance report
      const report = generatePerformanceReport(metrics);
      expect(report).toContain('Cache Performance Report');
      expect(report).toContain(metrics.hitRate);
      expect(report).toContain(metrics.queries.toString());
      
      console.log(report);
    });

    test('should provide actionable performance insights', async () => {
      const mockData = [{ id: 'test1' }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Simulate different performance scenarios
      const scenarios = [
        { description: 'High hit rate', hits: 8, misses: 2 },
        { description: 'Low hit rate', hits: 2, misses: 8 },
        { description: 'No cache usage', hits: 0, misses: 10 }
      ];

      for (const scenario of scenarios) {
        cacheUtils.resetMetrics();
        
        // Simulate the scenario
        for (let i = 0; i < scenario.misses; i++) {
          await getCollection(`collection${i}`);
        }
        for (let i = 0; i < scenario.hits; i++) {
          await getCollection('collection0'); // Repeated requests for hits
        }

        const metrics = cacheUtils.getMetrics();
        const insights = generatePerformanceInsights(metrics);
        
        console.log(`${scenario.description}:`);
        console.log(`  Hit rate: ${metrics.hitRate}`);
        console.log(`  Insights: ${insights.join(', ')}`);
        
        expect(insights.length).toBeGreaterThan(0);
        expect(Array.isArray(insights)).toBe(true);
      }
    });
  });

  describe('Real-time Monitoring', () => {
    test('should track metrics in real-time', async () => {
      const mockData = [{ id: 'test1' }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Track metrics changes over time
      const metricsHistory: any[] = [];
      
      // Initial state
      metricsHistory.push(cacheUtils.getMetrics());

      // Perform operations and track metrics
      await getCollection('blog');
      metricsHistory.push(cacheUtils.getMetrics());

      await getCollection('blog'); // Cache hit
      metricsHistory.push(cacheUtils.getMetrics());

      await getCollection('staff');
      metricsHistory.push(cacheUtils.getMetrics());

      // Verify metrics progression
      expect(metricsHistory[0].queries).toBe(0);
      expect(metricsHistory[1].queries).toBe(1);
      expect(metricsHistory[2].queries).toBe(2);
      expect(metricsHistory[3].queries).toBe(3);

      expect(metricsHistory[2].cacheHits).toBe(1);
      expect(metricsHistory[3].cacheHits).toBe(1);

      console.log('Metrics progression:');
      metricsHistory.forEach((metrics, i) => {
        console.log(`  Step ${i}: Queries=${metrics.queries}, Hits=${metrics.cacheHits}, Rate=${metrics.hitRate}`);
      });
    });

    test('should detect performance anomalies', async () => {
      const mockData = [{ id: 'test1' }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Establish baseline performance
      await getCollection('blog');
      const baselineTime = performance.now();
      await getCollection('blog'); // Should be fast (cached)
      const cachedTime = performance.now() - baselineTime;

      // Simulate performance degradation
      (getCollectionDirect as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockData), 100))
      );

      cacheUtils.clearAll(); // Force cache miss
      const degradedStartTime = performance.now();
      await getCollection('blog');
      const degradedTime = performance.now() - degradedStartTime;

      console.log(`Cached request: ${cachedTime.toFixed(2)}ms`);
      console.log(`Degraded request: ${degradedTime.toFixed(2)}ms`);

      // Should detect significant performance difference
      expect(degradedTime).toBeGreaterThan(cachedTime * 10);
      
      if (degradedTime > 50) {
        console.warn('⚠️ Performance anomaly detected - database queries are slow');
      }
    });
  });

  describe('Cache Optimization Recommendations', () => {
    test('should provide cache optimization recommendations', async () => {
      const mockData = [{ id: 'test1' }];
      (getCollectionDirect as any).mockResolvedValue(mockData);

      // Generate different cache usage patterns
      const patterns = [
        {
          name: 'Optimal usage',
          operations: async () => {
            await getCollection('blog');
            await getCollection('blog');
            await getCollection('blog');
            await getCollection('staff');
            await getCollection('staff');
          }
        },
        {
          name: 'Poor cache usage',
          operations: async () => {
            await getCollection('blog');
            await getCollection('staff');
            await getCollection('testimonials');
            await getCollection('hours');
            await getCollection('tuition');
          }
        }
      ];

      for (const pattern of patterns) {
        cacheUtils.resetMetrics();
        await pattern.operations();
        
        const metrics = cacheUtils.getMetrics();
        const recommendations = generateOptimizationRecommendations(metrics);
        
        console.log(`${pattern.name}:`);
        console.log(`  Hit rate: ${metrics.hitRate}`);
        console.log(`  Recommendations: ${recommendations.join(', ')}`);
        
        expect(Array.isArray(recommendations)).toBe(true);
      }
    });
  });
});

// Helper functions for generating reports and insights
function generatePerformanceReport(metrics: any): string {
  return `
# Cache Performance Report

## Overview
- Total Queries: ${metrics.queries}
- Cache Hits: ${metrics.cacheHits}
- Cache Misses: ${metrics.cacheMisses}
- Hit Rate: ${metrics.hitRate}

## Memory Usage
- Total Entries: ${metrics.totalEntries}
- Valid Entries: ${metrics.validEntries}
- Expired Entries: ${metrics.expiredEntries}
- Memory Usage: ${metrics.memoryUsage} bytes (estimated)

## Performance Status
${parseFloat(metrics.hitRate) > 80 ? '✅ Excellent cache performance' :
    parseFloat(metrics.hitRate) > 60 ? '💛 Good cache performance' :
      parseFloat(metrics.hitRate) > 40 ? '⚠️ Fair cache performance' :
        '❌ Poor cache performance'}
  `.trim();
}

function generatePerformanceInsights(metrics: any): string[] {
  const insights: string[] = [];
  const hitRate = parseFloat(metrics.hitRate);
  
  if (hitRate > 80) {
    insights.push('Excellent cache utilization');
  } else if (hitRate < 40) {
    insights.push('Consider cache prewarming');
    insights.push('Review query patterns');
  }
  
  if (metrics.expiredEntries > metrics.validEntries * 0.5) {
    insights.push('High cache expiration rate detected');
  }
  
  if (metrics.queries > 100 && metrics.cacheHits < 50) {
    insights.push('High query volume with low cache efficiency');
  }
  
  return insights;
}

function generateOptimizationRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  const hitRate = parseFloat(metrics.hitRate);
  
  if (hitRate < 50) {
    recommendations.push('Implement cache prewarming');
    recommendations.push('Increase TTL for stable content');
  }
  
  if (metrics.cacheMisses > metrics.cacheHits) {
    recommendations.push('Review content access patterns');
    recommendations.push('Consider batched data loading');
  }
  
  if (metrics.totalEntries > 50) {
    recommendations.push('Implement cache size limits');
    recommendations.push('Add memory usage monitoring');
  }
  
  return recommendations;
}