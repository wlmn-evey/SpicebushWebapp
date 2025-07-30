import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIContext } from 'astro';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}));

// Import the webhook handler after mocking
import { POST } from './netlify-form';

describe('Netlify Form Webhook', () => {
  let mockRequest: Request;
  let mockContext: APIContext;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Mock console.error to prevent test output pollution
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up mock context
    mockContext = {
      request: {} as Request,
      params: {},
      url: new URL('http://localhost:4321/api/webhooks/netlify-form'),
      cookies: {} as any,
      redirect: vi.fn(),
      locals: {}
    } as APIContext;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Request Validation', () => {
    it('should reject non-JSON content types', async () => {
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain'
        },
        body: 'plain text'
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid content type');
    });

    it('should accept JSON content type', async () => {
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Test User',
            email: 'test@example.com',
            subject: 'general',
            message: 'Test message'
          }
        })
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });
  });

  describe('Form Data Processing', () => {
    it('should process contact form submissions', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        subject: 'tour',
        message: 'I would like to schedule a tour',
        'child-age': '4',
        'tour-interest': 'yes'
      };

      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: formData
        })
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith('contact_form_submissions');
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        subject: 'tour',
        message: 'I would like to schedule a tour',
        child_age: '4',
        tour_interest: true
      });
    });

    it('should handle submissions without optional fields', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      const formData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'general',
        message: 'General inquiry'
      };

      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: formData
        })
      });

      await POST({ ...mockContext, request: mockRequest });
      
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        subject: 'general',
        message: 'General inquiry',
        child_age: null,
        tour_interest: false
      });
    });

    it('should ignore non-contact form submissions', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn();
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'newsletter-signup',
          data: {
            email: 'newsletter@example.com'
          }
        })
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(200);
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => Promise.resolve({ 
        error: new Error('Database connection failed') 
      }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Test User',
            email: 'test@example.com',
            subject: 'general',
            message: 'Test message'
          }
        })
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      // Should still return OK even if database fails
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error storing form submission:', 
        expect.any(Error)
      );
    });

    it('should handle missing Supabase credentials', async () => {
      // Mock missing environment variables
      const originalUrl = import.meta.env.PUBLIC_SUPABASE_URL;
      const originalKey = import.meta.env.SUPABASE_SERVICE_KEY;
      
      import.meta.env.PUBLIC_SUPABASE_URL = undefined;
      import.meta.env.SUPABASE_SERVICE_KEY = undefined;

      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Test User',
            email: 'test@example.com',
            subject: 'general',
            message: 'Test message'
          }
        })
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(200);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Missing Supabase credentials');

      // Restore environment variables
      import.meta.env.PUBLIC_SUPABASE_URL = originalUrl;
      import.meta.env.SUPABASE_SERVICE_KEY = originalKey;
    });

    it('should handle malformed JSON gracefully', async () => {
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: '{ invalid json'
      });

      const response = await POST({ ...mockContext, request: mockRequest });
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform tour interest checkbox', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      // Test with tour interest = 'yes'
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Test User',
            email: 'test@example.com',
            subject: 'tour',
            message: 'Interested in tour',
            'tour-interest': 'yes'
          }
        })
      });

      await POST({ ...mockContext, request: mockRequest });
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tour_interest: true
        })
      );

      // Test without tour interest
      mockInsert.mockClear();
      
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Test User 2',
            email: 'test2@example.com',
            subject: 'general',
            message: 'Not interested in tour'
          }
        })
      });

      await POST({ ...mockContext, request: mockRequest });
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tour_interest: false
        })
      );
    });

    it('should handle various payload formats from Netlify', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      
      (createClient as any).mockReturnValue({ from: mockFrom });

      // Test with data nested in 'data' property
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          form_name: 'contact-form',
          data: {
            name: 'Nested User',
            email: 'nested@example.com',
            subject: 'general',
            message: 'From nested data'
          }
        })
      });

      await POST({ ...mockContext, request: mockRequest });
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nested User',
          email: 'nested@example.com'
        })
      );

      // Test with data at root level
      mockInsert.mockClear();
      
      mockRequest = new Request('http://localhost:4321/api/webhooks/netlify-form', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Root User',
          email: 'root@example.com',
          subject: 'general',
          message: 'From root level'
        })
      });

      await POST({ ...mockContext, request: mockRequest });
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Root User',
          email: 'root@example.com'
        })
      );
    });
  });
});