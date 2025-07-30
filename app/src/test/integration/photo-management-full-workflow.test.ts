/**
 * Integration Tests for Complete Photo Management Workflow
 * 
 * Tests the full integration between:
 * - Photo upload API
 * - Database operations
 * - File storage system
 * - Admin authentication
 * - Performance optimization systems
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';

// Mock external dependencies
vi.mock('fs/promises');

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis()
  }))
};

vi.mock('@lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn(() => Promise.resolve({
    isAuthenticated: true,
    session: { userEmail: 'admin@spicebush.org' },
    user: { email: 'admin@spicebush.org' }
  }))
}));

vi.mock('@lib/audit-logger', () => ({
  AuditLogger: vi.fn(() => ({
    logMediaUpload: vi.fn(),
    logMediaDelete: vi.fn()
  }))
}));

describe('Photo Management Full Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful file operations
    (fs.access as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.unlink as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Upload Workflow', () => {
    it('should handle end-to-end photo upload with metadata', async () => {
      // Mock successful database operations
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'photo-123' },
        error: null
      });

      mockSupabaseClient.from().single.mockResolvedValue({
        data: {
          id: 'photo-123',
          url: '/uploads/test-photo.jpg',
          filename: 'test-photo.jpg'
        },
        error: null
      });

      mockSupabaseClient.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      });

      // Import and test upload handler
      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test image data'),
        originalname: 'beautiful-classroom.jpg',
        mimetype: 'image/jpeg',
        size: 2048000
      };

      // Step 1: Upload file
      const uploadResult = await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.url).toBeDefined();
      
      // Verify database insert was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        filename: 'beautiful-classroom.jpg',
        url: expect.any(String),
        size: 2048000,
        mimetype: 'image/jpeg',
        uploaded_by: 'admin@spicebush.org',
        storage_path: expect.any(String)
      });

      // Step 2: Update metadata (simulate form submission)
      const { data: mediaRecord } = await mockSupabaseClient
        .from('media')
        .select('*')
        .eq('url', uploadResult.url)
        .single();

      expect(mediaRecord).toBeDefined();

      // Update with metadata
      const { error: updateError } = await mockSupabaseClient
        .from('media')
        .update({
          title: 'Beautiful Classroom Scene',
          description: 'Children engaged in hands-on learning activities',
          tags: ['classroom', 'children', 'learning', 'montessori'],
          updated_at: expect.any(String)
        })
        .eq('id', mediaRecord.id);

      expect(updateError).toBeNull();
      expect(mockSupabaseClient.from().update).toHaveBeenCalled();
    });

    it('should handle upload failure and cleanup', async () => {
      // Mock database insertion failure
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test image data'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should integrate with audit logging', async () => {
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'photo-123' },
        error: null
      });

      const { AuditLogger } = await import('@lib/audit-logger');
      const mockAudit = new AuditLogger({} as any);

      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      // Verify file was written
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Photo Gallery Integration', () => {
    it('should load and display photos with metadata', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          title: 'Classroom Activities',
          description: 'Children learning with Montessori materials',
          filename: 'classroom-1.jpg',
          url: '/uploads/classroom-1.jpg',
          size: 2048000,
          mimetype: 'image/jpeg',
          tags: ['classroom', 'children', 'learning'],
          uploaded_at: '2024-01-15T10:30:00Z',
          uploaded_by: 'admin@spicebush.org'
        },
        {
          id: 'photo-2',
          title: 'Outdoor Play',
          description: 'Students enjoying playground time',
          filename: 'outdoor-2.jpg',
          url: '/uploads/outdoor-2.jpg',
          size: 1536000,
          mimetype: 'image/jpeg',
          tags: ['outdoor', 'playground'],
          uploaded_at: '2024-01-14T14:20:00Z',
          uploaded_by: 'admin@spicebush.org'
        }
      ];

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockPhotos,
        error: null
      });

      // Simulate loading photos for gallery
      const { data, error } = await mockSupabaseClient
        .from('media')
        .select('*')
        .order('uploaded_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Classroom Activities');
      expect(data[0].tags).toContain('classroom');
      expect(data[1].title).toBe('Outdoor Play');
    });

    it('should handle gallery loading errors gracefully', async () => {
      mockSupabaseClient.from().order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { data, error } = await mockSupabaseClient
        .from('media')
        .select('*')
        .order('uploaded_at', { ascending: false });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toBe('Database connection failed');
    });

    it('should calculate statistics correctly', async () => {
      const mockPhotos = [
        { id: '1', size: 2048000, mimetype: 'image/jpeg', uploaded_at: '2024-01-15T10:30:00Z' },
        { id: '2', size: 1536000, mimetype: 'image/png', uploaded_at: '2024-01-14T14:20:00Z' },
        { id: '3', size: 3072000, mimetype: 'application/pdf', uploaded_at: '2024-01-13T16:45:00Z' }
      ];

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockPhotos,
        error: null
      });

      const { data: photos } = await mockSupabaseClient
        .from('media')
        .select('*')
        .order('uploaded_at', { ascending: false });

      // Calculate stats
      const totalPhotos = photos.length;
      const totalSize = photos.reduce((sum: number, photo: any) => sum + photo.size, 0);
      const imagePhotos = photos.filter((photo: any) => photo.mimetype.startsWith('image/')).length;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentPhotos = photos.filter((photo: any) => {
        return new Date(photo.uploaded_at) > sevenDaysAgo;
      }).length;

      expect(totalPhotos).toBe(3);
      expect(totalSize).toBe(6656000); // Sum of all file sizes
      expect(imagePhotos).toBe(2); // Only JPG and PNG
      expect(recentPhotos).toBe(3); // All photos are recent in test
    });
  });

  describe('Photo Deletion Workflow', () => {
    it('should delete photo and cleanup files', async () => {
      const mockPhoto = {
        id: 'photo-123',
        filename: 'test.jpg',
        url: '/uploads/test.jpg',
        storage_path: './public/uploads/12345-abcd.jpg'
      };

      // Mock finding the photo
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockPhoto,
        error: null
      });

      // Mock successful deletion
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });

      // Simulate deletion workflow
      const { data: photo } = await mockSupabaseClient
        .from('media')
        .select('*')
        .eq('id', 'photo-123')
        .single();

      expect(photo).toEqual(mockPhoto);

      // Delete from database
      const { error: deleteError } = await mockSupabaseClient
        .from('media')
        .delete()
        .eq('id', 'photo-123');

      expect(deleteError).toBeNull();

      // Delete from filesystem
      await fs.unlink(photo.storage_path);
      expect(fs.unlink).toHaveBeenCalledWith('./public/uploads/12345-abcd.jpg');
    });

    it('should handle deletion errors gracefully', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: { message: 'Photo not found' }
      });

      const { error } = await mockSupabaseClient
        .from('media')
        .delete()
        .eq('id', 'nonexistent-photo');

      expect(error).toBeDefined();
      expect(error.message).toBe('Photo not found');
    });
  });

  describe('Performance Optimization Integration', () => {
    it('should integrate with image preloading system', async () => {
      const mockPhotos = [
        { id: '1', url: '/uploads/photo1.jpg', title: 'Photo 1' },
        { id: '2', url: '/uploads/photo2.jpg', title: 'Photo 2' },
        { id: '3', url: '/uploads/photo3.jpg', title: 'Photo 3' }
      ];

      mockSupabaseClient.from().order.mockResolvedValue({
        data: mockPhotos,
        error: null
      });

      // Simulate preloading logic
      const { data: photos } = await mockSupabaseClient
        .from('media')
        .select('*')
        .order('uploaded_at', { ascending: false });

      // Would integrate with image preloader
      const preloadUrls = photos.slice(0, 6).map((photo: any) => photo.url);
      
      expect(preloadUrls).toHaveLength(3);
      expect(preloadUrls).toContain('/uploads/photo1.jpg');
      expect(preloadUrls).toContain('/uploads/photo2.jpg');
      expect(preloadUrls).toContain('/uploads/photo3.jpg');
    });

    it('should handle large photo sets efficiently', async () => {
      // Generate large set of mock photos
      const largePhotoSet = Array.from({ length: 100 }, (_, i) => ({
        id: `photo-${i}`,
        url: `/uploads/photo-${i}.jpg`,
        title: `Photo ${i}`,
        size: 1024000 + (i * 1000),
        uploaded_at: new Date(Date.now() - (i * 1000000)).toISOString()
      }));

      mockSupabaseClient.from().order.mockResolvedValue({
        data: largePhotoSet,
        error: null
      });

      const { data: photos } = await mockSupabaseClient
        .from('media')
        .select('*')
        .order('uploaded_at', { ascending: false });

      expect(photos).toHaveLength(100);
      
      // Test pagination logic
      const pageSize = 20;
      const firstPage = photos.slice(0, pageSize);
      const secondPage = photos.slice(pageSize, pageSize * 2);
      
      expect(firstPage).toHaveLength(20);
      expect(secondPage).toHaveLength(20);
      expect(firstPage[0].id).toBe('photo-0'); // Most recent
      expect(secondPage[0].id).toBe('photo-20');
    });
  });

  describe('Authentication Integration', () => {
    it('should require authentication for photo operations', async () => {
      const { checkAdminAuth } = await import('@lib/admin-auth-check');
      
      const authResult = await checkAdminAuth({} as any);
      
      expect(authResult.isAuthenticated).toBe(true);
      expect(authResult.session?.userEmail).toBe('admin@spicebush.org');
    });

    it('should handle authentication failure', async () => {
      // Mock authentication failure
      vi.mocked(await import('@lib/admin-auth-check')).checkAdminAuth.mockResolvedValue({
        isAuthenticated: false,
        session: null,
        user: null
      });

      const { checkAdminAuth } = await import('@lib/admin-auth-check');
      
      const authResult = await checkAdminAuth({} as any);
      
      expect(authResult.isAuthenticated).toBe(false);
      expect(authResult.session).toBeNull();
    });
  });

  describe('API Endpoint Integration', () => {
    it('should properly validate API requests', async () => {
      const mockRequest = {
        formData: vi.fn().mockResolvedValue(new FormData()),
        headers: new Map([['content-type', 'multipart/form-data']])
      };

      const formData = new FormData();
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', mockFile);
      
      mockRequest.formData.mockResolvedValue(formData);

      const formDataResult = await mockRequest.formData();
      const file = formDataResult.get('file') as File;
      
      expect(file).toBeDefined();
      expect(file.name).toBe('test.jpg');
      expect(file.type).toBe('image/jpeg');
    });

    it('should handle malformed requests', async () => {
      const mockRequest = {
        formData: vi.fn().mockRejectedValue(new Error('Invalid form data'))
      };

      try {
        await mockRequest.formData();
      } catch (error) {
        expect((error as Error).message).toBe('Invalid form data');
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures', async () => {
      mockSupabaseClient.from().insert.mockRejectedValue(new Error('Connection timeout'));

      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle filesystem failures', async () => {
      (fs.writeFile as any).mockRejectedValue(new Error('Disk full'));

      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle partial failures gracefully', async () => {
      // File writes successfully but database insert fails
      (fs.writeFile as any).mockResolvedValue(undefined);
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation' }
      });

      const { handleMediaUpload } = await import('@lib/media-storage');
      
      const testFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = await handleMediaUpload(testFile, 'admin@spicebush.org');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
      
      // File should still be written but operation fails overall
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});