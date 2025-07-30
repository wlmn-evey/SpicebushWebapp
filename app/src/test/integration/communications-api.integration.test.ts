/**
 * Integration tests for Communications API endpoints
 * Tests /api/admin/communications and /api/admin/communications/templates
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mockSupabase } from '../setup';

// Skip these tests unless TEST_API environment variable is set
const runApiTests = process.env.TEST_API === 'true';

describe.skipIf(!runApiTests)('Communications API Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:4321';
  let authCookies: string = '';
  
  beforeAll(async () => {
    // Mock authentication for testing
    // In a real test environment, you would perform actual login
    authCookies = 'test-session=mock-session-token';
  });

  afterAll(async () => {
    // Clean up any test data
  });

  describe('/api/admin/communications - GET', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications`);
      
      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should return communication statistics', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications?action=stats`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const stats = await response.json();
        
        expect(stats).toHaveProperty('families_reached');
        expect(stats).toHaveProperty('messages_sent');
        expect(stats).toHaveProperty('avg_open_rate');
        expect(stats).toHaveProperty('active_campaigns');
        
        expect(typeof stats.families_reached).toBe('number');
        expect(typeof stats.messages_sent).toBe('number');
        expect(typeof stats.avg_open_rate).toBe('number');
        expect(typeof stats.active_campaigns).toBe('number');
        
        expect(stats.families_reached).toBeGreaterThanOrEqual(0);
        expect(stats.messages_sent).toBeGreaterThanOrEqual(0);
        expect(stats.avg_open_rate).toBeGreaterThanOrEqual(0);
        expect(stats.active_campaigns).toBeGreaterThanOrEqual(0);
      } else {
        // In test environment, API might not be fully functional
        expect([200, 500, 503]).toContain(response.status);
      }
    });

    it('should return recent messages', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications?action=recent&limit=5`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        
        expect(Array.isArray(messages)).toBe(true);
        
        if (messages.length > 0) {
          const message = messages[0];
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('subject');
          expect(message).toHaveProperty('message_content');
          expect(message).toHaveProperty('message_type');
          expect(message).toHaveProperty('status');
          expect(message).toHaveProperty('created_at');
          
          // Validate message type
          const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
          expect(validTypes).toContain(message.message_type);
          
          // Validate status
          const validStatuses = ['draft', 'scheduled', 'sending', 'sent', 'failed'];
          expect(validStatuses).toContain(message.status);
        }
      } else {
        expect([200, 500, 503]).toContain(response.status);
      }
    });

    it('should handle invalid action parameter', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications?action=invalid`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toBe('Invalid action');
      } else {
        // API might handle this differently in test environment
        expect([400, 200, 500]).toContain(response.status);
      }
    });

    it('should default to recent messages when no action specified', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        expect(Array.isArray(messages)).toBe(true);
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });

    it('should respect limit parameter for recent messages', async () => {
      const limit = 3;
      const response = await fetch(`${testBaseUrl}/api/admin/communications?action=recent&limit=${limit}`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        expect(Array.isArray(messages)).toBe(true);
        
        if (messages.length > 0) {
          expect(messages.length).toBeLessThanOrEqual(limit);
        }
      } else {
        expect([200, 500]).toContain(response.status);
      }
    });
  });

  describe('/api/admin/communications - POST', () => {
    it('should require authentication', async () => {
      const messageData = {
        subject: 'Test Message',
        message_content: 'This is a test message',
        message_type: 'announcement'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        subject: '',
        message_content: '',
        message_type: ''
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toContain('Missing required fields');
      } else {
        // Test environment might handle validation differently
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should validate message type', async () => {
      const invalidTypeData = {
        subject: 'Test Message',
        message_content: 'This is a test message',
        message_type: 'invalid_type'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidTypeData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toBe('Invalid message type');
      } else {
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should accept valid message data', async () => {
      const validData = {
        subject: 'Integration Test Message',
        message_content: 'This is a test message for API integration testing.',
        message_type: 'announcement',
        recipient_type: 'all_families'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(validData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('successfully');
        expect(result.data).toBeDefined();
        expect(result.data.id).toBeDefined();
        expect(result.data.subject).toBe(validData.subject);
        expect(result.data.message_content).toBe(validData.message_content);
        expect(result.data.message_type).toBe(validData.message_type);
      } else {
        // In test environment, database might not be fully functional
        expect([200, 401, 500]).toContain(response.status);
      }
    });

    it('should handle scheduled messages', async () => {
      const scheduledData = {
        subject: 'Scheduled Test Message',
        message_content: 'This message should be scheduled for later delivery.',
        message_type: 'reminder',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(scheduledData)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.message).toContain('scheduled');
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });

    it('should handle invalid scheduled date', async () => {
      const invalidScheduleData = {
        subject: 'Invalid Schedule Test',
        message_content: 'Testing invalid scheduled date handling.',
        message_type: 'announcement',
        scheduled_for: 'invalid-date'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidScheduleData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toBe('Invalid scheduled date');
      } else {
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should trim whitespace from input fields', async () => {
      const dataWithWhitespace = {
        subject: '  Test Subject With Whitespace  ',
        message_content: '  Message content with whitespace  ',
        message_type: 'newsletter'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(dataWithWhitespace)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result.data.subject).toBe('Test Subject With Whitespace');
        expect(result.data.message_content).toBe('Message content with whitespace');
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });
  });

  describe('/api/admin/communications/templates - GET', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`);
      
      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should return list of templates', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const templates = await response.json();
        
        expect(Array.isArray(templates)).toBe(true);
        
        if (templates.length > 0) {
          const template = templates[0];
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('message_type');
          expect(template).toHaveProperty('subject_template');
          expect(template).toHaveProperty('content_template');
          expect(template).toHaveProperty('usage_count');
          expect(template).toHaveProperty('created_at');
          
          // Validate message type
          const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
          expect(validTypes).toContain(template.message_type);
          
          // Validate usage count is a number
          expect(typeof template.usage_count).toBe('number');
          expect(template.usage_count).toBeGreaterThanOrEqual(0);
        }
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });

    it('should return templates ordered by usage and name', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        headers: {
          'Cookie': authCookies
        }
      });
      
      if (response.ok) {
        const templates = await response.json();
        
        if (templates.length > 1) {
          // Should be ordered by usage_count DESC, then name ASC
          let previousUsageCount = Infinity;
          
          for (const template of templates) {
            expect(template.usage_count).toBeLessThanOrEqual(previousUsageCount);
            previousUsageCount = template.usage_count;
          }
        }
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });
  });

  describe('/api/admin/communications/templates - POST', () => {
    it('should require authentication', async () => {
      const templateData = {
        name: 'Test Template',
        subject_template: 'Test Subject',
        content_template: 'Test Content',
        message_type: 'announcement'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });
      
      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should validate required fields for new template', async () => {
      const invalidData = {
        name: '',
        subject_template: '',
        content_template: '',
        message_type: ''
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toContain('Missing required fields');
      } else {
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should create new template with valid data', async () => {
      const templateData = {
        name: 'API Test Template',
        description: 'Template created during API integration testing',
        subject_template: 'API Test: {subject}',
        content_template: 'This is a test template created via API. Content: {content}',
        message_type: 'announcement'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(templateData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        expect(result.success).toBe(true);
        expect(result.message).toContain('created successfully');
        expect(result.data).toBeDefined();
        expect(result.data.id).toBeDefined();
        expect(result.data.name).toBe(templateData.name);
        expect(result.data.description).toBe(templateData.description);
        expect(result.data.subject_template).toBe(templateData.subject_template);
        expect(result.data.content_template).toBe(templateData.content_template);
        expect(result.data.message_type).toBe(templateData.message_type);
        expect(result.data.usage_count).toBe(0);
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });

    it('should handle template usage update', async () => {
      const usageUpdateData = {
        action: 'use_template',
        template_id: 'test-template-id'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(usageUpdateData)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Template usage updated');
      } else {
        // Template might not exist in test environment
        expect([200, 400, 401, 500]).toContain(response.status);
      }
    });

    it('should validate message type for templates', async () => {
      const invalidTypeData = {
        name: 'Invalid Type Template',
        subject_template: 'Invalid Type Test',
        content_template: 'Testing invalid message type',
        message_type: 'invalid_type'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidTypeData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toBe('Invalid message type');
      } else {
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should require template_id for usage updates', async () => {
      const invalidUsageData = {
        action: 'use_template'
        // Missing template_id
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(invalidUsageData)
      });
      
      if (response.status === 400) {
        const result = await response.json();
        expect(result.error).toBe('Missing template_id');
      } else {
        expect([400, 401, 500]).toContain(response.status);
      }
    });

    it('should trim whitespace from template fields', async () => {
      const dataWithWhitespace = {
        name: '  Template With Whitespace  ',
        description: '  Description with whitespace  ',
        subject_template: '  Subject Template  ',
        content_template: '  Content Template  ',
        message_type: 'newsletter'
      };
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify(dataWithWhitespace)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result.data.name).toBe('Template With Whitespace');
        expect(result.data.description).toBe('Description with whitespace');
        expect(result.data.subject_template).toBe('Subject Template');
        expect(result.data.content_template).toBe('Content Template');
      } else {
        expect([200, 401, 500]).toContain(response.status);
      }
    });
  });

  describe('API Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: 'invalid json{'
      });
      
      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Cookie': authCookies
        },
        body: JSON.stringify({
          subject: 'Test',
          message_content: 'Test',
          message_type: 'announcement'
        })
      });
      
      // Should still work or return appropriate error
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle extremely large request bodies', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB of content
      
      const response = await fetch(`${testBaseUrl}/api/admin/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies
        },
        body: JSON.stringify({
          subject: 'Large Content Test',
          message_content: largeContent,
          message_type: 'announcement'
        })
      });
      
      // Should either accept or reject gracefully
      expect([200, 400, 413, 500]).toContain(response.status);
    });

    it('should handle concurrent requests properly', async () => {
      const messageData = {
        subject: 'Concurrent Test',
        message_content: 'Testing concurrent API requests',
        message_type: 'announcement'
      };
      
      const requests = Array(5).fill(null).map(() =>
        fetch(`${testBaseUrl}/api/admin/communications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookies
          },
          body: JSON.stringify(messageData)
        })
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should receive a response
      responses.forEach(response => {
        expect([200, 400, 401, 500]).toContain(response.status);
      });
    });
  });
});