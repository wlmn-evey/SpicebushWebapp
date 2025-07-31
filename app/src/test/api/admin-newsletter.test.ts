import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIRoute } from 'astro';
import { GET, POST } from '../../pages/api/admin/newsletter';

// Mock dependencies
vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/content-db-direct', () => ({
  getNewsletterSubscribers: vi.fn(),
  getNewsletterStats: vi.fn()
}));

vi.mock('@lib/audit-logger', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    logAction: vi.fn()
  }))
}));

vi.mock('@lib/api-utils', () => ({
  errorResponse: vi.fn((message: string, status: number) => 
    new Response(JSON.stringify({ error: message }), { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    })
  )
}));

vi.mock('csv-parse/sync', () => ({
  parse: vi.fn()
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn()
};

vi.mock('@lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockSupabase.from(table);
      return {
        update: (data: any) => {
          mockSupabase.update(data);
          return {
            eq: (field: string, value: any) => {
              mockSupabase.eq(field, value);
              return {
                eq: (field2: string, value2: any) => {
                  mockSupabase.eq(field2, value2);
                  return Promise.resolve({ error: null });
                }
              };
            }
          };
        }
      };
    }
  }
}));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { getNewsletterSubscribers, getNewsletterStats } from '@lib/content-db-direct';
import { parse } from 'csv-parse/sync';

describe('Admin Newsletter API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/newsletter', () => {
    it('should require authentication', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: false 
      });

      const url = new URL('http://localhost/api/admin/newsletter');
      const cookies = {};
      
      const response = await GET({ url, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });

    it('should return newsletter statistics when action=stats', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true 
      });

      const mockStats = {
        total_subscribers: 150,
        active_subscribers: 140,
        unsubscribed_count: 10,
        types_breakdown: { general: 100, parents: 40 },
        recent_signups: 25
      };

      vi.mocked(getNewsletterStats).mockResolvedValueOnce(mockStats);

      const url = new URL('http://localhost/api/admin/newsletter?action=stats');
      const cookies = {};
      
      const response = await GET({ url, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual(mockStats);
      expect(getNewsletterStats).toHaveBeenCalled();
    });

    it('should export subscribers as CSV when action=export', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true 
      });

      const mockSubscribers = [
        {
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          subscription_type: 'general',
          subscription_status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          email: 'user2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          subscription_type: 'parents',
          subscription_status: 'active',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      vi.mocked(getNewsletterSubscribers).mockResolvedValueOnce(mockSubscribers);

      const url = new URL('http://localhost/api/admin/newsletter?action=export&status=active');
      const cookies = {};
      
      const response = await GET({ url, cookies } as any);
      const csvContent = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="newsletter-subscribers-active-');
      expect(csvContent).toContain('Email,First Name,Last Name,Type,Signup Date,Status');
      expect(csvContent).toContain('user1@example.com');
      expect(csvContent).toContain('user2@example.com');
    });

    it('should return subscriber list by default', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true 
      });

      const mockSubscribers = [
        { email: 'test1@example.com', subscription_status: 'active' },
        { email: 'test2@example.com', subscription_status: 'active' }
      ];

      vi.mocked(getNewsletterSubscribers).mockResolvedValueOnce(mockSubscribers);

      const url = new URL('http://localhost/api/admin/newsletter');
      const cookies = {};
      
      const response = await GET({ url, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual(mockSubscribers);
      expect(getNewsletterSubscribers).toHaveBeenCalledWith({
        status: 'active',
        type: undefined,
        limit: 100,
        offset: 0
      });
    });

    it('should apply filters from query parameters', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true 
      });

      vi.mocked(getNewsletterSubscribers).mockResolvedValueOnce([]);

      const url = new URL('http://localhost/api/admin/newsletter?status=unsubscribed&type=parents&limit=50&offset=10');
      const cookies = {};
      
      await GET({ url, cookies } as any);

      expect(getNewsletterSubscribers).toHaveBeenCalledWith({
        status: 'unsubscribed',
        type: 'parents',
        limit: 50,
        offset: 10
      });
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true 
      });

      vi.mocked(getNewsletterStats).mockRejectedValueOnce(new Error('Database error'));

      const url = new URL('http://localhost/api/admin/newsletter?action=stats');
      const cookies = {};
      
      const response = await GET({ url, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to fetch newsletter data');
    });
  });

  describe('POST /api/admin/newsletter', () => {
    it('should require authentication', async () => {
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: false,
        session: null
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe', email: 'test@example.com' })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });

    it('should unsubscribe a user', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({ 
          action: 'unsubscribe', 
          email: 'unsubscribe@example.com' 
        })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscriber removed successfully');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        subscription_status: 'unsubscribed',
        unsubscribed_at: expect.any(String),
        updated_at: expect.any(String)
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'unsubscribe@example.com');
    });

    it('should require email for unsubscribe action', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe' })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Email required');
    });

    it('should handle CSV import', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      const csvContent = `email,first_name,last_name
import1@example.com,Import,One
import2@example.com,Import,Two
invalid-email,Bad,Entry`;

      const mockRecords = [
        { email: 'import1@example.com', first_name: 'Import', last_name: 'One' },
        { email: 'import2@example.com', first_name: 'Import', last_name: 'Two' },
        { email: 'invalid-email', first_name: 'Bad', last_name: 'Entry' }
      ];

      vi.mocked(parse).mockReturnValueOnce(mockRecords);

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'import',
          csv_content: csvContent
        })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Imported 2 subscribers successfully');
      expect(result.imported).toBe(2);
      expect(result.errors).toBe(1);
      expect(result.total).toBe(3);
    });

    it('should require CSV content for import action', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('CSV content required');
    });

    it('should handle invalid CSV format', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      vi.mocked(parse).mockImplementationOnce(() => {
        throw new Error('Invalid CSV');
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'import',
          csv_content: 'invalid csv data'
        })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid CSV format');
    });

    it('should reject invalid actions', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid_action' })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid action');
    });

    it('should handle database errors during unsubscribe', async () => {
      const mockSession = { user: { id: 'admin123' } };
      vi.mocked(checkAdminAuth).mockResolvedValueOnce({ 
        isAuthenticated: true,
        session: mockSession
      });

      // Mock database error
      vi.mocked(mockSupabase.eq).mockImplementationOnce(() => {
        return {
          eq: () => Promise.resolve({ error: new Error('Database error') })
        };
      });

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'unsubscribe',
          email: 'test@example.com'
        })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Failed to unsubscribe email');
    });

    it('should handle general errors gracefully', async () => {
      vi.mocked(checkAdminAuth).mockRejectedValueOnce(new Error('Auth service down'));

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe', email: 'test@example.com' })
      });
      const cookies = {};
      
      const response = await POST({ request, cookies } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process newsletter request');
    });
  });
});