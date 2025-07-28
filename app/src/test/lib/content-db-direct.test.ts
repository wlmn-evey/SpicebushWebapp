import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, Mock } from 'vitest';
import pg from 'pg';
import {
  getCollection,
  getEntry,
  getEntries,
  getSetting,
  ContentEntry
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

describe('content-db-direct', () => {
  let mockClient: any;
  let originalConsoleError: typeof console.error;
  let consoleErrorMock: Mock;

  beforeAll(() => {
    // Store the original console.error
    originalConsoleError = console.error;
    // Create a mock for console.error
    consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mocked client instance
    const ClientConstructor = (pg as any).Client;
    mockClient = new ClientConstructor();
    
    // Reset the console error mock
    consoleErrorMock.mockClear();
  });

  describe('Database Connection', () => {
    it('should establish connection on first query', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await getCollection('blog');

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing connection for subsequent queries', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      mockClient.query.mockResolvedValue({ rows: [] });

      await getCollection('blog');
      await getCollection('events');
      await getSetting('test');

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection refused');
      mockClient.connect.mockRejectedValueOnce(connectionError);

      await expect(getCollection('blog')).rejects.toThrow('Unable to connect to content database');
      expect(consoleErrorMock).toHaveBeenCalledWith('Database connection error:', connectionError);
    });
  });

  describe('getCollection', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should fetch all published entries from a collection', async () => {
      const mockRows = [
        {
          slug: 'post-1',
          type: 'blog',
          title: 'First Post',
          status: 'published',
          data: { body: 'Post content', author: 'John' },
          created_at: new Date('2024-01-01')
        },
        {
          slug: 'post-2',
          type: 'blog',
          title: 'Second Post',
          status: 'published',
          data: { body: 'Another post', author: 'Jane' },
          created_at: new Date('2024-01-02')
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await getCollection('blog');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
        ['blog', 'published']
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'post-1',
        slug: 'post-1',
        collection: 'blog',
        data: { body: 'Post content', author: 'John', title: 'First Post' },
        body: 'Post content'
      });
    });

    it('should handle entries without body field', async () => {
      const mockRows = [
        {
          slug: 'event-1',
          type: 'events',
          title: 'Summer Camp',
          status: 'published',
          data: { date: '2024-07-01' },
          created_at: new Date('2024-01-01')
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await getCollection('events');

      expect(result[0].body).toBe('');
    });

    it('should return empty array on query error', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(queryError);

      const result = await getCollection('blog');

      expect(result).toEqual([]);
      expect(consoleErrorMock).toHaveBeenCalledWith('Error fetching blog:', queryError);
    });

    it('should handle different content types correctly', async () => {
      const contentTypes = ['blog', 'events', 'announcements', 'staff', 'tuition'];

      for (const type of contentTypes) {
        mockClient.query.mockResolvedValueOnce({ rows: [] });
        
        await getCollection(type);
        
        expect(mockClient.query).toHaveBeenCalledWith(
          'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
          [type, 'published']
        );
      }
    });
  });

  describe('getEntry', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should fetch a single entry by collection and slug', async () => {
      const mockRow = {
        slug: 'summer-camp',
        type: 'events',
        title: 'Summer Camp 2024',
        status: 'published',
        data: { 
          body: 'Join us for summer camp!',
          date: '2024-07-01',
          location: 'Main Campus'
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getEntry('events', 'summer-camp');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
        ['events', 'summer-camp', 'published']
      );

      expect(result).toEqual({
        id: 'summer-camp',
        slug: 'summer-camp',
        collection: 'events',
        data: {
          body: 'Join us for summer camp!',
          date: '2024-07-01',
          location: 'Main Campus',
          title: 'Summer Camp 2024'
        },
        body: 'Join us for summer camp!'
      });
    });

    it('should return null when entry is not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getEntry('blog', 'non-existent-post');

      expect(result).toBeNull();
    });

    it('should handle query errors and return null', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(queryError);

      const result = await getEntry('blog', 'test-post');

      expect(result).toBeNull();
      expect(consoleErrorMock).toHaveBeenCalledWith('Error fetching blog/test-post:', queryError);
    });

    it('should handle special characters in slugs', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await getEntry('blog', 'post-with-special-chars-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
        ['blog', 'post-with-special-chars-123', 'published']
      );
    });
  });

  describe('getEntries', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should filter entries based on provided function', async () => {
      const mockRows = [
        {
          slug: 'post-1',
          type: 'blog',
          title: 'JavaScript Tips',
          status: 'published',
          data: { tags: ['javascript', 'tips'] }
        },
        {
          slug: 'post-2',
          type: 'blog',
          title: 'TypeScript Guide',
          status: 'published',
          data: { tags: ['typescript', 'guide'] }
        },
        {
          slug: 'post-3',
          type: 'blog',
          title: 'React Best Practices',
          status: 'published',
          data: { tags: ['react', 'javascript'] }
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockRows });

      const filter = (entry: ContentEntry) => 
        entry.data.tags && entry.data.tags.includes('javascript');

      const result = await getEntries('blog', filter);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('post-1');
      expect(result[1].slug).toBe('post-3');
    });

    it('should return empty array when no entries match filter', async () => {
      const mockRows = [
        {
          slug: 'post-1',
          type: 'blog',
          title: 'Post 1',
          status: 'published',
          data: { category: 'tech' }
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockRows });

      const filter = (entry: ContentEntry) => entry.data.category === 'food';

      const result = await getEntries('blog', filter);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSetting', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should fetch a setting value by key', async () => {
      const mockRow = {
        key: 'site_title',
        value: 'Spicebush Montessori'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getSetting('site_title');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT value FROM settings WHERE key = $1 LIMIT 1',
        ['site_title']
      );

      expect(result).toBe('Spicebush Montessori');
    });

    it('should return null when setting is not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getSetting('non_existent_setting');

      expect(result).toBeNull();
    });

    it('should handle complex setting values', async () => {
      const complexValue = {
        enabled: true,
        config: {
          theme: 'dark',
          language: 'en'
        }
      };

      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ value: complexValue }] 
      });

      const result = await getSetting('app_config');

      expect(result).toEqual(complexValue);
    });

    it('should handle query errors and return null', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(queryError);

      const result = await getSetting('test_setting');

      expect(result).toBeNull();
      expect(consoleErrorMock).toHaveBeenCalledWith('Error fetching setting test_setting:', queryError);
    });

    it('should fetch various setting types', async () => {
      const settingKeys = [
        'coming-soon-mode',
        'coming-soon-message',
        'current-school-year',
        'annual-increase-rate',
        'sibling-discount-rate'
      ];

      for (const key of settingKeys) {
        mockClient.query.mockResolvedValueOnce({ rows: [{ value: 'test-value' }] });
        
        await getSetting(key);
        
        expect(mockClient.query).toHaveBeenCalledWith(
          'SELECT value FROM settings WHERE key = $1 LIMIT 1',
          [key]
        );
      }
    });
  });

  describe('Data Format Validation', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should ensure ContentEntry matches expected structure', async () => {
      const mockRow = {
        slug: 'test-entry',
        type: 'blog',
        title: 'Test Entry',
        status: 'published',
        data: { 
          body: 'Content body',
          extra: 'Extra field'
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getEntry('blog', 'test-entry');

      // Validate the structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('slug');
      expect(result).toHaveProperty('collection');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('body');

      // Validate data types
      expect(typeof result!.id).toBe('string');
      expect(typeof result!.slug).toBe('string');
      expect(typeof result!.collection).toBe('string');
      expect(typeof result!.data).toBe('object');
      expect(typeof result!.body).toBe('string');

      // Validate data merging
      expect(result!.data.title).toBe('Test Entry');
      expect(result!.data.body).toBe('Content body');
      expect(result!.data.extra).toBe('Extra field');
    });
  });

  describe('Process Cleanup', () => {
    it('should handle SIGINT gracefully', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.end.mockResolvedValueOnce(undefined);

      // Make a query to establish connection
      await getCollection('blog');

      // Get the SIGINT handler
      const sigintListeners = process.listeners('SIGINT');
      const ourHandler = sigintListeners[sigintListeners.length - 1];

      // Mock process.exit to prevent test from actually exiting
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit called');
      });

      // Call the handler and expect it to throw our mocked error
      await expect(async () => {
        await ourHandler();
      }).rejects.toThrow('Process exit called');

      expect(mockClient.end).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith();

      mockExit.mockRestore();
    });
  });
});