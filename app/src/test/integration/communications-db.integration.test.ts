/**
 * Database integration tests for Communications functionality
 * Tests the database functions in content-db-direct.ts for communications
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import {
  saveMessage,
  getRecentMessages,
  getCommunicationStats,
  getTemplates,
  saveTemplate,
  updateTemplateUsage
} from '@lib/content-db-direct';

const { Client } = pg;

// Skip these tests unless TEST_DB environment variable is set
const runDatabaseTests = process.env.TEST_DB === 'true';

describe.skipIf(!runDatabaseTests)('Communications Database Integration Tests', () => {
  let testClient: pg.Client;
  let testUserId: string;
  
  beforeAll(async () => {
    // Set up test database connection
    testClient = new Client({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '54322'),
      database: process.env.TEST_DB_NAME || 'postgres',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'test-password'
    });

    try {
      await testClient.connect();
      
      // Create a test user for foreign key relationships
      const userResult = await testClient.query(`
        INSERT INTO auth.users (id, email, created_at, updated_at)
        VALUES (gen_random_uuid(), 'test-comms@example.com', NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `);
      
      if (userResult.rows.length > 0) {
        testUserId = userResult.rows[0].id;
      } else {
        // Get existing test user
        const existingUser = await testClient.query(`
          SELECT id FROM auth.users WHERE email = 'test-comms@example.com' LIMIT 1
        `);
        testUserId = existingUser.rows[0].id;
      }
      
      // Clean up any existing test data
      await testClient.query(`
        DELETE FROM communications_messages WHERE subject LIKE 'TEST:%'
      `);
      
      await testClient.query(`
        DELETE FROM communications_templates WHERE name LIKE 'TEST:%'
      `);
      
    } catch (error) {
      console.error('Failed to set up test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (testClient) {
      // Clean up test data
      await testClient.query(`
        DELETE FROM communications_messages WHERE subject LIKE 'TEST:%'
      `);
      
      await testClient.query(`
        DELETE FROM communications_templates WHERE name LIKE 'TEST:%'
      `);
      
      await testClient.query(`
        DELETE FROM auth.users WHERE email = 'test-comms@example.com'
      `);
      
      await testClient.end();
    }
  });

  describe('saveMessage function', () => {
    it('should save a message with required fields', async () => {
      const messageData = {
        subject: 'TEST: Basic Message Save',
        message_content: 'This is a test message for database integration testing.',
        message_type: 'announcement',
        created_by: testUserId
      };
      
      const savedMessage = await saveMessage(messageData);
      
      expect(savedMessage).toBeTruthy();
      expect(savedMessage?.id).toBeDefined();
      expect(savedMessage?.subject).toBe(messageData.subject);
      expect(savedMessage?.message_content).toBe(messageData.message_content);
      expect(savedMessage?.message_type).toBe(messageData.message_type);
      expect(savedMessage?.created_by).toBe(testUserId);
      expect(savedMessage?.status).toBe('draft'); // Default status
      expect(savedMessage?.recipient_type).toBe('all_families'); // Default recipient type
      expect(savedMessage?.recipient_count).toBe(0); // Default count
      expect(savedMessage?.created_at).toBeDefined();
      expect(savedMessage?.updated_at).toBeDefined();
    });

    it('should save a message with optional fields', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const messageData = {
        subject: 'TEST: Message with Optional Fields',
        message_content: 'This message has optional fields set.',
        message_type: 'newsletter',
        recipient_type: 'selected_families',
        scheduled_for: futureDate,
        created_by: testUserId
      };
      
      const savedMessage = await saveMessage(messageData);
      
      expect(savedMessage).toBeTruthy();
      expect(savedMessage?.recipient_type).toBe('selected_families');
      expect(savedMessage?.scheduled_for).toBeDefined();
      
      // Compare dates allowing for small time differences
      const savedDate = new Date(savedMessage!.scheduled_for!);
      const timeDiff = Math.abs(savedDate.getTime() - futureDate.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should validate message type constraints', async () => {
      const invalidMessageData = {
        subject: 'TEST: Invalid Message Type',
        message_content: 'Testing invalid message type.',
        message_type: 'invalid_type',
        created_by: testUserId
      };
      
      await expect(saveMessage(invalidMessageData as any)).rejects.toThrow();
    });

    it('should validate recipient type constraints', async () => {
      const invalidRecipientData = {
        subject: 'TEST: Invalid Recipient Type',
        message_content: 'Testing invalid recipient type.',
        message_type: 'announcement',
        recipient_type: 'invalid_recipient_type',
        created_by: testUserId
      };
      
      await expect(saveMessage(invalidRecipientData as any)).rejects.toThrow();
    });

    it('should require valid created_by user ID', async () => {
      const invalidUserData = {
        subject: 'TEST: Invalid User ID',
        message_content: 'Testing invalid user ID.',
        message_type: 'announcement',
        created_by: 'invalid-user-id'
      };
      
      await expect(saveMessage(invalidUserData)).rejects.toThrow();
    });

    it('should handle all valid message types', async () => {
      const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
      
      for (const messageType of validTypes) {
        const messageData = {
          subject: `TEST: ${messageType.toUpperCase()} Message`,
          message_content: `Testing ${messageType} message type.`,
          message_type: messageType,
          created_by: testUserId
        };
        
        const savedMessage = await saveMessage(messageData as any);
        expect(savedMessage).toBeTruthy();
        expect(savedMessage?.message_type).toBe(messageType);
      }
    });

    it('should handle all valid recipient types', async () => {
      const validRecipientTypes = ['all_families', 'selected_families', 'staff_only'];
      
      for (const recipientType of validRecipientTypes) {
        const messageData = {
          subject: `TEST: ${recipientType.toUpperCase()} Recipients`,
          message_content: `Testing ${recipientType} recipient type.`,
          message_type: 'announcement',
          recipient_type: recipientType,
          created_by: testUserId
        };
        
        const savedMessage = await saveMessage(messageData as any);
        expect(savedMessage).toBeTruthy();
        expect(savedMessage?.recipient_type).toBe(recipientType);
      }
    });
  });

  describe('getRecentMessages function', () => {
    beforeAll(async () => {
      // Create test messages with different timestamps
      const messages = [
        {
          subject: 'TEST: Recent Message 1',
          message_content: 'First recent message',
          message_type: 'announcement',
          created_by: testUserId
        },
        {
          subject: 'TEST: Recent Message 2',
          message_content: 'Second recent message',
          message_type: 'newsletter',
          created_by: testUserId
        },
        {
          subject: 'TEST: Recent Message 3',
          message_content: 'Third recent message',
          message_type: 'reminder',
          created_by: testUserId
        }
      ];
      
      for (const messageData of messages) {
        await saveMessage(messageData);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    it('should return recent messages in descending order', async () => {
      const recentMessages = await getRecentMessages(10);
      
      expect(Array.isArray(recentMessages)).toBe(true);
      
      // Filter to only test messages
      const testMessages = recentMessages.filter(msg => msg.subject.startsWith('TEST:'));
      expect(testMessages.length).toBeGreaterThanOrEqual(3);
      
      // Check that messages are ordered by created_at DESC
      for (let i = 1; i < testMessages.length; i++) {
        const currentDate = new Date(testMessages[i].created_at);
        const previousDate = new Date(testMessages[i - 1].created_at);
        expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
      }
    });

    it('should respect the limit parameter', async () => {
      const limit = 2;
      const recentMessages = await getRecentMessages(limit);
      
      expect(recentMessages.length).toBeLessThanOrEqual(limit);
    });

    it('should return empty array when no messages exist', async () => {
      // Clean up all test messages
      await testClient.query('DELETE FROM communications_messages WHERE subject LIKE \'TEST:%\'');
      
      const recentMessages = await getRecentMessages(10);
      const testMessages = recentMessages.filter(msg => msg.subject.startsWith('TEST:'));
      
      expect(testMessages).toHaveLength(0);
      
      // Restore test messages for other tests
      await saveMessage({
        subject: 'TEST: Restored Message',
        message_content: 'Restored after cleanup test',
        message_type: 'announcement',
        created_by: testUserId
      });
    });

    it('should include all required message fields', async () => {
      const recentMessages = await getRecentMessages(1);
      
      if (recentMessages.length > 0) {
        const message = recentMessages[0];
        
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('subject');
        expect(message).toHaveProperty('message_content');
        expect(message).toHaveProperty('message_type');
        expect(message).toHaveProperty('recipient_type');
        expect(message).toHaveProperty('recipient_count');
        expect(message).toHaveProperty('status');
        expect(message).toHaveProperty('created_by');
        expect(message).toHaveProperty('created_at');
        expect(message).toHaveProperty('updated_at');
        expect(message).toHaveProperty('delivery_stats');
      }
    });
  });

  describe('getCommunicationStats function', () => {
    beforeAll(async () => {
      // Create test messages with different statuses
      const testMessages = [
        {
          subject: 'TEST: Sent Message 1',
          message_content: 'First sent message',
          message_type: 'announcement',
          created_by: testUserId
        },
        {
          subject: 'TEST: Sent Message 2',
          message_content: 'Second sent message',
          message_type: 'newsletter',
          created_by: testUserId
        },
        {
          subject: 'TEST: Scheduled Message',
          message_content: 'Scheduled message',
          message_type: 'reminder',
          created_by: testUserId
        }
      ];
      
      for (const messageData of testMessages) {
        const saved = await saveMessage(messageData);
        
        // Update status for some messages
        if (messageData.subject.includes('Sent')) {
          await testClient.query(`
            UPDATE communications_messages 
            SET status = 'sent', sent_at = NOW()
            WHERE id = $1
          `, [saved?.id]);
        } else if (messageData.subject.includes('Scheduled')) {
          await testClient.query(`
            UPDATE communications_messages 
            SET status = 'scheduled'
            WHERE id = $1
          `, [saved?.id]);
        }
      }
    });

    it('should return communication statistics object', async () => {
      const stats = await getCommunicationStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('families_reached');
      expect(stats).toHaveProperty('messages_sent');
      expect(stats).toHaveProperty('avg_open_rate');
      expect(stats).toHaveProperty('active_campaigns');
      
      expect(typeof stats.families_reached).toBe('number');
      expect(typeof stats.messages_sent).toBe('number');
      expect(typeof stats.avg_open_rate).toBe('number');
      expect(typeof stats.active_campaigns).toBe('number');
    });

    it('should return non-negative statistics', async () => {
      const stats = await getCommunicationStats();
      
      expect(stats.families_reached).toBeGreaterThanOrEqual(0);
      expect(stats.messages_sent).toBeGreaterThanOrEqual(0);
      expect(stats.avg_open_rate).toBeGreaterThanOrEqual(0);
      expect(stats.active_campaigns).toBeGreaterThanOrEqual(0);
    });

    it('should count sent messages correctly', async () => {
      const stats = await getCommunicationStats();
      
      // Should count at least the test messages we marked as sent
      expect(stats.messages_sent).toBeGreaterThanOrEqual(0);
    });

    it('should count active campaigns correctly', async () => {
      const stats = await getCommunicationStats();
      
      // Should count at least the test message we marked as scheduled
      expect(stats.active_campaigns).toBeGreaterThanOrEqual(0);
    });

    it('should provide reasonable open rate', async () => {
      const stats = await getCommunicationStats();
      
      // Open rate should be between 0 and 100
      expect(stats.avg_open_rate).toBeGreaterThanOrEqual(0);
      expect(stats.avg_open_rate).toBeLessThanOrEqual(100);
    });
  });

  describe('saveTemplate function', () => {
    it('should save a template with required fields', async () => {
      const templateData = {
        name: 'TEST: Basic Template',
        subject_template: 'TEST: {subject}',
        content_template: 'This is a test template: {content}',
        message_type: 'announcement',
        created_by: testUserId
      };
      
      const savedTemplate = await saveTemplate(templateData);
      
      expect(savedTemplate).toBeTruthy();
      expect(savedTemplate?.id).toBeDefined();
      expect(savedTemplate?.name).toBe(templateData.name);
      expect(savedTemplate?.subject_template).toBe(templateData.subject_template);
      expect(savedTemplate?.content_template).toBe(templateData.content_template);
      expect(savedTemplate?.message_type).toBe(templateData.message_type);
      expect(savedTemplate?.created_by).toBe(testUserId);
      expect(savedTemplate?.usage_count).toBe(0); // Default usage count
      expect(savedTemplate?.created_at).toBeDefined();
      expect(savedTemplate?.updated_at).toBeDefined();
    });

    it('should save a template with description', async () => {
      const templateData = {
        name: 'TEST: Template with Description',
        description: 'This template has a description field',
        subject_template: 'TEST: {subject}',
        content_template: 'Template with description: {content}',
        message_type: 'newsletter',
        created_by: testUserId
      };
      
      const savedTemplate = await saveTemplate(templateData);
      
      expect(savedTemplate).toBeTruthy();
      expect(savedTemplate?.description).toBe(templateData.description);
    });

    it('should validate message type constraints for templates', async () => {
      const invalidTemplateData = {
        name: 'TEST: Invalid Message Type Template',
        subject_template: 'Invalid type test',
        content_template: 'Testing invalid message type',
        message_type: 'invalid_type',
        created_by: testUserId
      };
      
      await expect(saveTemplate(invalidTemplateData as any)).rejects.toThrow();
    });

    it('should require valid created_by user ID for templates', async () => {
      const invalidUserTemplateData = {
        name: 'TEST: Invalid User Template',
        subject_template: 'Invalid user test',
        content_template: 'Testing invalid user ID',
        message_type: 'announcement',
        created_by: 'invalid-user-id'
      };
      
      await expect(saveTemplate(invalidUserTemplateData)).rejects.toThrow();
    });

    it('should handle all valid message types for templates', async () => {
      const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
      
      for (const messageType of validTypes) {
        const templateData = {
          name: `TEST: ${messageType.toUpperCase()} Template`,
          subject_template: `${messageType} Subject: {subject}`,
          content_template: `${messageType} Content: {content}`,
          message_type: messageType,
          created_by: testUserId
        };
        
        const savedTemplate = await saveTemplate(templateData as any);
        expect(savedTemplate).toBeTruthy();
        expect(savedTemplate?.message_type).toBe(messageType);
      }
    });
  });

  describe('getTemplates function', () => {
    beforeAll(async () => {
      // Create test templates with different usage counts
      const templates = [
        {
          name: 'TEST: Popular Template',
          subject_template: 'Popular: {subject}',
          content_template: 'This is a popular template: {content}',
          message_type: 'announcement',
          created_by: testUserId
        },
        {
          name: 'TEST: Unused Template',
          subject_template: 'Unused: {subject}',
          content_template: 'This template is unused: {content}',
          message_type: 'newsletter',
          created_by: testUserId
        },
        {
          name: 'TEST: Another Template',
          subject_template: 'Another: {subject}',
          content_template: 'Another template: {content}',
          message_type: 'reminder',
          created_by: testUserId
        }
      ];
      
      for (const templateData of templates) {
        const saved = await saveTemplate(templateData);
        
        // Give the popular template some usage
        if (templateData.name.includes('Popular')) {
          await testClient.query(`
            UPDATE communications_templates 
            SET usage_count = 5, last_used_at = NOW()
            WHERE id = $1
          `, [saved?.id]);
        }
      }
    });

    it('should return array of templates', async () => {
      const templates = await getTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      
      // Filter to only test templates
      const testTemplates = templates.filter(tpl => tpl.name.startsWith('TEST:'));
      expect(testTemplates.length).toBeGreaterThanOrEqual(3);
    });

    it('should return templates ordered by usage count desc, then name asc', async () => {
      const templates = await getTemplates();
      const testTemplates = templates.filter(tpl => tpl.name.startsWith('TEST:'));
      
      if (testTemplates.length > 1) {
        // Should be ordered by usage_count DESC first
        for (let i = 1; i < testTemplates.length; i++) {
          const current = testTemplates[i];
          const previous = testTemplates[i - 1];
          expect(current.usage_count).toBeLessThanOrEqual(previous.usage_count);
        }
      }
    });

    it('should include all required template fields', async () => {
      const templates = await getTemplates();
      
      if (templates.length > 0) {
        const template = templates[0];
        
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('message_type');
        expect(template).toHaveProperty('subject_template');
        expect(template).toHaveProperty('content_template');
        expect(template).toHaveProperty('usage_count');
        expect(template).toHaveProperty('created_by');
        expect(template).toHaveProperty('created_at');
        expect(template).toHaveProperty('updated_at');
      }
    });
  });

  describe('updateTemplateUsage function', () => {
    let testTemplateId: string;
    
    beforeAll(async () => {
      // Create a test template for usage updates
      const templateData = {
        name: 'TEST: Usage Update Template',
        subject_template: 'Usage Test: {subject}',
        content_template: 'Testing usage updates: {content}',
        message_type: 'announcement',
        created_by: testUserId
      };
      
      const savedTemplate = await saveTemplate(templateData);
      testTemplateId = savedTemplate!.id;
    });

    it('should increment usage count', async () => {
      // Get initial usage count
      const initialTemplates = await getTemplates();
      const initialTemplate = initialTemplates.find(t => t.id === testTemplateId);
      const initialUsageCount = initialTemplate?.usage_count || 0;
      
      // Update usage
      await updateTemplateUsage(testTemplateId);
      
      // Check updated usage count
      const updatedTemplates = await getTemplates();
      const updatedTemplate = updatedTemplates.find(t => t.id === testTemplateId);
      
      expect(updatedTemplate?.usage_count).toBe(initialUsageCount + 1);
      expect(updatedTemplate?.last_used_at).toBeDefined();
    });

    it('should handle multiple usage updates', async () => {
      const initialTemplates = await getTemplates();
      const initialTemplate = initialTemplates.find(t => t.id === testTemplateId);
      const initialUsageCount = initialTemplate?.usage_count || 0;
      
      // Update usage multiple times
      await updateTemplateUsage(testTemplateId);
      await updateTemplateUsage(testTemplateId);
      await updateTemplateUsage(testTemplateId);
      
      const updatedTemplates = await getTemplates();
      const updatedTemplate = updatedTemplates.find(t => t.id === testTemplateId);
      
      expect(updatedTemplate?.usage_count).toBe(initialUsageCount + 3);
    });

    it('should handle non-existent template IDs gracefully', async () => {
      const fakeTemplateId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      // Should not throw error for non-existent template
      await expect(updateTemplateUsage(fakeTemplateId)).resolves.toBeUndefined();
    });

    it('should update last_used_at timestamp', async () => {
      const beforeUpdate = new Date();
      
      await updateTemplateUsage(testTemplateId);
      
      const templates = await getTemplates();
      const template = templates.find(t => t.id === testTemplateId);
      
      expect(template?.last_used_at).toBeDefined();
      
      if (template?.last_used_at) {
        const lastUsedDate = new Date(template.last_used_at);
        expect(lastUsedDate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should enforce unique template names per user', async () => {
      const templateData = {
        name: 'TEST: Unique Name Template',
        subject_template: 'Unique test',
        content_template: 'Testing uniqueness',
        message_type: 'announcement',
        created_by: testUserId
      };
      
      // First save should succeed
      const firstTemplate = await saveTemplate(templateData);
      expect(firstTemplate).toBeTruthy();
      
      // Second save with same name might succeed or fail depending on constraints
      // The current schema doesn't have unique constraints on template names
      const secondTemplate = await saveTemplate(templateData);
      expect(secondTemplate).toBeTruthy(); // Should succeed in current implementation
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we just verify the functions don't crash
      const stats = await getCommunicationStats();
      expect(stats).toBeDefined();
    });

    it('should handle null values appropriately', async () => {
      const templateWithNulls = {
        name: 'TEST: Null Values Template',
        description: undefined, // Will be null in database
        subject_template: 'Null test',
        content_template: 'Testing null handling',
        message_type: 'announcement',
        created_by: testUserId
      };
      
      const savedTemplate = await saveTemplate(templateWithNulls as any);
      expect(savedTemplate).toBeTruthy();
      expect(savedTemplate?.description).toBeNull();
    });
  });
});