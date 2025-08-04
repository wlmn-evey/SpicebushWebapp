/**
 * Admin Communications API Tests
 * Tests for /api/admin/communications endpoint
 * 
 * Covers:
 * - GET with ?action=stats for statistics
 * - GET with ?action=recent for recent messages
 * - POST for creating new messages
 * - Authentication enforcement
 * - Message types: announcement, newsletter, emergency, reminder, event
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { APIRoute } from 'astro';

// Mock the database operations
vi.mock('@lib/content-db-direct', () => ({
  getRecentMessages: vi.fn(),
  getCommunicationStats: vi.fn()
}));

// Mock the auth check
vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

// Mock the audit logger
vi.mock('@lib/audit-logger', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    logAction: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the API utils
vi.mock('@lib/api-utils', () => ({
  errorResponse: vi.fn((message, status) => new Response(
    JSON.stringify({ error: message }), 
    { status, headers: { 'Content-Type': 'application/json' } }
  ))
}));

// Mock Supabase
vi.mock('@lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn()
  }
}));

import { getRecentMessages, getCommunicationStats } from '@lib/content-db-direct';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { errorResponse } from '@lib/api-utils';
import { supabase } from '@lib/supabase';

// Import the API handlers
const communicationsModule = await import('../../src/pages/api/admin/communications');

describe('Admin Communications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated GET requests', async () => {
      (checkAdminAuth as any).mockResolvedValue({ isAuthenticated: false });

      const url = new URL('http://localhost/api/admin/communications');
      const cookies = {};
      const response = await communicationsModule.GET({ url, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(getRecentMessages).not.toHaveBeenCalled();
      expect(getCommunicationStats).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated POST requests', async () => {
      (checkAdminAuth as any).mockResolvedValue({ 
        isAuthenticated: false,
        session: null 
      });

      const request = new Request('http://localhost/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Test Message',
          message_content: 'Test content',
          message_type: 'announcement'
        })
      });
      const cookies = {};

      const response = await communicationsModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/communications', () => {
    beforeEach(() => {
      (checkAdminAuth as any).mockResolvedValue({ 
        isAuthenticated: true,
        session: { user_id: 'admin-123' }
      });
    });

    describe('?action=stats', () => {
      it('should return communication statistics', async () => {
        const mockStats = {
          families_reached: 47,
          messages_sent: 12,
          avg_open_rate: 89,
          active_campaigns: 3
        };

        (getCommunicationStats as any).mockResolvedValue(mockStats);

        const url = new URL('http://localhost/api/admin/communications?action=stats');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/json');
        expect(data).toEqual(mockStats);
        expect(getCommunicationStats).toHaveBeenCalledTimes(1);
      });

      it('should handle errors when fetching stats', async () => {
        (getCommunicationStats as any).mockRejectedValue(new Error('Database error'));

        const url = new URL('http://localhost/api/admin/communications?action=stats');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to fetch communications data');
      });
    });

    describe('?action=recent', () => {
      it('should return recent messages with default limit', async () => {
        const mockMessages = [
          {
            id: '1',
            subject: 'School Closure Notice',
            message_content: 'Due to weather conditions...',
            message_type: 'emergency',
            recipient_type: 'all_families',
            status: 'sent',
            created_at: '2025-01-31T10:00:00Z'
          },
          {
            id: '2',
            subject: 'Field Trip Reminder',
            message_content: 'Just a reminder about...',
            message_type: 'reminder',
            recipient_type: 'selected_families',
            status: 'sent',
            created_at: '2025-01-30T14:00:00Z'
          }
        ];

        (getRecentMessages as any).mockResolvedValue(mockMessages);

        const url = new URL('http://localhost/api/admin/communications?action=recent');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockMessages);
        expect(getRecentMessages).toHaveBeenCalledWith(10); // Default limit
      });

      it('should return recent messages with custom limit', async () => {
        const mockMessages = [];
        (getRecentMessages as any).mockResolvedValue(mockMessages);

        const url = new URL('http://localhost/api/admin/communications?action=recent&limit=20');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);

        expect(response.status).toBe(200);
        expect(getRecentMessages).toHaveBeenCalledWith(20);
      });

      it('should handle invalid limit parameter', async () => {
        const url = new URL('http://localhost/api/admin/communications?action=recent&limit=invalid');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);

        expect(response.status).toBe(200);
        expect(getRecentMessages).toHaveBeenCalledWith(10); // Falls back to default
      });
    });

    describe('No action or default behavior', () => {
      it('should default to recent messages when no action specified', async () => {
        const mockMessages = [{
          id: '1',
          subject: 'Default behavior test',
          message_type: 'announcement'
        }];

        (getRecentMessages as any).mockResolvedValue(mockMessages);

        const url = new URL('http://localhost/api/admin/communications');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockMessages);
        expect(getRecentMessages).toHaveBeenCalledWith(10);
      });
    });

    describe('Invalid actions', () => {
      it('should return error for invalid action', async () => {
        const url = new URL('http://localhost/api/admin/communications?action=invalid');
        const cookies = {};
        const response = await communicationsModule.GET({ url, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action');
      });
    });
  });

  describe('POST /api/admin/communications', () => {
    beforeEach(() => {
      (checkAdminAuth as any).mockResolvedValue({ 
        isAuthenticated: true,
        session: { user_id: 'admin-123', userEmail: 'admin@spicebush.edu' }
      });

      // Reset Supabase mock
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
      (supabase as any).from = mockSupabase.from;
      (supabase as any).from().insert = mockSupabase.insert;
      (supabase as any).from().insert().select = mockSupabase.select;
      (supabase as any).from().insert().select().single = mockSupabase.single;
    });

    describe('Message creation', () => {
      it('should successfully create an announcement message', async () => {
        const savedMessage = {
          id: 'msg-123',
          subject: 'Important Announcement',
          message_content: 'This is an important announcement for all families.',
          message_type: 'announcement',
          recipient_type: 'all_families',
          scheduled_for: null,
          created_by: 'admin-123',
          recipient_count: 0
        };

        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: savedMessage,
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.100'
          },
          body: JSON.stringify({
            subject: 'Important Announcement',
            message_content: 'This is an important announcement for all families.',
            message_type: 'announcement'
          })
        });
        const cookies = {};

        const response = await communicationsModule.POST({ request, cookies } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Message sent successfully');
        expect(data.data).toEqual(savedMessage);

        // Verify Supabase was called correctly
        expect(supabase.from).toHaveBeenCalledWith('communications_messages');
        expect(supabase.from().insert).toHaveBeenCalledWith({
          subject: 'Important Announcement',
          message_content: 'This is an important announcement for all families.',
          message_type: 'announcement',
          recipient_type: 'all_families',
          scheduled_for: null,
          created_by: 'admin-123',
          recipient_count: 0
        });
      });

      it('should create messages for all valid message types', async () => {
        const messageTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];

        for (const messageType of messageTypes) {
          vi.clearAllMocks();
          
          (checkAdminAuth as any).mockResolvedValue({ 
            isAuthenticated: true,
            session: { user_id: 'admin-123' }
          });

          (supabase.from().insert().select().single as any).mockResolvedValue({
            data: { id: `msg-${messageType}`, message_type: messageType },
            error: null
          });

          const request = new Request('http://localhost/api/admin/communications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: `Test ${messageType}`,
              message_content: `Content for ${messageType}`,
              message_type: messageType
            })
          });

          const response = await communicationsModule.POST({ request, cookies: {} } as any);
          const data = await response.json();

          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.data.message_type).toBe(messageType);
        }
      });

      it('should handle scheduled messages', async () => {
        const scheduledDate = new Date('2025-02-15T10:00:00Z');
        const savedMessage = {
          id: 'msg-scheduled',
          subject: 'Scheduled Newsletter',
          message_type: 'newsletter',
          scheduled_for: scheduledDate.toISOString()
        };

        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: savedMessage,
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Scheduled Newsletter',
            message_content: 'Monthly newsletter content',
            message_type: 'newsletter',
            scheduled_for: '2025-02-15T10:00:00Z'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Message scheduled successfully');
        expect(data.data.scheduled_for).toBe(scheduledDate.toISOString());
      });

      it('should handle custom recipient types', async () => {
        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: { id: 'msg-staff', recipient_type: 'staff_only' },
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Staff Meeting',
            message_content: 'Staff only message',
            message_type: 'announcement',
            recipient_type: 'staff_only'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        
        expect(response.status).toBe(200);
        expect(supabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            recipient_type: 'staff_only'
          })
        );
      });

      it('should trim whitespace from subject and content', async () => {
        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: { id: 'msg-trimmed' },
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: '  Trimmed Subject  ',
            message_content: '  Trimmed content  ',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);

        expect(response.status).toBe(200);
        expect(supabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'Trimmed Subject',
            message_content: 'Trimmed content'
          })
        );
      });
    });

    describe('Validation', () => {
      it('should require subject field', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_content: 'Content without subject',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required fields: subject, message_content, message_type');
        expect(supabase.from).not.toHaveBeenCalled();
      });

      it('should require message_content field', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Subject without content',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required fields: subject, message_content, message_type');
      });

      it('should require message_type field', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Subject',
            message_content: 'Content'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required fields: subject, message_content, message_type');
      });

      it('should reject invalid message types', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Invalid Type Test',
            message_content: 'Test content',
            message_type: 'invalid_type'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid message type');
        expect(supabase.from).not.toHaveBeenCalled();
      });

      it('should reject invalid scheduled dates', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Bad Schedule',
            message_content: 'Content',
            message_type: 'announcement',
            scheduled_for: 'invalid-date'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid scheduled date');
      });

      it('should handle malformed JSON', async () => {
        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to save message');
      });
    });

    describe('Error handling', () => {
      it('should handle database save errors', async () => {
        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Error Test',
            message_content: 'This should fail',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to save message');
      });

      it('should handle unexpected errors gracefully', async () => {
        (supabase.from as any).mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Crash Test',
            message_content: 'This should handle errors',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to save message');
      });
    });

    describe('Audit logging', () => {
      it('should log communication actions with IP address', async () => {
        const mockAuditLog = vi.fn().mockResolvedValue(undefined);
        vi.mocked(await import('@lib/audit-logger')).AuditLogger.mockImplementation(() => ({
          logAction: mockAuditLog
        } as any));

        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: {
            id: 'msg-audit',
            subject: 'Audit Test',
            message_type: 'announcement',
            recipient_type: 'all_families'
          },
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.50',
            'x-real-ip': '192.168.1.51'
          },
          body: JSON.stringify({
            subject: 'Audit Test',
            message_content: 'Testing audit logging',
            message_type: 'announcement'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);

        expect(response.status).toBe(200);
        expect(mockAuditLog).toHaveBeenCalledWith(
          'communication_sent',
          'communications_messages',
          'msg-audit',
          {
            subject: 'Audit Test',
            message_type: 'announcement',
            recipient_type: 'all_families',
            scheduled: false
          }
        );
      });

      it('should mark scheduled messages in audit log', async () => {
        const mockAuditLog = vi.fn().mockResolvedValue(undefined);
        vi.mocked(await import('@lib/audit-logger')).AuditLogger.mockImplementation(() => ({
          logAction: mockAuditLog
        } as any));

        (supabase.from().insert().select().single as any).mockResolvedValue({
          data: {
            id: 'msg-scheduled-audit',
            scheduled_for: '2025-02-01T10:00:00Z'
          },
          error: null
        });

        const request = new Request('http://localhost/api/admin/communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Scheduled',
            message_content: 'Content',
            message_type: 'newsletter',
            scheduled_for: '2025-02-01T10:00:00Z'
          })
        });

        const response = await communicationsModule.POST({ request, cookies: {} } as any);

        expect(response.status).toBe(200);
        expect(mockAuditLog).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            scheduled: true
          })
        );
      });
    });
  });
});