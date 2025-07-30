import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('API Utils', () => {
  describe('errorResponse', () => {
    it('should create error response with default status 400', () => {
      const response = errorResponse('Bad request');
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create error response with custom status', () => {
      const response = errorResponse('Not found', 404);
      
      expect(response.status).toBe(404);
    });

    it('should include error message in response body', async () => {
      const response = errorResponse('Validation failed');
      const body = await response.json();
      
      expect(body).toEqual({ error: 'Validation failed' });
    });
  });

  describe('successResponse', () => {
    it('should create success response with default status 200', () => {
      const response = successResponse({ message: 'Success' });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create success response with custom status', () => {
      const response = successResponse({ created: true }, 201);
      
      expect(response.status).toBe(201);
    });

    it('should include data in response body', async () => {
      const data = { id: 1, name: 'Test' };
      const response = successResponse(data);
      const body = await response.json();
      
      expect(body).toEqual(data);
    });

    it('should handle null data', async () => {
      const response = successResponse(null);
      const body = await response.json();
      
      expect(body).toBeNull();
    });

    it('should handle array data', async () => {
      const data = [1, 2, 3];
      const response = successResponse(data);
      const body = await response.json();
      
      expect(body).toEqual(data);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@company.org',
        'email123@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user name@example.com',
        'user@example',
        '',
        'user@@example.com',
        'user@example..com'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '1234567890',
        '+1 (234) 567-8901',
        '123-456-7890',
        '(123) 456-7890',
        '+44 20 7946 0958',
        '123.456.7890'
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789',      // Too short (9 digits)
        '1234567890123456', // Too long (16 digits)
        '',
        'not a phone',
        '123',
        '+1'
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(false);
      });
    });

    it('should handle international phone numbers', () => {
      expect(validatePhone('+1234567890123')).toBe(true); // 13 digits
      expect(validatePhone('+123456789012345')).toBe(true); // 15 digits
    });
  });

  describe('validateRequired', () => {
    it('should return null when all required fields are present', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 25
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBeNull();
    });

    it('should return error message for missing field', () => {
      const data = {
        name: 'John'
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBe('email is required');
    });

    it('should return error message for empty string field', () => {
      const data = {
        name: 'John',
        email: ''
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBe('email is required');
    });

    it('should return error message for whitespace-only field', () => {
      const data = {
        name: 'John',
        email: '   '
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBe('email is required');
    });

    it('should handle undefined fields', () => {
      const data = {
        name: 'John',
        email: undefined
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBe('email is required');
    });

    it('should handle null fields', () => {
      const data = {
        name: 'John',
        email: null
      };

      const result = validateRequired(data, ['name', 'email']);
      expect(result).toBe('email is required');
    });

    it('should return first missing field when multiple are missing', () => {
      const data = {
        name: 'John'
      };

      const result = validateRequired(data, ['email', 'phone', 'address']);
      expect(result).toBe('email is required');
    });

    it('should handle non-string required fields', () => {
      const data = {
        name: 'John',
        age: 0,
        active: false
      };

      const result = validateRequired(data, ['name', 'age', 'active']);
      expect(result).toBeNull(); // 0 and false are valid values
    });
  });

  describe('handleApiRequest', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return success response when handler succeeds', async () => {
      const mockData = { id: 1, message: 'Success' };
      const handler = async () => mockData;

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockData);
    });

    it('should handle unauthorized errors', async () => {
      const handler = async () => {
        throw new Error('Unauthorized access');
      };

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: 'Unauthorized' });
      expect(console.error).toHaveBeenCalledWith('API Error:', expect.any(Error));
    });

    it('should handle not found errors', async () => {
      const handler = async () => {
        throw new Error('Resource not found');
      };

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: 'Resource not found' });
    });

    it('should handle generic errors', async () => {
      const handler = async () => {
        throw new Error('Something went wrong');
      };

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should handle non-Error thrown values', async () => {
      const handler = async () => {
        throw 'String error';
      };

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should handle null return from handler', async () => {
      const handler = async () => null;

      const response = await handleApiRequest(handler);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toBeNull();
    });
  });

  describe('parseJsonBody', () => {
    it('should parse valid JSON body', async () => {
      const data = { name: 'Test', value: 123 };
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await parseJsonBody(request);
      expect(result).toEqual(data);
    });

    it('should return null for invalid JSON', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await parseJsonBody(request);
      expect(result).toBeNull();
    });

    it('should return null for empty body', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await parseJsonBody(request);
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        [],
        [1, 2, 3],
        'string',
        123,
        true,
        null
      ];

      for (const data of testCases) {
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await parseJsonBody(request);
        expect(result).toEqual(data);
      }
    });
  });

  describe('requireAuth', () => {
    // Mock the supabase module
    vi.mock('@lib/supabase', () => ({
      supabase: {
        auth: {
          getUser: vi.fn()
        }
      }
    }));

    it('should allow bypass in dev mode with bypass cookie', async () => {
      const originalEnv = import.meta.env.DEV;
      // @ts-ignore - Mocking environment variable
      import.meta.env.DEV = true;

      const mockContext = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'bypass' })
        }
      } as unknown as APIContext;

      const result = await requireAuth(mockContext);
      
      expect(result).toBeNull();
      expect(mockContext.cookies.get).toHaveBeenCalledWith('sbms-admin-auth');

      // @ts-ignore - Restore environment variable
      import.meta.env.DEV = originalEnv;
    });

    it('should check supabase auth when not in dev bypass mode', async () => {
      const originalEnv = import.meta.env.DEV;
      // @ts-ignore - Mocking environment variable
      import.meta.env.DEV = false;

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ 
            data: { user: { id: '123', email: 'test@example.com' } } 
          })
        }
      };

      vi.doMock('@lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const mockContext = {
        cookies: {
          get: vi.fn().mockReturnValue(null)
        }
      } as unknown as APIContext;

      const result = await requireAuth(mockContext);
      
      expect(result).toBeNull(); // Auth passed

      // @ts-ignore - Restore environment variable
      import.meta.env.DEV = originalEnv;
    });

    it('should return error response when user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ 
            data: { user: null } 
          })
        }
      };

      vi.doMock('@lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const mockContext = {
        cookies: {
          get: vi.fn().mockReturnValue(null)
        }
      } as unknown as APIContext;

      const result = await requireAuth(mockContext);
      
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
      
      const body = await result?.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });
});