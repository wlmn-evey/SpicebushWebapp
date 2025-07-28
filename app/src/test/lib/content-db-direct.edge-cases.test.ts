import { describe, it, expect, beforeEach, vi } from 'vitest';
import pg from 'pg';
import {
  getCollection,
  getEntry,
  getEntries,
  getSetting
} from '../../lib/content-db-direct';

// Mock the pg module
vi.mock('pg', () => {
  const mockClient = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn()
  };
  
  return {
    default: {
      Client: vi.fn(() => mockClient)
    },
    Client: vi.fn(() => mockClient)
  };
});

describe('content-db-direct Edge Cases and Error Handling', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const ClientConstructor = (pg as any).Client;
    mockClient = new ClientConstructor();
    mockClient.connect.mockResolvedValueOnce(undefined);
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle malicious collection names', async () => {
      const maliciousInputs = [
        "blog'; DROP TABLE content; --",
        "blog' OR '1'='1",
        "blog\"; DELETE FROM content WHERE \"1\"=\"1",
        "blog`; UPDATE settings SET value='hacked'",
      ];

      for (const input of maliciousInputs) {
        mockClient.query.mockResolvedValueOnce({ rows: [] });
        
        await getCollection(input);
        
        // Verify parameterized query was used
        expect(mockClient.query).toHaveBeenCalledWith(
          'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
          [input, 'published']
        );
      }
    });

    it('should safely handle malicious slugs', async () => {
      const maliciousSlug = "test'; DELETE FROM content; --";
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await getEntry('blog', maliciousSlug);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
        ['blog', maliciousSlug, 'published']
      );
    });

    it('should safely handle malicious setting keys', async () => {
      const maliciousKey = "key'; DROP TABLE settings; --";
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await getSetting(maliciousKey);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT value FROM settings WHERE key = $1 LIMIT 1',
        [maliciousKey]
      );
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should handle null data fields gracefully', async () => {
      const rowWithNulls = {
        slug: 'test-post',
        type: 'blog',
        title: null,
        status: 'published',
        data: null,
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [rowWithNulls] });

      const result = await getEntry('blog', 'test-post');

      expect(result).toBeDefined();
      expect(result?.data).toEqual({ title: null });
      expect(result?.body).toBe('');
    });

    it('should handle undefined data properties', async () => {
      const rowWithUndefined = {
        slug: 'test-post',
        type: 'blog',
        title: 'Test Post',
        status: 'published',
        // data is undefined
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [rowWithUndefined] });

      const result = await getEntry('blog', 'test-post');

      expect(result).toBeDefined();
      expect(result?.data).toEqual({ title: 'Test Post' });
      expect(result?.body).toBe('');
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle large collections efficiently', async () => {
      const largeDataset = Array(10000).fill(null).map((_, i) => ({
        slug: `post-${i}`,
        type: 'blog',
        title: `Post ${i}`,
        status: 'published',
        data: { body: `Content for post ${i}` },
        created_at: new Date()
      }));

      mockClient.query.mockResolvedValueOnce({ rows: largeDataset });

      const result = await getCollection('blog');

      expect(result).toHaveLength(10000);
      expect(result[0].slug).toBe('post-0');
      expect(result[9999].slug).toBe('post-9999');
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        slug: 'complex-post',
        type: 'blog',
        title: 'Complex Post',
        status: 'published',
        data: {
          body: 'Content',
          metadata: {
            author: {
              name: 'John Doe',
              bio: 'Author bio',
              social: {
                twitter: '@johndoe',
                linkedin: 'john-doe'
              }
            },
            tags: ['javascript', 'typescript', 'testing'],
            relatedPosts: [
              { id: 1, title: 'Related 1' },
              { id: 2, title: 'Related 2' }
            ]
          },
          settings: {
            commentsEnabled: true,
            shareButtons: ['twitter', 'facebook', 'linkedin']
          }
        },
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [complexData] });

      const result = await getEntry('blog', 'complex-post');

      expect(result?.data.metadata.author.name).toBe('John Doe');
      expect(result?.data.metadata.tags).toHaveLength(3);
      expect(result?.data.settings.commentsEnabled).toBe(true);
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle UTF-8 characters correctly', async () => {
      const unicodeData = {
        slug: 'unicode-post',
        type: 'blog',
        title: '🚀 Unicode Test 测试 тест',
        status: 'published',
        data: {
          body: 'Emojis: 😀 😃 😄 😁\nChinese: 你好世界\nCyrillic: Привет мир',
          author: 'José García'
        },
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [unicodeData] });

      const result = await getEntry('blog', 'unicode-post');

      expect(result?.data.title).toBe('🚀 Unicode Test 测试 тест');
      expect(result?.data.body).toContain('😀 😃 😄 😁');
      expect(result?.data.author).toBe('José García');
    });

    it('should handle special HTML characters', async () => {
      const htmlData = {
        slug: 'html-post',
        type: 'blog',
        title: 'HTML & Special <Characters>',
        status: 'published',
        data: {
          body: '<p>This is a "test" with \'quotes\' & <tags></p>'
        },
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [htmlData] });

      const result = await getEntry('blog', 'html-post');

      expect(result?.data.title).toBe('HTML & Special <Characters>');
      expect(result?.data.body).toContain('<p>');
      expect(result?.data.body).toContain('&');
    });
  });

  describe('Database Type Conversions', () => {
    it('should handle various PostgreSQL data types', async () => {
      const mixedTypes = {
        slug: 'mixed-types',
        type: 'test',
        title: 'Mixed Types Test',
        status: 'published',
        data: {
          boolean: true,
          number: 42,
          float: 3.14159,
          bigint: '9007199254740991',
          date: new Date('2024-01-01'),
          array: [1, 2, 3],
          null: null,
          object: { nested: true }
        },
        created_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mixedTypes] });

      const result = await getEntry('test', 'mixed-types');

      expect(result?.data.boolean).toBe(true);
      expect(result?.data.number).toBe(42);
      expect(result?.data.float).toBe(3.14159);
      expect(result?.data.bigint).toBe('9007199254740991');
      expect(result?.data.date).toBeInstanceOf(Date);
      expect(result?.data.array).toEqual([1, 2, 3]);
      expect(result?.data.null).toBeNull();
      expect(result?.data.object.nested).toBe(true);
    });
  });

  describe('Filter Function Edge Cases', () => {
    it('should handle filter functions that throw errors', async () => {
      const mockData = [
        { slug: 'post-1', type: 'blog', title: 'Post 1', status: 'published', data: {} }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockData });

      const errorFilter = () => {
        throw new Error('Filter error');
      };

      await expect(getEntries('blog', errorFilter)).rejects.toThrow('Filter error');
    });

    it('should handle async filter functions', async () => {
      const mockData = [
        { slug: 'post-1', type: 'blog', title: 'Post 1', status: 'published', data: { score: 5 } },
        { slug: 'post-2', type: 'blog', title: 'Post 2', status: 'published', data: { score: 3 } }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockData });

      // Note: The current implementation doesn't support async filters
      // This test documents the current behavior
      const asyncFilter = async (entry: any) => entry.data.score > 4;

      const result = await getEntries('blog', asyncFilter as any);
      
      // Since async functions return promises, they'll all be truthy
      expect(result).toHaveLength(2);
    });
  });

  describe('Connection State Edge Cases', () => {
    it('should handle connection timeout', async () => {
      mockClient.connect.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      await expect(getCollection('blog')).rejects.toThrow('Unable to connect to content database');
    });

    it('should handle query timeout', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      mockClient.query.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 100)
        )
      );

      const result = await getCollection('blog');
      expect(result).toEqual([]);
    });

    it('should handle database disconnection between queries', async () => {
      // First query succeeds
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      await getCollection('blog');

      // Simulate disconnection
      mockClient.query.mockRejectedValueOnce(new Error('Connection terminated'));

      // Should handle error gracefully
      const result = await getCollection('events');
      expect(result).toEqual([]);
    });
  });
});