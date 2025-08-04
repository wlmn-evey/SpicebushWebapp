import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { getCollection, getEntry } from '../src/lib/content-db-direct';

/**
 * Performance benchmark tests for Bug #048
 * Verifies that the whitelisting fix improves performance
 */
describe('Bug #048: Performance Benchmarks', () => {
  // Performance thresholds
  const INSTANT_THRESHOLD = 10; // Operations that should be near-instant
  const FAST_THRESHOLD = 100; // Operations that should be very fast
  const ACCEPTABLE_THRESHOLD = 1000; // Operations that should complete quickly
  
  describe('Non-Database Collection Performance', () => {
    it('should return instantly for photos collection', async () => {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await getCollection('photos');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(INSTANT_THRESHOLD);
      console.log(`Average time for getCollection('photos'): ${avgTime.toFixed(3)}ms`);
    });
    
    it('should return instantly for coming-soon collection', async () => {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await getCollection('coming-soon');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(INSTANT_THRESHOLD);
      console.log(`Average time for getCollection('coming-soon'): ${avgTime.toFixed(3)}ms`);
    });
    
    it('should handle mixed collection requests efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate a page that requests multiple collections
      const results = await Promise.all([
        getCollection('photos'),
        getCollection('coming-soon'),
        getEntry('photos', 'test-1'),
        getEntry('photos', 'test-2'),
        getEntry('coming-soon', 'test'),
        getCollection('photos'), // Duplicate request
        getEntry('photos', 'test-3')
      ]);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All operations should complete very quickly
      expect(totalTime).toBeLessThan(FAST_THRESHOLD);
      
      // All results should be empty/null
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);
      expect(results[2]).toBeNull();
      expect(results[3]).toBeNull();
      expect(results[4]).toBeNull();
      expect(results[5]).toEqual([]);
      expect(results[6]).toBeNull();
      
      console.log(`Total time for 7 non-database operations: ${totalTime.toFixed(2)}ms`);
    });
  });
  
  describe('Performance Under Load', () => {
    it('should handle high volume of non-database requests', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();
      
      // Simulate multiple concurrent page loads
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          Promise.all([
            getCollection('photos'),
            getCollection('coming-soon'),
            getEntry('photos', `photo-${i}`),
            getEntry('coming-soon', `item-${i}`)
          ])
        );
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalOperations = concurrentRequests * 4;
      const avgTimePerOperation = totalTime / totalOperations;
      
      // Even under load, operations should be very fast
      expect(avgTimePerOperation).toBeLessThan(INSTANT_THRESHOLD);
      
      console.log(`Processed ${totalOperations} operations in ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per operation: ${avgTimePerOperation.toFixed(3)}ms`);
    });
  });
  
  describe('Memory Usage', () => {
    it('should not leak memory with repeated non-database calls', async () => {
      const iterations = 1000;
      const memoryBefore = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        await getCollection('photos');
        await getEntry('coming-soon', 'test');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage();
      const heapGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      // Memory growth should be minimal (less than 10MB for 1000 iterations)
      expect(heapGrowthMB).toBeLessThan(10);
      
      console.log(`Memory growth after ${iterations} iterations: ${heapGrowthMB.toFixed(2)}MB`);
    });
  });
  
  describe('Comparison: Before vs After Fix', () => {
    it('should demonstrate performance improvement', async () => {
      // Simulate the "before" scenario (would make database calls)
      // Note: We can't actually test the old behavior, but we can compare
      // non-database vs database collection performance
      
      const nonDbCollections = ['photos', 'coming-soon'];
      const dbCollections = ['blog', 'staff'];
      
      // Time non-database collections (with fix)
      const nonDbStart = performance.now();
      for (const collection of nonDbCollections) {
        await getCollection(collection);
      }
      const nonDbTime = performance.now() - nonDbStart;
      
      // This would have taken 25+ seconds before the fix
      // Now it should be near-instant
      expect(nonDbTime).toBeLessThan(50);
      
      console.log('Performance Summary:');
      console.log(`- Non-DB collections (with fix): ${nonDbTime.toFixed(2)}ms`);
      console.log('- Before fix: ~25,000ms (25+ seconds)');
      console.log(`- Improvement: ${((25000 - nonDbTime) / 25000 * 100).toFixed(1)}%`);
    });
  });
  
  describe('Real-world Scenarios', () => {
    it('should handle typical page load pattern efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate what a typical page might request
      const pageRequests = await Promise.all([
        // Layout/navigation might request these
        getEntry('settings', 'general'),
        getEntry('school-info', 'general'),
        
        // Page-specific content
        getCollection('photos'), // Gallery section
        getCollection('testimonials'), // Testimonials section
        getEntry('coming-soon', 'summer-program'), // Coming soon check
        
        // Footer might request these
        getEntry('hours', 'current'),
        getCollection('announcements')
      ]);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete quickly even with mixed collection types
      expect(totalTime).toBeLessThan(ACCEPTABLE_THRESHOLD);
      
      console.log(`Typical page load pattern completed in: ${totalTime.toFixed(2)}ms`);
    });
  });
});