/**
 * Newsletter API Endpoints Tests
 * Tests for /api/newsletter/subscribe and /api/admin/newsletter endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { APIRoute } from 'astro';

// Mock the database operations
vi.mock('@lib/content-db-direct', () => ({
  subscribeToNewsletter: vi.fn(),
  logNewsletterSignup: vi.fn(),
  getNewsletterSubscribers: vi.fn(),
  getNewsletterStats: vi.fn(),
  unsubscribeFromNewsletter: vi.fn()
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

// Mock the form validation
vi.mock('@lib/form-validation', () => ({
  validators: {
    email: vi.fn((email) => {
      if (!email || !email.includes('@')) {
        return 'Invalid email address';
      }
      return null;
    })
  }
}));

import { 
  subscribeToNewsletter, 
  logNewsletterSignup,
  getNewsletterSubscribers,
  getNewsletterStats,
  unsubscribeFromNewsletter
} from '@lib/content-db-direct';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { errorResponse } from '@lib/api-utils';
import { validators } from '@lib/form-validation';

// Import the API handlers
const subscribeModule = await import('../../src/pages/api/newsletter/subscribe');
const adminModule = await import('../../src/pages/api/admin/newsletter');

describe('Newsletter Subscribe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('should successfully subscribe a new user', async () => {
      const mockSubscriber = {
        email: 'test@example.com',
        subscription_type: 'general'
      };

      (subscribeToNewsletter as any).mockResolvedValue({
        success: true,
        message: 'Successfully subscribed to newsletter!',
        subscriber: mockSubscriber
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          signup_source: 'website_footer',
          signup_page: '/home'
        })
      });

      const response = await subscribeModule.POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Successfully subscribed to newsletter!');
      expect(data.subscriber.email).toBe('test@example.com');

      // Verify database calls
      expect(subscribeToNewsletter).toHaveBeenCalledWith({
        email: 'test@example.com',
        first_name: undefined,
        last_name: undefined,
        subscription_type: 'general',
        signup_source: 'website_footer',
        signup_page: '/home',
        referral_source: undefined
      });

      expect(logNewsletterSignup).toHaveBeenCalledWith(
        'test@example.com',
        true,
        undefined,
        {
          ip_address: '192.168.1.1',
          user_agent: 'Test Browser',
          signup_page: '/home'
        }
      );
    });

    it('should handle invalid email addresses', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          signup_source: 'website_footer'
        })
      });

      const response = await subscribeModule.POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email address');
      expect(subscribeToNewsletter).not.toHaveBeenCalled();
    });

    it('should handle resubscription of unsubscribed users', async () => {
      (subscribeToNewsletter as any).mockResolvedValue({
        success: true,
        message: 'Welcome back! You have been resubscribed to our newsletter.',
        subscriber: {
          email: 'returning@example.com',
          subscription_type: 'general'
        }
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'returning@example.com'
        })
      });

      const response = await subscribeModule.POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Welcome back');
    });

    it('should handle duplicate active subscriptions', async () => {
      (subscribeToNewsletter as any).mockResolvedValue({
        success: false,
        message: 'You are already subscribed to our newsletter!'
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com'
        })
      });

      const response = await subscribeModule.POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('You are already subscribed to our newsletter!');
    });

    it('should handle database errors gracefully', async () => {
      (subscribeToNewsletter as any).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await subscribeModule.POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process subscription');
    });

    it('should include optional fields when provided', async () => {
      (subscribeToNewsletter as any).mockResolvedValue({
        success: true,
        message: 'Successfully subscribed!',
        subscriber: {
          email: 'full@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'full@example.com',
          first_name: 'John',
          last_name: 'Doe',
          subscription_type: 'parents',
          referral_source: 'social_media'
        })
      });

      const response = await subscribeModule.POST({ request } as any);

      expect(response.status).toBe(200);
      expect(subscribeToNewsletter).toHaveBeenCalledWith({
        email: 'full@example.com',
        first_name: 'John',
        last_name: 'Doe',
        subscription_type: 'parents',
        signup_source: 'website',
        signup_page: 'unknown',
        referral_source: 'social_media'
      });
    });
  });

  describe('GET /api/newsletter/subscribe', () => {
    it('should return generic message for privacy', async () => {
      const url = new URL('http://localhost/api/newsletter/subscribe?email=test@example.com');
      const response = await subscribeModule.GET({ url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Please check your email for subscription status');
    });

    it('should require email parameter', async () => {
      const url = new URL('http://localhost/api/newsletter/subscribe');
      const response = await subscribeModule.GET({ url } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email parameter required');
    });
  });
});

describe('Newsletter Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      (checkAdminAuth as any).mockResolvedValue({ isAuthenticated: false });

      const url = new URL('http://localhost/api/admin/newsletter');
      const cookies = {};
      const response = await adminModule.GET({ url, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/admin/newsletter', () => {
    beforeEach(() => {
      (checkAdminAuth as any).mockResolvedValue({ 
        isAuthenticated: true,
        session: { user_id: 'admin-123' }
      });
    });

    it('should return newsletter statistics', async () => {
      const mockStats = {
        total_subscribers: 150,
        active_subscribers: 120,
        unsubscribed_count: 30,
        recent_signups: 15,
        types_breakdown: {
          general: 100,
          parents: 50
        }
      };

      (getNewsletterStats as any).mockResolvedValue(mockStats);

      const url = new URL('http://localhost/api/admin/newsletter?action=stats');
      const cookies = {};
      const response = await adminModule.GET({ url, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStats);
    });

    it('should return subscribers list with filters', async () => {
      const mockSubscribers = [
        {
          email: 'sub1@example.com',
          first_name: 'John',
          subscription_type: 'general',
          subscription_status: 'active',
          created_at: '2025-01-15T10:00:00Z'
        },
        {
          email: 'sub2@example.com',
          first_name: 'Jane',
          subscription_type: 'parents',
          subscription_status: 'active',
          created_at: '2025-01-16T10:00:00Z'
        }
      ];

      (getNewsletterSubscribers as any).mockResolvedValue(mockSubscribers);

      const url = new URL('http://localhost/api/admin/newsletter?status=active&type=parents&limit=50');
      const cookies = {};
      const response = await adminModule.GET({ url, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSubscribers);
      expect(getNewsletterSubscribers).toHaveBeenCalledWith({
        status: 'active',
        type: 'parents',
        limit: 50,
        offset: 0
      });
    });

    it('should export subscribers as CSV', async () => {
      const mockSubscribers = [
        {
          email: 'export1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          subscription_type: 'general',
          subscription_status: 'active',
          created_at: '2025-01-15T10:00:00Z'
        },
        {
          email: 'export2@example.com',
          first_name: 'Jane',
          last_name: '',
          subscription_type: 'parents',
          subscription_status: 'active',
          created_at: '2025-01-16T10:00:00Z'
        }
      ];

      (getNewsletterSubscribers as any).mockResolvedValue(mockSubscribers);

      const url = new URL('http://localhost/api/admin/newsletter?action=export&status=active');
      const cookies = {};
      const response = await adminModule.GET({ url, cookies } as any);
      const csvContent = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toMatch(/attachment.*\.csv/);
      expect(csvContent).toContain('Email,First Name,Last Name,Type,Signup Date,Status');
      expect(csvContent).toContain('export1@example.com');
      expect(csvContent).toContain('export2@example.com');
    });
  });

  describe('POST /api/admin/newsletter', () => {
    beforeEach(() => {
      (checkAdminAuth as any).mockResolvedValue({ 
        isAuthenticated: true,
        session: { user_id: 'admin-123' }
      });
    });

    it('should unsubscribe a user', async () => {
      (unsubscribeFromNewsletter as any).mockResolvedValue(true);

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          email: 'unsub@example.com'
        })
      });
      const cookies = {};

      const response = await adminModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Subscriber removed successfully');
      expect(unsubscribeFromNewsletter).toHaveBeenCalledWith('unsub@example.com');
    });

    it('should handle unsubscribe failures', async () => {
      (unsubscribeFromNewsletter as any).mockResolvedValue(false);

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          email: 'notfound@example.com'
        })
      });
      const cookies = {};

      const response = await adminModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to unsubscribe email');
    });

    it('should require email for unsubscribe', async () => {
      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe'
        })
      });
      const cookies = {};

      const response = await adminModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email required');
    });

    it('should handle CSV import', async () => {
      const csvContent = `email,first_name,last_name,type
import1@example.com,John,Doe,general
import2@example.com,Jane,Smith,parents`;

      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          csv_content: csvContent
        })
      });
      const cookies = {};

      const response = await adminModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imported).toBe(2);
      expect(data.total).toBe(2);
    });

    it('should handle invalid actions', async () => {
      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalid'
        })
      });
      const cookies = {};

      const response = await adminModule.POST({ request, cookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });
});