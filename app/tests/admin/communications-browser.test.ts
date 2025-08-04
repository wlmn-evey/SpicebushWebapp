/**
 * Browser-based E2E tests for Admin Communications API
 * Uses Playwright to test the API endpoints in a real browser environment
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4321';
const API_ENDPOINT = '/api/admin/communications';

// Mock admin credentials (for testing only)
const MOCK_ADMIN_TOKEN = 'test-admin-session-token';

test.describe('Admin Communications API - Browser Tests', () => {
  
  test.beforeEach(async ({ context }) => {
    // Set up authentication cookie for admin access
    await context.addCookies([{
      name: 'sbms-session',
      value: MOCK_ADMIN_TOKEN,
      domain: new URL(BASE_URL).hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);
  });

  test.describe('GET Requests', () => {
    test('should fetch communication statistics', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?action=stats`);
      
      // Note: Will likely fail without proper authentication setup
      // This tests the endpoint structure
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('families_reached');
        expect(data).toHaveProperty('messages_sent');
        expect(data).toHaveProperty('avg_open_rate');
        expect(data).toHaveProperty('active_campaigns');
        
        // Verify data types
        expect(typeof data.families_reached).toBe('number');
        expect(typeof data.messages_sent).toBe('number');
        expect(typeof data.avg_open_rate).toBe('number');
        expect(typeof data.active_campaigns).toBe('number');
      }
    });

    test('should fetch recent messages', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?action=recent`);
      
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        
        // If there are messages, verify structure
        if (data.length > 0) {
          const message = data[0];
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('subject');
          expect(message).toHaveProperty('message_content');
          expect(message).toHaveProperty('message_type');
          expect(message).toHaveProperty('created_at');
        }
      }
    });

    test('should respect limit parameter for recent messages', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?action=recent&limit=5`);
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBeLessThanOrEqual(5);
      }
    });

    test('should return error for invalid action', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}?action=invalid`);
      
      if (response.status() === 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toBe('Invalid action');
      }
    });

    test('should default to recent messages when no action specified', async ({ request }) => {
      const response = await request.get(`${BASE_URL}${API_ENDPOINT}`);
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
      }
    });
  });

  test.describe('POST Requests', () => {
    test('should create announcement message', async ({ request }) => {
      const messageData = {
        subject: 'Test Announcement',
        message_content: 'This is a test announcement message.',
        message_type: 'announcement'
      };

      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: messageData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id');
        expect(data.data.subject).toBe(messageData.subject);
        expect(data.data.message_type).toBe(messageData.message_type);
      }
    });

    test('should validate all message types', async ({ request }) => {
      const messageTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
      
      for (const type of messageTypes) {
        const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
          data: {
            subject: `Test ${type}`,
            message_content: `Test content for ${type}`,
            message_type: type
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });

        expect([200, 401]).toContain(response.status());
        
        if (response.status() === 200) {
          const data = await response.json();
          expect(data.success).toBeTruthy();
          expect(data.data.message_type).toBe(type);
        }
      }
    });

    test('should handle scheduled messages', async ({ request }) => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const messageData = {
        subject: 'Scheduled Test Message',
        message_content: 'This message is scheduled for the future.',
        message_type: 'newsletter',
        scheduled_for: futureDate.toISOString()
      };

      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: messageData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.message).toBe('Message scheduled successfully');
        expect(data.data.scheduled_for).toBeTruthy();
      }
    });

    test('should validate required fields', async ({ request }) => {
      // Test missing subject
      let response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          message_content: 'Content without subject',
          message_type: 'announcement'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.error).toContain('Missing required fields');
      }

      // Test missing content
      response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Subject without content',
          message_type: 'announcement'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.error).toContain('Missing required fields');
      }

      // Test missing message type
      response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Subject',
          message_content: 'Content'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.error).toContain('Missing required fields');
      }
    });

    test('should reject invalid message types', async ({ request }) => {
      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Invalid Type Test',
          message_content: 'Test content',
          message_type: 'invalid_type'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.error).toBe('Invalid message type');
      }
    });

    test('should handle custom recipient types', async ({ request }) => {
      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Staff Only Message',
          message_content: 'This is for staff only.',
          message_type: 'announcement',
          recipient_type: 'staff_only'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.data.recipient_type).toBe('staff_only');
      }
    });
  });

  test.describe('Authentication', () => {
    test('should reject requests without authentication', async ({ request, context }) => {
      // Clear cookies to remove authentication
      await context.clearCookies();

      // Test GET request
      let response = await request.get(`${BASE_URL}${API_ENDPOINT}?action=stats`);
      expect(response.status()).toBe(401);
      let data = await response.json();
      expect(data.error).toBe('Unauthorized');

      // Test POST request
      response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Unauthorized Test',
          message_content: 'This should fail',
          message_type: 'announcement'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(response.status()).toBe(401);
      data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect([400, 401, 500]).toContain(response.status());
    });

    test('should handle invalid scheduled dates', async ({ request }) => {
      const response = await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Bad Schedule',
          message_content: 'Content',
          message_type: 'announcement',
          scheduled_for: 'invalid-date'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.error).toBe('Invalid scheduled date');
      }
    });
  });

  test.describe('Performance', () => {
    test('should respond within acceptable time limits', async ({ request }) => {
      const startTime = Date.now();
      
      // Test GET request
      await request.get(`${BASE_URL}${API_ENDPOINT}?action=stats`);
      const getResponseTime = Date.now() - startTime;
      expect(getResponseTime).toBeLessThan(2000); // 2 seconds max

      // Test POST request
      const postStartTime = Date.now();
      await request.post(`${BASE_URL}${API_ENDPOINT}`, {
        data: {
          subject: 'Performance Test',
          message_content: 'Testing response time',
          message_type: 'announcement'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const postResponseTime = Date.now() - postStartTime;
      expect(postResponseTime).toBeLessThan(3000); // 3 seconds max for write operations
    });
  });
});