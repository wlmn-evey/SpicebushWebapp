import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  updateContent,
  deleteContent,
  updateSetting,
  getCollection,
  getAllSettings
} from '@lib/content-db-direct';

describe('Content DB Write Performance Tests', () => {
  const performanceThresholds = {
    singleWrite: 100, // ms
    bulkWrite: 500,   // ms for 10 items
    delete: 50,       // ms
    settingUpdate: 30 // ms
  };

  const testTimestamp = Date.now();
  const createdItems: Array<{ type: string; slug: string }> = [];

  afterAll(async () => {
    // Cleanup test data
    console.log('Cleaning up performance test data...');
    for (const { type, slug } of createdItems) {
      try {
        await deleteContent(type, slug);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Write Operation Performance', () => {
    it('should complete single content write within threshold', async () => {
      const slug = `perf-test-single-${testTimestamp}`;
      createdItems.push({ type: 'blog', slug });

      const data = {
        title: 'Performance Test Post',
        body: 'This is a test post for measuring write performance. ' + 
              'The content includes various data types and structures to simulate real usage.',
        author: 'Performance Tester',
        tags: ['performance', 'test', 'benchmark'],
        metadata: {
          version: 1,
          timestamp: new Date().toISOString(),
          metrics: {
            words: 100,
            readingTime: 1
          }
        }
      };

      const start = performance.now();
      const result = await updateContent('blog', slug, data);
      const duration = performance.now() - start;

      expect(result).toBeTruthy();
      expect(duration).toBeLessThan(performanceThresholds.singleWrite);
      console.log(`Single write completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle bulk writes efficiently', async () => {
      const itemCount = 10;
      const slugs = Array.from({ length: itemCount }, (_, i) => `perf-test-bulk-${testTimestamp}-${i}`);
      slugs.forEach(slug => createdItems.push({ type: 'events', slug }));

      const start = performance.now();
      
      const writePromises = slugs.map((slug, index) => 
        updateContent('events', slug, {
          title: `Performance Test Event ${index}`,
          date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Venue',
          capacity: 50 + index,
          description: 'A test event for performance benchmarking'
        })
      );

      const results = await Promise.all(writePromises);
      const duration = performance.now() - start;

      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(performanceThresholds.bulkWrite);
      console.log(`Bulk write of ${itemCount} items completed in ${duration.toFixed(2)}ms`);
      console.log(`Average per item: ${(duration / itemCount).toFixed(2)}ms`);
    });

    it('should perform upserts efficiently', async () => {
      const slug = `perf-test-upsert-${testTimestamp}`;
      createdItems.push({ type: 'announcements', slug });

      // Initial insert
      const insertData = {
        title: 'Initial Announcement',
        body: 'This will be updated',
        priority: 'normal'
      };

      const insertStart = performance.now();
      await updateContent('announcements', slug, insertData);
      const insertDuration = performance.now() - insertStart;

      // Update (upsert)
      const updateData = {
        title: 'Updated Announcement',
        body: 'This has been updated multiple times',
        priority: 'high',
        updateCount: 1
      };

      const updateStart = performance.now();
      const result = await updateContent('announcements', slug, updateData);
      const updateDuration = performance.now() - updateStart;

      expect(result?.data.title).toBe('Updated Announcement');
      expect(updateDuration).toBeLessThan(performanceThresholds.singleWrite);
      
      console.log(`Insert duration: ${insertDuration.toFixed(2)}ms`);
      console.log(`Update duration: ${updateDuration.toFixed(2)}ms`);
      
      // Updates should be roughly as fast as inserts
      expect(updateDuration).toBeLessThan(insertDuration * 1.5);
    });
  });

  describe('Delete Operation Performance', () => {
    it('should delete content quickly', async () => {
      const slug = `perf-test-delete-${testTimestamp}`;
      
      // Create content to delete
      await updateContent('blog', slug, {
        title: 'To Be Deleted',
        body: 'This content will be deleted'
      });

      const start = performance.now();
      const result = await deleteContent('blog', slug);
      const duration = performance.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(performanceThresholds.delete);
      console.log(`Delete completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle bulk deletes efficiently', async () => {
      const itemCount = 5;
      const slugs = Array.from({ length: itemCount }, (_, i) => `perf-test-bulk-delete-${testTimestamp}-${i}`);
      
      // Create items to delete
      await Promise.all(
        slugs.map(slug => 
          updateContent('announcements', slug, {
            title: `Delete Test ${slug}`,
            body: 'To be deleted'
          })
        )
      );

      const start = performance.now();
      const deletePromises = slugs.map(slug => deleteContent('announcements', slug));
      const results = await Promise.all(deletePromises);
      const duration = performance.now() - start;

      expect(results.every(r => r === true)).toBe(true);
      expect(duration).toBeLessThan(performanceThresholds.delete * itemCount);
      console.log(`Bulk delete of ${itemCount} items completed in ${duration.toFixed(2)}ms`);
      console.log(`Average per delete: ${(duration / itemCount).toFixed(2)}ms`);
    });
  });

  describe('Settings Performance', () => {
    it('should update settings quickly', async () => {
      const key = `perf-test-setting-${testTimestamp}`;

      const start = performance.now();
      await updateSetting(key, {
        testMode: true,
        timestamp: new Date().toISOString(),
        config: {
          option1: 'value1',
          option2: 42,
          option3: ['a', 'b', 'c']
        }
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(performanceThresholds.settingUpdate);
      console.log(`Setting update completed in ${duration.toFixed(2)}ms`);

      // Cleanup
      await updateSetting(key, null);
    });

    it('should handle rapid setting updates', async () => {
      const key = `perf-test-rapid-setting-${testTimestamp}`;
      const updateCount = 20;

      const start = performance.now();
      
      for (let i = 0; i < updateCount; i++) {
        await updateSetting(key, {
          iteration: i,
          timestamp: Date.now()
        });
      }
      
      const duration = performance.now() - start;
      const avgDuration = duration / updateCount;

      expect(avgDuration).toBeLessThan(performanceThresholds.settingUpdate);
      console.log(`${updateCount} rapid updates completed in ${duration.toFixed(2)}ms`);
      console.log(`Average per update: ${avgDuration.toFixed(2)}ms`);

      // Cleanup
      await updateSetting(key, null);
    });
  });

  describe('Mixed Operations Performance', () => {
    it('should handle mixed read/write operations efficiently', async () => {
      const testSlugs = Array.from({ length: 3 }, (_, i) => `perf-test-mixed-${testTimestamp}-${i}`);
      testSlugs.forEach(slug => createdItems.push({ type: 'blog', slug }));

      const operations = async () => {
        // Write operations
        await updateContent('blog', testSlugs[0], {
          title: 'Mixed Test 1',
          body: 'Content for mixed operations test'
        });

        // Read operation
        await getCollection('blog');

        // Another write
        await updateContent('blog', testSlugs[1], {
          title: 'Mixed Test 2',
          body: 'More content'
        });

        // Settings operations
        await updateSetting(`perf-mixed-${testTimestamp}`, { value: 'test' });
        await getAllSettings();

        // Update existing
        await updateContent('blog', testSlugs[0], {
          title: 'Mixed Test 1 - Updated',
          body: 'Updated content'
        });

        // Delete
        await deleteContent('blog', testSlugs[2]);
      };

      const start = performance.now();
      await operations();
      const duration = performance.now() - start;

      // Should complete all operations within reasonable time
      expect(duration).toBeLessThan(500); // 500ms for all operations
      console.log(`Mixed operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under load', async () => {
      const concurrentWrites = 20;
      const slugs = Array.from({ length: concurrentWrites }, (_, i) => `perf-stress-${testTimestamp}-${i}`);
      slugs.forEach(slug => createdItems.push({ type: 'events', slug }));

      const createLargeContent = (index: number) => ({
        title: `Stress Test Event ${index}`,
        description: 'Lorem ipsum dolor sit amet, '.repeat(50), // ~1.5KB
        schedule: {
          dates: Array.from({ length: 10 }, (_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
            startTime: '09:00',
            endTime: '17:00'
          })),
          recurring: true,
          exceptions: []
        },
        metadata: {
          tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
          categories: ['category1', 'category2', 'category3'],
          relatedEvents: slugs.slice(0, 5)
        }
      });

      const start = performance.now();
      
      const writePromises = slugs.map((slug, index) => 
        updateContent('events', slug, createLargeContent(index))
      );

      const results = await Promise.all(writePromises);
      const duration = performance.now() - start;

      expect(results.every(r => r !== null)).toBe(true);
      
      const avgDuration = duration / concurrentWrites;
      console.log(`Stress test: ${concurrentWrites} concurrent writes completed in ${duration.toFixed(2)}ms`);
      console.log(`Average per write under load: ${avgDuration.toFixed(2)}ms`);
      
      // Even under load, average should stay reasonable
      expect(avgDuration).toBeLessThan(performanceThresholds.singleWrite * 2);
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle large content without memory issues', async () => {
      const slug = `perf-memory-test-${testTimestamp}`;
      createdItems.push({ type: 'blog', slug });

      // Create a large content object (simulate a very long blog post)
      const largeContent = {
        title: 'Very Long Blog Post',
        body: 'A'.repeat(100000), // 100KB of text
        sections: Array.from({ length: 50 }, (_, i) => ({
          id: `section-${i}`,
          title: `Section ${i}`,
          content: 'B'.repeat(1000),
          metadata: {
            order: i,
            visible: true,
            lastModified: new Date().toISOString()
          }
        })),
        images: Array.from({ length: 20 }, (_, i) => ({
          id: `image-${i}`,
          url: `/images/blog/image-${i}.jpg`,
          alt: `Image ${i} description`,
          caption: `This is image number ${i}`
        }))
      };

      const memBefore = process.memoryUsage().heapUsed;
      const start = performance.now();

      const result = await updateContent('blog', slug, largeContent);
      
      const duration = performance.now() - start;
      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

      expect(result).toBeTruthy();
      console.log(`Large content write completed in ${duration.toFixed(2)}ms`);
      console.log(`Memory increase: ${memIncrease.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for this operation)
      expect(memIncrease).toBeLessThan(50);
    });
  });
});