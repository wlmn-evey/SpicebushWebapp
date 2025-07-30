/**
 * Unit Tests for Media API Endpoint
 * 
 * Tests the GET and DELETE endpoints in /api/cms/media.ts
 * Covers authentication, data retrieval, deletion, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
};

// Mock the Supabase import
vi.mock('@lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

// Import the API functions after mocking
import { GET, DELETE } from '@/pages/api/cms/media.ts';

describe('Media API - GET endpoint', () => {
  let mockRequest: Request;
  let mockCookies: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new Request('http://localhost/api/cms/media');
    mockCookies = {
      get: vi.fn()
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return media list for authenticated user', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock successful database query
    const mockMediaData = [
      {
        id: '1',
        filename: 'test-image.jpg',
        url: 'https://example.com/test-image.jpg',
        title: 'Test Image',
        description: 'A test image',
        uploaded_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        filename: 'photo2.png',
        url: 'https://example.com/photo2.png',
        title: 'Photo 2',
        description: null,
        uploaded_at: '2024-01-02T00:00:00Z'
      }
    ];

    mockSupabaseClient.from().order.mockResolvedValue({
      data: mockMediaData,
      error: null
    });

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: '1',
      name: 'test-image.jpg',
      url: 'https://example.com/test-image.jpg',
      path: 'https://example.com/test-image.jpg'
    });
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
  });

  it('should return 401 for unauthenticated requests', async () => {
    // Mock authentication failure
    mockCookies.get.mockReturnValue(null);
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    // Set environment to production to trigger auth check
    vi.stubEnv('DEV', false);

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe('Unauthorized');

    vi.unstubAllEnvs();
  });

  it('should handle database errors gracefully', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock database error
    mockSupabaseClient.from().order.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' }
    });

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).toBe('Internal server error');
  });

  it('should return empty array when no media exists', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock empty result
    mockSupabaseClient.from().order.mockResolvedValue({
      data: [],
      error: null
    });

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual([]);
  });
});

describe('Media API - DELETE endpoint', () => {
  let mockRequest: Request;
  let mockCookies: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies = {
      get: vi.fn()
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should successfully delete a photo', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock request with photo ID
    const requestBody = JSON.stringify({ id: 'photo-123' });
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    // Mock successful database operations
    const mockPhoto = {
      id: 'photo-123',
      filename: 'test.jpg',
      url: 'https://example.com/test.jpg'
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

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Photo deleted successfully');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
  });

  it('should return 401 for unauthenticated requests', async () => {
    // Mock authentication failure
    mockCookies.get.mockReturnValue(null);
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    // Set environment to production to trigger auth check
    vi.stubEnv('DEV', false);

    const requestBody = JSON.stringify({ id: 'photo-123' });
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe('Unauthorized');

    vi.unstubAllEnvs();
  });

  it('should return 400 when photo ID is missing', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock request without photo ID
    const requestBody = JSON.stringify({});
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('Photo ID is required');
  });

  it('should return 404 when photo does not exist', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    const requestBody = JSON.stringify({ id: 'nonexistent-photo' });
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    // Mock photo not found
    mockSupabaseClient.from().single.mockResolvedValue({
      data: null,
      error: { message: 'No rows returned' }
    });

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(404);
    expect(result.error).toBe('Photo not found');
  });

  it('should handle database deletion errors', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    const requestBody = JSON.stringify({ id: 'photo-123' });
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }
    });

    // Mock finding the photo successfully
    const mockPhoto = {
      id: 'photo-123',
      filename: 'test.jpg',
      url: 'https://example.com/test.jpg'
    };

    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockPhoto,
      error: null
    });

    // Mock deletion error
    mockSupabaseClient.from().delete().eq.mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    });

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).toBe('Internal server error');
  });

  it('should handle malformed JSON in request body', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock request with malformed JSON
    mockRequest = new Request('http://localhost/api/cms/media', {
      method: 'DELETE',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await DELETE({ request: mockRequest, cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).toBe('Internal server error');
  });
});

describe('Media API - Edge Cases', () => {
  let mockCookies: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies = {
      get: vi.fn()
    };
  });

  it('should handle null/undefined media data gracefully', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock null data response
    mockSupabaseClient.from().order.mockResolvedValue({
      data: null,
      error: null
    });

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual([]);
  });

  it('should handle media items with missing fields', async () => {
    // Mock authentication success
    mockCookies.get.mockReturnValue({ value: 'bypass' });
    
    // Mock data with missing/null fields
    const mockMediaData = [
      {
        id: '1',
        filename: null,
        url: 'https://example.com/test.jpg'
      },
      {
        id: '2',  
        filename: 'test2.jpg',
        url: null
      }
    ];

    mockSupabaseClient.from().order.mockResolvedValue({
      data: mockMediaData,
      error: null
    });

    const response = await GET({ cookies: mockCookies } as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBeNull();
    expect(result[1].url).toBeNull();
  });
});