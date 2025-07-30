import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import {
  errorResponse,
  successResponse,
  validateEmail,
  validatePhone,
  validateRequired,
  handleApiRequest,
  parseJsonBody,
  requireAuth
} from '@lib/api-utils';

describe('API Utils Integration Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Complete API Request Flow', () => {
    it('should handle a complete successful form submission', async () => {
      // Simulate a contact form submission
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        message: 'I would like to schedule a tour'
      };

      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });

      // Parse the request body
      const body = await parseJsonBody(request);
      expect(body).toEqual(formData);

      // Validate required fields
      const requiredError = validateRequired(body!, ['name', 'email', 'message']);
      expect(requiredError).toBeNull();

      // Validate email
      expect(validateEmail(body!.email)).toBe(true);

      // Validate phone
      expect(validatePhone(body!.phone)).toBe(true);

      // Process the request
      const response = await handleApiRequest(async () => {
        // Simulate saving to database
        return { success: true, id: 123 };
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toEqual({ success: true, id: 123 });
    });

    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        phone: '123',
        message: 'Test'
      };

      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const body = await parseJsonBody(request);

      // Check required fields
      const requiredError = validateRequired(body!, ['name', 'email', 'message']);
      expect(requiredError).toBe('name is required');

      // Even if we fix the name, email validation should fail
      body!.name = 'John';
      const emailValid = validateEmail(body!.email);
      expect(emailValid).toBe(false);

      // Phone validation should also fail
      const phoneValid = validatePhone(body!.phone);
      expect(phoneValid).toBe(false);

      // Return appropriate error response
      const response = errorResponse('Invalid form data', 400);
      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: '{ invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const body = await parseJsonBody(request);
      expect(body).toBeNull();

      // Return appropriate error
      const response = errorResponse('Invalid request body', 400);
      expect(response.status).toBe(400);
    });
  });

  describe('Protected Endpoint Flow', () => {
    // Mock supabase module
    vi.mock('@lib/supabase', () => ({
      supabase: {
        auth: {
          getUser: vi.fn()
        }
      }
    }));

    it('should protect admin endpoints', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        }
      };

      vi.doMock('@lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const mockContext = {
        cookies: {
          get: vi.fn().mockReturnValue(null)
        },
        request: new Request('http://localhost/admin/api/settings', {
          method: 'GET'
        })
      } as unknown as APIContext;

      // Check authentication
      const authResult = await requireAuth(mockContext);
      
      // Should return unauthorized response
      expect(authResult).not.toBeNull();
      expect(authResult?.status).toBe(401);

      // In a real endpoint, you would return early if auth fails
      if (authResult) {
        const body = await authResult.json();
        expect(body).toEqual({ error: 'Unauthorized' });
        return; // Early return in actual endpoint
      }

      // This code wouldn't execute in a real scenario
      // but demonstrates the flow when auth passes
    });

    it('should allow authenticated admin requests', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ 
            data: { 
              user: { 
                id: 'admin-123', 
                email: 'admin@example.com' 
              } 
            } 
          })
        }
      };

      vi.doMock('@lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const mockContext = {
        cookies: {
          get: vi.fn().mockReturnValue(null)
        },
        request: new Request('http://localhost/admin/api/settings', {
          method: 'POST',
          body: JSON.stringify({ siteName: 'Updated Name' }),
          headers: { 'Content-Type': 'application/json' }
        })
      } as unknown as APIContext;

      // Check authentication
      const authResult = await requireAuth(mockContext);
      expect(authResult).toBeNull(); // Auth passed

      // Parse request body
      const body = await parseJsonBody(mockContext.request);
      expect(body).toEqual({ siteName: 'Updated Name' });

      // Process the admin request
      const response = await handleApiRequest(async () => {
        // Simulate updating settings
        return { 
          success: true, 
          settings: { siteName: 'Updated Name' } 
        };
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle database errors appropriately', async () => {
      const response = await handleApiRequest(async () => {
        // Simulate a database error
        throw new Error('Database connection failed');
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle specific error types', async () => {
      // Test unauthorized error
      const unauthorizedResponse = await handleApiRequest(async () => {
        throw new Error('Unauthorized: Invalid token');
      });
      expect(unauthorizedResponse.status).toBe(401);

      // Test not found error
      const notFoundResponse = await handleApiRequest(async () => {
        throw new Error('Not found: Resource does not exist');
      });
      expect(notFoundResponse.status).toBe(404);

      // Test generic error
      const genericResponse = await handleApiRequest(async () => {
        throw new TypeError('Cannot read property of undefined');
      });
      expect(genericResponse.status).toBe(500);
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate complex form with multiple field types', () => {
      const formData = {
        // Personal info
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.org',
        phone: '+1 (555) 987-6543',
        
        // Address
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        
        // Preferences
        newsletter: true,
        contactMethod: 'email',
        
        // Optional fields
        company: '',
        notes: null
      };

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'street', 'city', 'state', 'zip'];
      const requiredError = validateRequired(formData, requiredFields);
      expect(requiredError).toBeNull();

      // Validate email format
      expect(validateEmail(formData.email)).toBe(true);

      // Validate phone format
      expect(validatePhone(formData.phone)).toBe(true);

      // Test with missing required field
      const incompleteData = { ...formData, city: '' };
      const missingFieldError = validateRequired(incompleteData, requiredFields);
      expect(missingFieldError).toBe('city is required');
    });

    it('should handle international phone numbers correctly', () => {
      const internationalPhones = [
        { number: '+44 20 7946 0958', country: 'UK', expected: true },
        { number: '+33 1 42 86 82 00', country: 'France', expected: true },
        { number: '+49 30 2594 1000', country: 'Germany', expected: true },
        { number: '+81 3 5253 1111', country: 'Japan', expected: true },
        { number: '+1', country: 'Invalid', expected: false },
        { number: '12345', country: 'Too short', expected: false }
      ];

      internationalPhones.forEach(({ number, country, expected }) => {
        const result = validatePhone(number);
        expect(result).toBe(expected);
      });
    });
  });
});