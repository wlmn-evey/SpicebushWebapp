/**
 * Unit Tests for Media Storage System
 * 
 * Tests the media storage functionality including:
 * - File validation
 * - Local storage operations
 * - Storage provider switching
 * - Configuration management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Mock file system operations
vi.mock('fs/promises');
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'abcd1234')
  }))
}));

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    insert: vi.fn()
  }))
};

vi.mock('@lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

describe('Media Storage System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('File Validation', () => {
    it('should validate allowed file types', async () => {
      const { validateFile } = await import('@lib/media-storage');
      
      // Test allowed image types
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      for (const mimetype of imageTypes) {
        const result = await validateFile({
          mimetype,
          size: 1024 * 1024 // 1MB
        });
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject disallowed file types', async () => {
      const { validateFile } = await import('@lib/media-storage');
      
      const disallowedTypes = ['video/mp4', 'audio/mp3', 'text/plain', 'application/zip'];
      
      for (const mimetype of disallowedTypes) {
        const result = await validateFile({
          mimetype,
          size: 1024 * 1024 // 1MB
        });
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File type not allowed');
      }
    });

    it('should validate file size limits', async () => {
      const { validateFile } = await import('@lib/media-storage');
      
      // Test file within limit
      const validResult = await validateFile({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 // 5MB
      });
      
      expect(validResult.valid).toBe(true);
      
      // Test file exceeding limit
      const invalidResult = await validateFile({
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024 // 15MB (exceeds 10MB limit)
      });
      
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('File too large');
    });

    it('should allow PDF files', async () => {
      const { validateFile } = await import('@lib/media-storage');
      
      const result = await validateFile({
        mimetype: 'application/pdf',
        size: 2 * 1024 * 1024 // 2MB
      });
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Storage Provider Configuration', () => {
    it('should return local storage by default', async () => {
      // Mock empty settings
      mockSupabaseClient.from().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const { getStorageProvider } = await import('@lib/media-storage');
      const storage = await getStorageProvider();
      
      expect(storage).toBeDefined();
      // Since we can't directly test the class type, we test behavior
      expect(typeof storage.upload).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.getUrl).toBe('function');
    });

    it('should cache storage settings', async () => {
      mockSupabaseClient.from().eq.mockResolvedValue({
        data: [
          { setting_key: 'storage_provider', setting_value: 'local' },
          { setting_key: 'max_file_size', setting_value: '5' }
        ],
        error: null
      });

      const { getStorageProvider } = await import('@lib/media-storage');
      
      // First call
      await getStorageProvider();
      
      // Second call should use cache
      await getStorageProvider();
      
      // Should only query database once
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().eq.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { getStorageProvider } = await import('@lib/media-storage');
      const storage = await getStorageProvider();
      
      // Should fallback to local storage
      expect(storage).toBeDefined();
    });
  });

  describe('Media Upload Handler', () => {
    beforeEach(() => {
      // Mock successful file system operations
      (fs.access as any).mockResolvedValue(undefined);
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);
      
      // Mock successful database insert
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });
    });

    it('should successfully upload valid files', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.url).toMatch(/^\/uploads\/\d+-\w+\.jpg$/);
      expect(result.error).toBeUndefined();
    });

    it('should reject files with invalid types', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File type not allowed');
      expect(result.url).toBeUndefined();
    });

    it('should reject oversized files', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024 // 20MB
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large');
    });

    it('should handle database insertion errors', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      // Mock database error
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle file system errors', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      // Mock file system error
      (fs.writeFile as any).mockRejectedValue(new Error('Disk full'));
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should generate unique filenames', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      // Upload same file twice
      const result1 = await handleMediaUpload(testFile, 'user@example.com');
      const result2 = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.url).not.toBe(result2.url);
    });

    it('should save correct metadata to database', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'beautiful-sunset.jpg',
        mimetype: 'image/jpeg',
        size: 2048
      };
      
      const userId = 'admin@spicebush.org';
      
      await handleMediaUpload(testFile, userId);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        filename: 'beautiful-sunset.jpg',
        url: expect.stringMatching(/^\/uploads\/\d+-\w+\.jpg$/),
        size: 2048,
        mimetype: 'image/jpeg',
        uploaded_by: userId,
        storage_path: expect.any(String)
      });
    });
  });

  describe('Directory Management', () => {
    it('should create upload directory if it does not exist', async () => {
      // Mock directory doesn't exist
      (fs.access as any).mockRejectedValue(new Error('Directory not found'));
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);
      
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      await handleMediaUpload(testFile, 'user@example.com');
      
      expect(fs.mkdir).toHaveBeenCalledWith('./public/uploads', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      // Mock directory exists
      (fs.access as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);
      
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      await handleMediaUpload(testFile, 'user@example.com');
      
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('File Extension Handling', () => {
    it('should preserve file extensions', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const extensions = ['.jpg', '.png', '.webp', '.gif', '.pdf'];
      
      for (const ext of extensions) {
        const testFile = {
          buffer: Buffer.from('test'),
          originalname: `test${ext}`,
          mimetype: ext === '.pdf' ? 'application/pdf' : 'image/jpeg',
          size: 1024
        };
        
        const result = await handleMediaUpload(testFile, 'user@example.com');
        
        expect(result.success).toBe(true);
        expect(result.url).toMatch(new RegExp(`\\${ext}$`));
      }
    });

    it('should handle files without extensions', async () => {
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test_file_no_extension',
        mimetype: 'image/jpeg',
        size: 1024
      };
      
      const result = await handleMediaUpload(testFile, 'user@example.com');
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });
  });
});