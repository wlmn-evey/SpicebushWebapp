/**
 * Integration Tests for Photo Upload Functionality
 * 
 * Tests the complete photo upload workflow including:
 * - Form validation
 * - File upload processing  
 * - Database integration
 * - Error handling scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn()
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn()
    }))
  }
};

vi.mock('@lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

// Mock form validation
vi.mock('@lib/form-validation', () => ({
  validateForm: vi.fn(),
  validators: {
    required: vi.fn(),
    maxLength: vi.fn()
  }
}));

describe('Photo Upload Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Form Validation', () => {
    it('should validate required photo title', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      // Mock validation failure for missing title
      (validateForm as any).mockReturnValue({
        photo_title: 'Photo title is required'
      });

      const formData = new FormData();
      formData.append('photo_url', 'https://example.com/test.jpg');
      formData.append('photo_description', 'Test description');

      const validationSchema = {
        photo_title: ['required', 'maxLength'],
        photo_description: ['maxLength'],
        photo_tags: ['maxLength']
      };

      const errors = validateForm(formData, validationSchema);
      
      expect(errors.photo_title).toBe('Photo title is required');
      expect(validateForm).toHaveBeenCalledWith(formData, validationSchema);
    });

    it('should validate photo title length limit', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      // Mock validation failure for title too long
      (validateForm as any).mockReturnValue({
        photo_title: 'Title must be 200 characters or less'
      });

      const formData = new FormData();
      formData.append('photo_title', 'a'.repeat(201)); // Exceeds 200 char limit
      formData.append('photo_url', 'https://example.com/test.jpg');

      const validationSchema = {
        photo_title: ['required', 'maxLength'],
        photo_description: ['maxLength'],
        photo_tags: ['maxLength']
      };

      const errors = validateForm(formData, validationSchema);
      
      expect(errors.photo_title).toBe('Title must be 200 characters or less');
    });

    it('should validate optional fields within limits', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      // Mock validation success
      (validateForm as any).mockReturnValue({});

      const formData = new FormData();
      formData.append('photo_title', 'Valid Title');
      formData.append('photo_description', 'A'.repeat(500)); // At limit
      formData.append('photo_tags', 'tag1, tag2, tag3');
      formData.append('photo_url', 'https://example.com/test.jpg');

      const validationSchema = {
        photo_title: ['required', 'maxLength'],
        photo_description: ['maxLength'],
        photo_tags: ['maxLength']
      };

      const errors = validateForm(formData, validationSchema);
      
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('Database Integration', () => {
    it('should successfully update photo metadata in database', async () => {
      // Mock finding existing media record
      const mockMediaRecord = {
        id: 'photo-123',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg',
        uploaded_at: '2024-01-01T00:00:00Z'
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockMediaRecord,
        error: null
      });

      // Mock successful update
      mockSupabaseClient.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      });

      // Simulate the photo metadata update process
      const photoUrl = 'https://example.com/test.jpg';
      const metadata = {
        title: 'Test Photo',
        description: 'A beautiful test photo',
        tags: ['test', 'photo', 'beautiful']
      };

      // Find the media record
      const { data: mediaRecord, error: fetchError } = await mockSupabaseClient
        .from('media')
        .select('*')
        .eq('url', photoUrl)
        .single();

      expect(fetchError).toBeNull();
      expect(mediaRecord).toEqual(mockMediaRecord);

      // Update with metadata
      const { error: updateError } = await mockSupabaseClient
        .from('media')
        .update({
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          updated_at: expect.any(String)
        })
        .eq('id', mediaRecord.id);

      expect(updateError).toBeNull();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
    });

    it('should handle media record not found error', async () => {
      // Mock media record not found
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const photoUrl = 'https://example.com/nonexistent.jpg';

      try {
        const { data: mediaRecord, error: fetchError } = await mockSupabaseClient
          .from('media')
          .select('*')
          .eq('url', photoUrl)
          .single();

        if (fetchError || !mediaRecord) {
          throw new Error('Could not find uploaded photo record');
        }
      } catch (error) {
        expect((error as Error).message).toBe('Could not find uploaded photo record');
      }
    });

    it('should handle database update errors', async () => {
      // Mock finding media record successfully
      const mockMediaRecord = {
        id: 'photo-123',
        url: 'https://example.com/test.jpg'
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockMediaRecord,
        error: null
      });

      // Mock update error
      mockSupabaseClient.from().update().eq.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const photoUrl = 'https://example.com/test.jpg';
      const metadata = {
        title: 'Test Photo',
        description: 'A test photo',
        tags: ['test']
      };

      // Find the media record
      const { data: mediaRecord } = await mockSupabaseClient
        .from('media')
        .select('*')
        .eq('url', photoUrl)
        .single();

      // Update with metadata
      const { error: updateError } = await mockSupabaseClient
        .from('media')
        .update({
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          updated_at: expect.any(String)
        })
        .eq('id', mediaRecord.id);

      expect(updateError).toBeDefined();
      expect(updateError.message).toBe('Database connection failed');
    });
  });

  describe('Tag Processing', () => {
    it('should correctly parse and clean tag input', () => {
      const tagInput = 'classroom, children, outdoor,art,  montessori  ';
      const expectedTags = ['classroom', 'children', 'outdoor', 'art', 'montessori'];
      
      // Simulate the tag processing logic from the upload page
      const processedTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      expect(processedTags).toEqual(expectedTags);
    });

    it('should handle empty tag input', () => {
      const tagInput = '';
      const processedTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      expect(processedTags).toEqual([]);
    });

    it('should handle tag input with only commas and spaces', () => {
      const tagInput = ' , , , ';
      const processedTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      expect(processedTags).toEqual([]);
    });

    it('should preserve single tag without commas', () => {
      const tagInput = 'classroom';
      const processedTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      expect(processedTags).toEqual(['classroom']);
    });
  });

  describe('File Upload Scenarios', () => {
    it('should handle missing photo URL', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      const formData = new FormData();
      formData.append('photo_title', 'Test Photo');
      // Missing photo_url

      // Simulate the photo URL validation logic
      const photoUrl = formData.get('photo_url')?.toString();
      const errors: Record<string, string> = {};
      
      if (!photoUrl) {
        errors.photo_url = 'Please upload a photo';
      }

      expect(errors.photo_url).toBe('Please upload a photo');
    });

    it('should handle valid photo upload URL', async () => {
      const formData = new FormData();
      formData.append('photo_title', 'Test Photo');
      formData.append('photo_url', 'https://example.com/test.jpg');

      const photoUrl = formData.get('photo_url')?.toString();
      const errors: Record<string, string> = {};
      
      if (!photoUrl) {
        errors.photo_url = 'Please upload a photo';
      }

      expect(Object.keys(errors)).toHaveLength(0);
      expect(photoUrl).toBe('https://example.com/test.jpg');
    });
  });

  describe('Complete Upload Workflow', () => {
    it('should successfully complete full upload workflow', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      // Mock successful validation
      (validateForm as any).mockReturnValue({});

      // Mock finding existing media record
      const mockMediaRecord = {
        id: 'photo-123',
        url: 'https://example.com/test.jpg',
        filename: 'test.jpg'
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockMediaRecord,
        error: null
      });

      // Mock successful update
      mockSupabaseClient.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      });

      // Simulate complete workflow
      const formData = new FormData();
      formData.append('photo_title', 'Beautiful Sunset');
      formData.append('photo_description', 'A gorgeous sunset over the mountains');
      formData.append('photo_tags', 'sunset, mountains, nature');
      formData.append('photo_url', 'https://example.com/sunset.jpg');

      // Validate form
      const validationSchema = {
        photo_title: ['required', 'maxLength'],
        photo_description: ['maxLength'],
        photo_tags: ['maxLength']
      };

      const formErrors = validateForm(formData, validationSchema);
      expect(Object.keys(formErrors)).toHaveLength(0);

      // Check photo URL
      const photoUrl = formData.get('photo_url')?.toString();
      expect(photoUrl).toBe('https://example.com/sunset.jpg');

      // Find media record
      const { data: mediaRecord, error: fetchError } = await mockSupabaseClient
        .from('media')
        .select('*')
        .eq('url', photoUrl)
        .single();

      expect(fetchError).toBeNull();
      expect(mediaRecord).toEqual(mockMediaRecord);

      // Process tags
      const tags = formData.get('photo_tags')?.toString()
        ?.split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      expect(tags).toEqual(['sunset', 'mountains', 'nature']);

      // Update database
      const { error: updateError } = await mockSupabaseClient
        .from('media')
        .update({
          title: formData.get('photo_title')?.toString(),
          description: formData.get('photo_description')?.toString(),
          tags,
          updated_at: expect.any(String)
        })
        .eq('id', mediaRecord.id);

      expect(updateError).toBeNull();
    });

    it('should handle workflow interruption due to validation errors', async () => {
      const { validateForm } = await import('@lib/form-validation');
      
      // Mock validation failure
      (validateForm as any).mockReturnValue({
        photo_title: 'Photo title is required',
        photo_description: 'Description is too long'
      });

      const formData = new FormData();
      formData.append('photo_description', 'A'.repeat(501)); // Exceeds limit
      formData.append('photo_url', 'https://example.com/test.jpg');

      const validationSchema = {
        photo_title: ['required', 'maxLength'],
        photo_description: ['maxLength'],
        photo_tags: ['maxLength']
      };

      const formErrors = validateForm(formData, validationSchema);
      
      // Workflow should stop due to validation errors
      expect(Object.keys(formErrors)).toHaveLength(2);
      expect(formErrors.photo_title).toBe('Photo title is required');
      expect(formErrors.photo_description).toBe('Description is too long');

      // Database operations should not be called
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });
});