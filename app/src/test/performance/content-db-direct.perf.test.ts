import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import {
  getCollection,
  getEntry,
  getSetting
} from '../../lib/content-db-direct';

describe('content-db-direct Performance Tests', () => {
  const iterations = 100;
  const concurrentRequests = 10;

  describe('Sequential Performance', () => {
    it('should handle multiple sequential getCollection calls efficiently', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await getCollection('blog');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`Sequential getCollection: ${avgTime.toFixed(2)}ms average per call`);
      
      // Each call should be fast (under 50ms on average)
      expect(avgTime).toBeLessThan(50);
    });

    it('should handle multiple sequential getEntry calls efficiently', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await getEntry('blog', `test-post-${i % 10}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`Sequential getEntry: ${avgTime.toFixed(2)}ms average per call`);
      
      expect(avgTime).toBeLessThan(50);
    });

    it('should handle multiple sequential getSetting calls efficiently', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await getSetting(`setting-${i % 10}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`Sequential getSetting: ${avgTime.toFixed(2)}ms average per call`);
      
      expect(avgTime).toBeLessThan(30);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent getCollection calls', async () => {
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(getCollection('blog'));
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Concurrent getCollection (${concurrentRequests} requests): ${totalTime.toFixed(2)}ms total`);
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(concurrentRequests * 100);
    });

    it('should handle mixed concurrent operations', async () => {
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        if (i % 3 === 0) {
          promises.push(getCollection('blog'));
        } else if (i % 3 === 1) {
          promises.push(getEntry('blog', 'test-post'));
        } else {
          promises.push(getSetting('test-setting'));
        }
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Mixed concurrent operations (${concurrentRequests} requests): ${totalTime.toFixed(2)}ms total`);
      
      expect(totalTime).toBeLessThan(concurrentRequests * 100);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      if (!global.gc) {
        console.warn('Garbage collection not exposed. Run with --expose-gc flag for memory tests.');
        return;
      }

      // Force garbage collection and measure initial memory
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await getCollection('blog');
        await getEntry('blog', 'test-post');
        await getSetting('test-setting');
      }
      
      // Force garbage collection and measure final memory
      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`Memory increase after 1000 operations: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Should not increase memory significantly (less than 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without blocking', async () => {
      const startTime = performance.now();
      
      // Try to fetch non-existent entries
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(getEntry('non-existent-type', 'non-existent-slug'));
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Error handling (50 requests): ${totalTime.toFixed(2)}ms total`);
      
      // Error handling should be fast
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Connection Pool Efficiency', () => {
    it('should reuse connections efficiently', async () => {
      const timings: number[] = [];
      
      // First call (includes connection setup)
      let start = performance.now();
      await getCollection('blog');
      timings.push(performance.now() - start);
      
      // Subsequent calls (should reuse connection)
      for (let i = 0; i < 10; i++) {
        start = performance.now();
        await getCollection('blog');
        timings.push(performance.now() - start);
      }
      
      const firstCallTime = timings[0];
      const avgSubsequentTime = timings.slice(1).reduce((a, b) => a + b) / (timings.length - 1);
      
      console.log(`First call: ${firstCallTime.toFixed(2)}ms`);
      console.log(`Average subsequent calls: ${avgSubsequentTime.toFixed(2)}ms`);
      
      // Subsequent calls should be significantly faster than the first
      expect(avgSubsequentTime).toBeLessThan(firstCallTime * 0.5);
    });
  });
});