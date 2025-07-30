import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  errorResponse,
  successResponse,
  validateEmail,
  validatePhone,
  validateRequired,
  handleApiRequest,
  parseJsonBody
} from '@lib/api-utils';

describe('API Utils Production Scenarios', () => {
  beforeEach(() => {
    // Suppress console.error in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Production Error Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      const response = await handleApiRequest(async () => {
        // Simulate a database connection error
        throw new Error('ECONNREFUSED: Connection refused to database');
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
      // Should not expose internal error details
      expect(body.error).not.toContain('ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const response = await handleApiRequest(async () => {
        throw new Error('Request timeout after 30000ms');
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should handle memory errors', async () => {
      const response = await handleApiRequest(async () => {
        throw new RangeError('Maximum call stack size exceeded');
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
    });

    it('should handle malformed request data', async () => {
      const malformedRequest = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: 'name=test&email=test@example.com', // Form data instead of JSON
        headers: { 'Content-Type': 'application/json' }
      });

      const body = await parseJsonBody(malformedRequest);
      expect(body).toBeNull();
    });
  });

  describe('High-Volume Request Scenarios', () => {
    it('should handle rapid validation requests efficiently', () => {
      const startTime = performance.now();
      
      // Simulate 1000 validation checks
      for (let i = 0; i < 1000; i++) {
        validateEmail(`user${i}@example.com`);
        validatePhone(`555-${String(i).padStart(4, '0')}-1234`);
        validateRequired({ 
          name: `User ${i}`, 
          email: `user${i}@example.com` 
        }, ['name', 'email']);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms for 1000 operations)
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle concurrent API requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        handleApiRequest(async () => ({
          id: i,
          timestamp: Date.now()
        }))
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all responses have unique data
      const bodies = await Promise.all(responses.map(r => r.json()));
      const ids = bodies.map(b => b.id);
      expect(new Set(ids).size).toBe(10);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely long email addresses', () => {
      const longEmail = `${'a'.repeat(100)  }@${  'b'.repeat(100)  }.com`;
      const result = validateEmail(longEmail);
      expect(result).toBe(true);
    });

    it('should handle international characters in validation', () => {
      const internationalData = {
        name: 'José García',
        email: 'josé@example.com',
        message: 'Möchte einen Termin vereinbaren'
      };

      const requiredError = validateRequired(internationalData, ['name', 'email', 'message']);
      expect(requiredError).toBeNull();
    });

    it('should handle very large JSON payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'Lorem ipsum dolor sit amet'.repeat(10)
        }))
      };

      const request = new Request('http://localhost/api/bulk', {
        method: 'POST',
        body: JSON.stringify(largeData),
        headers: { 'Content-Type': 'application/json' }
      });

      const parsed = await parseJsonBody(request);
      expect(parsed).toBeTruthy();
      expect(parsed.items).toHaveLength(1000);
    });

    it('should handle empty response data gracefully', async () => {
      const emptyArrayResponse = successResponse([]);
      expect(await emptyArrayResponse.json()).toEqual([]);

      const emptyObjectResponse = successResponse({});
      expect(await emptyObjectResponse.json()).toEqual({});

      const nullResponse = successResponse(null);
      expect(await nullResponse.json()).toBeNull();
    });
  });

  describe('Security Scenarios', () => {
    it('should not expose sensitive error information', async () => {
      const sensitiveErrors = [
        'Password incorrect for user admin@example.com',
        'API key XYZ123 is invalid',
        'Database connection string: postgresql://user:pass@host/db',
        'JWT secret: supersecret123'
      ];

      for (const errorMessage of sensitiveErrors) {
        const response = await handleApiRequest(async () => {
          throw new Error(errorMessage);
        });

        const body = await response.json();
        expect(body.error).toBe('Internal server error');
        expect(body.error).not.toContain('password');
        expect(body.error).not.toContain('key');
        expect(body.error).not.toContain('secret');
      }
    });

    it('should handle SQL injection attempts in validation', () => {
      const maliciousInputs = [
        "admin'--",
        '1; DROP TABLE users;',
        "' OR '1'='1",
        "<script>alert('xss')</script>"
      ];

      maliciousInputs.forEach(input => {
        // Email validation should reject these
        expect(validateEmail(input)).toBe(false);
        
        // Required validation should still work correctly
        const result = validateRequired({ data: input }, ['data']);
        expect(result).toBeNull(); // The value exists, even if malicious
      });
    });
  });

  describe('Response Header Security', () => {
    it('should set proper content-type headers', () => {
      const responses = [
        errorResponse('Error'),
        successResponse({ data: 'test' })
      ];

      responses.forEach(response => {
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });
  });
});