import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCollection, getEntry, DATABASE_COLLECTIONS } from '../src/lib/content-db-direct';
import pg from 'pg';

// Mock the pg module
vi.mock('pg');

// Mock the error logger to avoid console noise
vi.mock('../src/lib/error-logger', () => ({
  logError: vi.fn()
}));

describe('Bug #048: Performance Fix - Whitelisting Logic', () => {
  let mockClient: any;
  let mockQuery: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // Setup mock client
    mockQuery = vi.fn();
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: mockQuery,
      end: vi.fn()
    };
    
    // Mock the Client constructor
    vi.mocked(pg.Client).mockImplementation(() => mockClient);
    
    // Mock environment variables
    process.env.DB_READONLY_USER = 'test_user';
    process.env.DB_READONLY_PASSWORD = 'test_password';
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear module cache to ensure fresh state
    vi.resetModules();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DB_READONLY_USER;
    delete process.env.DB_READONLY_PASSWORD;
  });
  
  describe('Whitelisting Logic', () => {
    it('should define the correct database collections', () => {
      expect(DATABASE_COLLECTIONS).toEqual([
        'blog',
        'staff', 
        'announcements',
        'events',
        'tuition',
        'settings',
        'hours',
        'testimonials',
        'school-info'
      ]);
    });
    
    it('should NOT include markdown-only collections', () => {
      expect(DATABASE_COLLECTIONS).not.toContain('photos');
      expect(DATABASE_COLLECTIONS).not.toContain('coming-soon');
    });
  });
  
  describe('getCollection Performance', () => {
    it('should return empty array for non-database collections without querying', async () => {
      const result = await getCollection('photos');
      
      // Should not attempt to connect or query
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
      
      // Should return empty array
      expect(result).toEqual([]);
      
      // Should log that it's not database-backed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Collection 'photos' is not database-backed, returning empty array"
      );
    });
    
    it('should return empty array for coming-soon collection without querying', async () => {
      const result = await getCollection('coming-soon');
      
      // Should not attempt to connect or query
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
      
      // Should return empty array
      expect(result).toEqual([]);
      
      // Should log that it's not database-backed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Collection 'coming-soon' is not database-backed, returning empty array"
      );
    });
    
    it('should query database for whitelisted collections', async () => {
      // Setup mock response
      mockQuery.mockResolvedValue({
        rows: [
          {
            slug: 'test-post',
            type: 'blog',
            title: 'Test Blog Post',
            data: { body: 'Test content' }
          }
        ]
      });
      
      const result = await getCollection('blog');
      
      // Should connect and query
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
        ['blog', 'published']
      );
      
      // Should return formatted entries
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'test-post',
        slug: 'test-post',
        collection: 'blog',
        data: { body: 'Test content', title: 'Test Blog Post' },
        body: 'Test content'
      });
    });
  });
  
  describe('getEntry Performance', () => {
    it('should return null for non-database collections without querying', async () => {
      const result = await getEntry('photos', 'summer-camp-2024');
      
      // Should not attempt to connect or query
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
      
      // Should return null
      expect(result).toBeNull();
      
      // Should log that it's not database-backed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Collection 'photos' is not database-backed, returning null for entry 'summer-camp-2024'"
      );
    });
    
    it('should query database for whitelisted collection entries', async () => {
      // Setup mock response
      mockQuery.mockResolvedValue({
        rows: [
          {
            slug: 'test-staff',
            type: 'staff',
            title: 'Test Staff Member',
            data: { role: 'Teacher' }
          }
        ]
      });
      
      const result = await getEntry('staff', 'test-staff');
      
      // Should connect and query
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
        ['staff', 'test-staff', 'published']
      );
      
      // Should return formatted entry
      expect(result).toEqual({
        id: 'test-staff',
        slug: 'test-staff',
        collection: 'staff',
        data: { role: 'Teacher', title: 'Test Staff Member' },
        body: ''
      });
    });
  });
  
  describe('Performance Characteristics', () => {
    it('should handle multiple non-database collection requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make multiple requests for non-database collections
      await Promise.all([
        getCollection('photos'),
        getCollection('coming-soon'),
        getEntry('photos', 'test-1'),
        getEntry('photos', 'test-2'),
        getEntry('coming-soon', 'test-3')
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete very quickly (no database calls)
      expect(duration).toBeLessThan(100); // Should be near-instant
      
      // Should never attempt database connection
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
    
    it('should only connect to database once for multiple whitelisted queries', async () => {
      // Setup mock responses
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // First blog query
        .mockResolvedValueOnce({ rows: [] }) // First staff query
        .mockResolvedValueOnce({ rows: [] }); // Second blog query
      
      // Make multiple requests
      await getCollection('blog');
      await getCollection('staff');
      await getEntry('blog', 'test-post');
      
      // Should only connect once (connection reuse)
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      
      // Should make all three queries
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Error Handling', () => {
    it('should not log database errors for non-database collections', async () => {
      await getCollection('photos');
      await getEntry('coming-soon', 'test');
      
      // Should not log any errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    
    it('should handle database errors gracefully for whitelisted collections', async () => {
      // Mock a database error
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await getCollection('blog');
      
      // Should return empty array on error
      expect(result).toEqual([]);
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching blog:',
        expect.any(Error)
      );
    });
  });
});