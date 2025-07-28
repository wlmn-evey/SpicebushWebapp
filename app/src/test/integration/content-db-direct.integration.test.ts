import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import {
  getCollection,
  getEntry,
  getEntries,
  getSetting
} from '../../lib/content-db-direct';

const { Client } = pg;

// Skip these tests unless TEST_DB environment variable is set
const runIntegrationTests = process.env.TEST_DB === 'true';

describe.skipIf(!runIntegrationTests)('content-db-direct Integration Tests', () => {
  let testClient: pg.Client;
  
  beforeAll(async () => {
    // Set up test database connection using environment variables
    testClient = new Client({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '54322'),
      database: process.env.TEST_DB_NAME || 'postgres',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'test-password'
    });

    try {
      await testClient.connect();
      
      // Set up test data
      await testClient.query(`
        INSERT INTO content (slug, type, title, status, data, created_at)
        VALUES 
          ('test-post-1', 'blog', 'Test Post 1', 'published', '{"body": "Test content 1", "author": "Test Author"}', NOW()),
          ('test-post-2', 'blog', 'Test Post 2', 'published', '{"body": "Test content 2", "author": "Test Author"}', NOW() - INTERVAL '1 day'),
          ('draft-post', 'blog', 'Draft Post', 'draft', '{"body": "Draft content"}', NOW()),
          ('test-event', 'events', 'Test Event', 'published', '{"date": "2024-12-01", "location": "Test Location"}', NOW())
        ON CONFLICT (slug, type) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          data = EXCLUDED.data;
      `);

      await testClient.query(`
        INSERT INTO settings (key, value)
        VALUES 
          ('test-setting', '"test-value"'),
          ('test-object', '{"nested": {"value": true}}'),
          ('test-number', '42')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `);
    } catch (error) {
      console.error('Failed to set up test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (testClient) {
      // Clean up test data
      await testClient.query(`
        DELETE FROM content WHERE slug LIKE 'test-%' OR slug = 'draft-post';
      `);
      
      await testClient.query(`
        DELETE FROM settings WHERE key LIKE 'test-%';
      `);
      
      await testClient.end();
    }
  });

  describe('getCollection - Integration', () => {
    it('should fetch only published entries', async () => {
      const posts = await getCollection('blog');
      
      const testPosts = posts.filter(p => p.slug.startsWith('test-'));
      expect(testPosts).toHaveLength(2);
      expect(testPosts.every(p => p.slug !== 'draft-post')).toBe(true);
    });

    it('should order entries by created_at DESC', async () => {
      const posts = await getCollection('blog');
      
      const testPosts = posts.filter(p => p.slug.startsWith('test-'));
      expect(testPosts[0].slug).toBe('test-post-1');
      expect(testPosts[1].slug).toBe('test-post-2');
    });

    it('should properly structure returned data', async () => {
      const posts = await getCollection('blog');
      
      const testPost = posts.find(p => p.slug === 'test-post-1');
      expect(testPost).toBeDefined();
      expect(testPost).toMatchObject({
        id: 'test-post-1',
        slug: 'test-post-1',
        collection: 'blog',
        data: {
          title: 'Test Post 1',
          body: 'Test content 1',
          author: 'Test Author'
        },
        body: 'Test content 1'
      });
    });
  });

  describe('getEntry - Integration', () => {
    it('should fetch a specific entry', async () => {
      const entry = await getEntry('blog', 'test-post-1');
      
      expect(entry).toBeDefined();
      expect(entry?.slug).toBe('test-post-1');
      expect(entry?.data.title).toBe('Test Post 1');
    });

    it('should return null for non-existent entries', async () => {
      const entry = await getEntry('blog', 'non-existent');
      expect(entry).toBeNull();
    });

    it('should not return draft entries', async () => {
      const entry = await getEntry('blog', 'draft-post');
      expect(entry).toBeNull();
    });

    it('should handle different content types', async () => {
      const event = await getEntry('events', 'test-event');
      
      expect(event).toBeDefined();
      expect(event?.collection).toBe('events');
      expect(event?.data.date).toBe('2024-12-01');
      expect(event?.data.location).toBe('Test Location');
    });
  });

  describe('getEntries - Integration', () => {
    it('should filter entries correctly', async () => {
      const authorFilter = (entry: any) => 
        entry.data.author === 'Test Author';
      
      const entries = await getEntries('blog', authorFilter);
      const testEntries = entries.filter(e => e.slug.startsWith('test-'));
      
      expect(testEntries).toHaveLength(2);
      expect(testEntries.every(e => e.data.author === 'Test Author')).toBe(true);
    });

    it('should handle complex filters', async () => {
      const complexFilter = (entry: any) => 
        entry.slug.includes('1') && entry.data.body.includes('Test');
      
      const entries = await getEntries('blog', complexFilter);
      const testEntries = entries.filter(e => e.slug.startsWith('test-'));
      
      expect(testEntries).toHaveLength(1);
      expect(testEntries[0].slug).toBe('test-post-1');
    });
  });

  describe('getSetting - Integration', () => {
    it('should fetch string settings', async () => {
      const value = await getSetting('test-setting');
      expect(value).toBe('test-value');
    });

    it('should fetch object settings', async () => {
      const value = await getSetting('test-object');
      expect(value).toEqual({ nested: { value: true } });
    });

    it('should fetch number settings', async () => {
      const value = await getSetting('test-number');
      expect(value).toBe(42);
    });

    it('should return null for non-existent settings', async () => {
      const value = await getSetting('non-existent-setting');
      expect(value).toBeNull();
    });
  });

  describe('Connection Resilience - Integration', () => {
    it('should handle multiple rapid queries', async () => {
      const promises = [
        getCollection('blog'),
        getEntry('blog', 'test-post-1'),
        getSetting('test-setting'),
        getCollection('events'),
        getEntry('events', 'test-event')
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).toBeInstanceOf(Array);
      expect(results[1]?.slug).toBe('test-post-1');
      expect(results[2]).toBe('test-value');
      expect(results[3]).toBeInstanceOf(Array);
      expect(results[4]?.slug).toBe('test-event');
    });
  });
});