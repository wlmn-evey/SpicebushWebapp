import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, Mock } from 'vitest';
import pg from 'pg';
import {
  getCollection,
  getEntry,
  getEntries,
  getSetting,
  ContentEntry,
  updateContent,
  deleteContent,
  updateSetting
} from '@lib/content-db-direct';

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

  describe('updateContent', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should insert new content entry', async () => {
      const newContent = {
        title: 'New Blog Post',
        body: 'This is a new blog post content',
        author: 'Jane Doe',
        tags: ['news', 'update']
      };

      const mockRow = {
        slug: 'new-blog-post',
        type: 'blog',
        title: 'New Blog Post',
        status: 'published',
        data: {
          body: 'This is a new blog post content',
          author: 'Jane Doe',
          tags: ['news', 'update']
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await updateContent('blog', 'new-blog-post', newContent);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO content'),
        ['blog', 'new-blog-post', 'New Blog Post', {
          body: 'This is a new blog post content',
          author: 'Jane Doe',
          tags: ['news', 'update']
        }, 'published']
      );

      expect(result).toEqual({
        id: 'new-blog-post',
        slug: 'new-blog-post',
        collection: 'blog',
        data: {
          body: 'This is a new blog post content',
          author: 'Jane Doe',
          tags: ['news', 'update'],
          title: 'New Blog Post'
        },
        body: 'This is a new blog post content'
      });
    });

    it('should update existing content entry (upsert)', async () => {
      const updatedContent = {
        title: 'Updated Blog Post',
        body: 'This content has been updated',
        author: 'John Smith',
        tags: ['updated', 'modified']
      };

      const mockRow = {
        slug: 'existing-post',
        type: 'blog',
        title: 'Updated Blog Post',
        status: 'published',
        data: {
          body: 'This content has been updated',
          author: 'John Smith',
          tags: ['updated', 'modified']
        },
        created_at: new Date('2024-01-01'),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await updateContent('blog', 'existing-post', updatedContent);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (type, slug)'),
        ['blog', 'existing-post', 'Updated Blog Post', {
          body: 'This content has been updated',
          author: 'John Smith',
          tags: ['updated', 'modified']
        }, 'published']
      );

      expect(result?.data.title).toBe('Updated Blog Post');
      expect(result?.data.author).toBe('John Smith');
    });

    it('should handle content without title', async () => {
      const contentWithoutTitle = {
        body: 'Content without explicit title',
        metadata: { type: 'note' }
      };

      const mockRow = {
        slug: 'untitled-content',
        type: 'notes',
        title: '',
        status: 'published',
        data: {
          body: 'Content without explicit title',
          metadata: { type: 'note' }
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await updateContent('notes', 'untitled-content', contentWithoutTitle);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO content'),
        ['notes', 'untitled-content', '', {
          body: 'Content without explicit title',
          metadata: { type: 'note' }
        }, 'published']
      );

      expect(result?.data.title).toBe('');
    });

    it('should throw error on database failure', async () => {
      const queryError = new Error('Database constraint violation');
      mockClient.query.mockRejectedValueOnce(queryError);

      await expect(
        updateContent('blog', 'test-post', { title: 'Test', body: 'Content' })
      ).rejects.toThrow('Database constraint violation');

      expect(consoleErrorMock).toHaveBeenCalledWith(
        '[content-db-direct] Error:',
        queryError
      );
    });

    it('should return null when no rows returned', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateContent('blog', 'empty-result', { title: 'Test' });

      expect(result).toBeNull();
    });

    it('should handle complex nested data structures', async () => {
      const complexContent = {
        title: 'Complex Event',
        schedule: {
          start: '2024-07-01T09:00:00',
          end: '2024-07-01T17:00:00',
          recurring: true,
          pattern: { type: 'weekly', days: ['monday', 'wednesday'] }
        },
        registration: {
          required: true,
          fee: 50,
          spots: 20
        }
      };

      const mockRow = {
        slug: 'complex-event',
        type: 'events',
        title: 'Complex Event',
        status: 'published',
        data: {
          schedule: complexContent.schedule,
          registration: complexContent.registration
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await updateContent('events', 'complex-event', complexContent);

      expect(result?.data.schedule).toEqual(complexContent.schedule);
      expect(result?.data.registration).toEqual(complexContent.registration);
    });
  });

  describe('deleteContent', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should delete existing content entry', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await deleteContent('blog', 'post-to-delete');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM content WHERE type = $1 AND slug = $2',
        ['blog', 'post-to-delete']
      );

      expect(result).toBe(true);
    });

    it('should return false when no entry found to delete', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await deleteContent('blog', 'non-existent-post');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      const queryError = new Error('Foreign key constraint violation');
      mockClient.query.mockRejectedValueOnce(queryError);

      await expect(
        deleteContent('blog', 'protected-post')
      ).rejects.toThrow('Foreign key constraint violation');

      expect(consoleErrorMock).toHaveBeenCalledWith(
        '[content-db-direct] Error:',
        queryError
      );
    });

    it('should handle special characters in collection and slug', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await deleteContent('special-collection', 'slug-with-special-chars-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM content WHERE type = $1 AND slug = $2',
        ['special-collection', 'slug-with-special-chars-123']
      );
    });

    it('should work with different content types', async () => {
      const contentTypes = ['blog', 'events', 'announcements', 'staff'];

      for (const type of contentTypes) {
        mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
        
        const result = await deleteContent(type, `test-${type}`);
        
        expect(mockClient.query).toHaveBeenCalledWith(
          'DELETE FROM content WHERE type = $1 AND slug = $2',
          [type, `test-${type}`]
        );
        expect(result).toBe(true);
      }
    });
  });

  describe('updateSetting', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should insert new setting', async () => {
      await updateSetting('new-setting', 'initial value');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        ['new-setting', 'initial value']
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (key)'),
        ['new-setting', 'initial value']
      );
    });

    it('should update existing setting (upsert)', async () => {
      await updateSetting('site_title', 'Updated Site Title');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (key)'),
        ['site_title', 'Updated Site Title']
      );
    });

    it('should handle boolean values', async () => {
      await updateSetting('coming-soon-mode', true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        ['coming-soon-mode', true]
      );
    });

    it('should handle numeric values', async () => {
      await updateSetting('annual-increase-rate', 0.03);
      await updateSetting('sibling-discount-rate', 0.1);

      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('INSERT INTO settings'),
        ['annual-increase-rate', 0.03]
      );

      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO settings'),
        ['sibling-discount-rate', 0.1]
      );
    });

    it('should handle complex object values', async () => {
      const complexConfig = {
        theme: {
          colors: {
            primary: '#007bff',
            secondary: '#6c757d'
          },
          fonts: {
            heading: 'Arial',
            body: 'Helvetica'
          }
        },
        features: {
          darkMode: true,
          animations: false
        }
      };

      await updateSetting('site-config', complexConfig);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        ['site-config', complexConfig]
      );
    });

    it('should handle array values', async () => {
      const allowedDomains = ['example.com', 'test.com', 'localhost'];

      await updateSetting('allowed-domains', allowedDomains);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        ['allowed-domains', allowedDomains]
      );
    });

    it('should handle null values', async () => {
      await updateSetting('optional-setting', null);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        ['optional-setting', null]
      );
    });

    it('should throw error on database failure', async () => {
      const queryError = new Error('Unique constraint violation');
      mockClient.query.mockRejectedValueOnce(queryError);

      await expect(
        updateSetting('protected-key', 'value')
      ).rejects.toThrow('Unique constraint violation');

      expect(consoleErrorMock).toHaveBeenCalledWith(
        '[content-db-direct] Error:',
        queryError
      );
    });

    it('should handle special characters in keys', async () => {
      await updateSetting('special-key-with-dashes', 'value');
      await updateSetting('key_with_underscores', 'value');

      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('INSERT INTO settings'),
        ['special-key-with-dashes', 'value']
      );

      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO settings'),
        ['key_with_underscores', 'value']
      );
    });
  });

  describe('Write Functions Integration', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should handle create, update, and delete workflow', async () => {
      // Create new content
      const createData = {
        title: 'Integration Test Post',
        body: 'Initial content'
      };

      const createdRow = {
        slug: 'integration-test',
        type: 'blog',
        title: 'Integration Test Post',
        status: 'published',
        data: { body: 'Initial content' }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [createdRow] });
      const created = await updateContent('blog', 'integration-test', createData);
      expect(created?.data.title).toBe('Integration Test Post');

      // Update the content
      const updateData = {
        title: 'Updated Integration Test',
        body: 'Updated content',
        lastModified: new Date().toISOString()
      };

      const updatedRow = {
        ...createdRow,
        title: 'Updated Integration Test',
        data: { body: 'Updated content', lastModified: updateData.lastModified }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [updatedRow] });
      const updated = await updateContent('blog', 'integration-test', updateData);
      expect(updated?.data.title).toBe('Updated Integration Test');

      // Delete the content
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      const deleted = await deleteContent('blog', 'integration-test');
      expect(deleted).toBe(true);
    });

    it('should handle concurrent updates without connection issues', async () => {
      const promises = [];

      // Simulate multiple concurrent updates
      for (let i = 0; i < 5; i++) {
        mockClient.query.mockResolvedValueOnce({
          rows: [{
            slug: `concurrent-${i}`,
            type: 'blog',
            title: `Concurrent Post ${i}`,
            status: 'published',
            data: { index: i }
          }]
        });

        promises.push(
          updateContent('blog', `concurrent-${i}`, {
            title: `Concurrent Post ${i}`,
            index: i
          })
        );
      }

      const results = await Promise.all(promises);

      // Should only connect once
      expect(mockClient.connect).toHaveBeenCalledTimes(1);

      // All updates should succeed
      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result?.slug).toBe(`concurrent-${i}`);
      });
    });

    it('should maintain data integrity during mixed operations', async () => {
      // Update a setting
      mockClient.query.mockResolvedValueOnce(undefined);
      await updateSetting('test-mode', true);

      // Create content that references the setting
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          slug: 'test-content',
          type: 'announcements',
          title: 'Test Announcement',
          status: 'published',
          data: { important: true }
        }]
      });

      const content = await updateContent('announcements', 'test-content', {
        title: 'Test Announcement',
        important: true
      });

      // Verify both operations used the same connection
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(content?.data.important).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      mockClient.connect.mockResolvedValueOnce(undefined);
    });

    it('should handle empty data objects', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          slug: 'empty-data',
          type: 'blog',
          title: 'Empty',
          status: 'published',
          data: {}
        }]
      });

      const result = await updateContent('blog', 'empty-data', { title: 'Empty' });
      expect(result?.data).toEqual({ title: 'Empty' });
    });

    it('should handle very long content', async () => {
      const longContent = 'x'.repeat(10000);
      const data = {
        title: 'Long Post',
        body: longContent
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          slug: 'long-post',
          type: 'blog',
          title: 'Long Post',
          status: 'published',
          data: { body: longContent }
        }]
      });

      const result = await updateContent('blog', 'long-post', data);
      expect(result?.data.body).toHaveLength(10000);
    });

    it('should handle special SQL characters in content', async () => {
      const data = {
        title: "Post with 'quotes' and \"double quotes\"",
        body: 'Content with $1 and $2 placeholders; DROP TABLE content;--'
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          slug: 'sql-test',
          type: 'blog',
          title: data.title,
          status: 'published',
          data: { body: data.body }
        }]
      });

      const result = await updateContent('blog', 'sql-test', data);
      
      // Verify parameterized queries protect against SQL injection
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        ['blog', 'sql-test', data.title, { body: data.body }, 'published']
      );
      
      expect(result?.data.title).toBe(data.title);
      expect(result?.data.body).toBe(data.body);
    });
  });
});