import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST as subscribePost, GET as subscribeGet } from '../../pages/api/newsletter/subscribe';
import { GET as adminGet, POST as adminPost } from '../../pages/api/admin/newsletter';
import { supabase } from '@lib/supabase';
import { vi } from 'vitest';

// Mock authentication for admin endpoints
vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn().mockResolvedValue({
    isAuthenticated: true,
    session: { user: { id: 'test-admin' } }
  })
}));

describe('Newsletter API Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testEmail2 = `test2-${Date.now()}@example.com`;
  
  beforeAll(async () => {
    // Clean up any test data that might exist
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Ensure clean state for each test
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Clean up test subscribers
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .like('email', 'test%@example.com');
    
    // Clean up test logs
    await supabase
      .from('newsletter_signup_logs')
      .delete()
      .like('email', 'test%@example.com');
  }

  describe('Public Subscription Flow', () => {
    it('should complete full subscription workflow', async () => {
      // 1. Subscribe a new user
      const subscribeRequest = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Integration Test',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          subscription_type: 'general',
          signup_source: 'integration_test'
        })
      });

      const subscribeResponse = await subscribePost({ request: subscribeRequest } as any);
      const subscribeResult = await subscribeResponse.json();

      expect(subscribeResponse.status).toBe(200);
      expect(subscribeResult.success).toBe(true);
      expect(subscribeResult.message).toBe('Thank you for subscribing to our newsletter!');
      expect(subscribeResult.subscriber.email).toBe(testEmail);

      // 2. Verify subscriber was created in database
      const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(subscriber).toBeTruthy();
      expect(subscriber.email).toBe(testEmail);
      expect(subscriber.first_name).toBe('Test');
      expect(subscriber.last_name).toBe('User');
      expect(subscriber.subscription_status).toBe('active');
      expect(subscriber.subscription_type).toBe('general');

      // 3. Verify signup log was created
      const { data: logs } = await supabase
        .from('newsletter_signup_logs')
        .select('*')
        .eq('email', testEmail);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].signup_successful).toBe(true);
      expect(logs[0].ip_address).toBe('127.0.0.1');
      expect(logs[0].user_agent).toBe('Integration Test');

      // 4. Try to subscribe again - should get already subscribed message
      const duplicateResponse = await subscribePost({ request: subscribeRequest } as any);
      const duplicateResult = await duplicateResponse.json();

      expect(duplicateResponse.status).toBe(200);
      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.message).toBe('You are already subscribed to our newsletter!');
    });

    it('should handle resubscription workflow', async () => {
      // 1. First create a subscriber
      await supabase
        .from('newsletter_subscribers')
        .insert({
          email: testEmail2,
          subscription_status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        });

      // 2. Try to resubscribe
      const resubRequest = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail2 })
      });

      const response = await subscribePost({ request: resubRequest } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Welcome back! You have been resubscribed to our newsletter.');

      // 3. Verify status was updated
      const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', testEmail2)
        .single();

      expect(subscriber.subscription_status).toBe('active');
      expect(subscriber.unsubscribed_at).toBeNull();
    });
  });

  describe('Admin Management Flow', () => {
    beforeEach(async () => {
      // Create test subscribers for admin operations
      await supabase
        .from('newsletter_subscribers')
        .insert([
          {
            email: `test-active-${Date.now()}@example.com`,
            first_name: 'Active',
            last_name: 'User',
            subscription_status: 'active',
            subscription_type: 'general'
          },
          {
            email: `test-parents-${Date.now()}@example.com`,
            first_name: 'Parent',
            last_name: 'User',
            subscription_status: 'active',
            subscription_type: 'parents'
          }
        ]);
    });

    it('should retrieve newsletter statistics', async () => {
      const url = new URL('http://localhost/api/admin/newsletter?action=stats');
      const response = await adminGet({ url, cookies: {} } as any);
      const stats = await response.json();

      expect(response.status).toBe(200);
      expect(stats).toHaveProperty('total_subscribers');
      expect(stats).toHaveProperty('active_subscribers');
      expect(stats).toHaveProperty('unsubscribed_count');
      expect(stats).toHaveProperty('types_breakdown');
      expect(stats).toHaveProperty('recent_signups');
      expect(typeof stats.total_subscribers).toBe('number');
      expect(stats.active_subscribers).toBeGreaterThanOrEqual(0);
    });

    it('should list subscribers with filters', async () => {
      const url = new URL('http://localhost/api/admin/newsletter?status=active&limit=10');
      const response = await adminGet({ url, cookies: {} } as any);
      const subscribers = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(subscribers)).toBe(true);
      expect(subscribers.length).toBeLessThanOrEqual(10);
      subscribers.forEach(sub => {
        expect(sub.subscription_status).toBe('active');
      });
    });

    it('should export subscribers as CSV', async () => {
      const url = new URL('http://localhost/api/admin/newsletter?action=export&status=active');
      const response = await adminGet({ url, cookies: {} } as any);
      const csvContent = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(csvContent).toContain('Email,First Name,Last Name,Type,Signup Date,Status');
      expect(csvContent.split('\n').length).toBeGreaterThan(1); // Header + at least one row
    });

    it('should unsubscribe a user through admin API', async () => {
      // First create a subscriber to unsubscribe
      const testUnsubEmail = `test-unsub-${Date.now()}@example.com`;
      await supabase
        .from('newsletter_subscribers')
        .insert({
          email: testUnsubEmail,
          subscription_status: 'active'
        });

      // Unsubscribe through admin API
      const request = new Request('http://localhost/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          email: testUnsubEmail
        })
      });

      const response = await adminPost({ request, cookies: {} } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscriber removed successfully');

      // Verify the subscriber was unsubscribed
      const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', testUnsubEmail)
        .single();

      expect(subscriber.subscription_status).toBe('unsubscribed');
      expect(subscriber.unsubscribed_at).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should validate email format', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email-format' })
      });

      const response = await subscribePost({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should handle missing email', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await subscribePost({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBeTruthy();
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json'
      });

      const response = await subscribePost({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process subscription');
    });
  });

  describe('Privacy and Security', () => {
    it('should not reveal subscriber existence through GET endpoint', async () => {
      // Try to check both existing and non-existing emails
      const existingUrl = new URL(`http://localhost/api/newsletter/subscribe?email=${testEmail}`);
      const nonExistingUrl = new URL('http://localhost/api/newsletter/subscribe?email=nonexistent@example.com');

      const existingResponse = await subscribeGet({ url: existingUrl } as any);
      const nonExistingResponse = await subscribeGet({ url: nonExistingUrl } as any);

      const existingResult = await existingResponse.json();
      const nonExistingResult = await nonExistingResponse.json();

      // Both should return the same generic message
      expect(existingResult.message).toBe('Please check your email for subscription status');
      expect(nonExistingResult.message).toBe('Please check your email for subscription status');
    });

    it('should normalize and lowercase email addresses', async () => {
      const mixedCaseEmail = 'TeSt.MiXeD@ExAmPlE.com';
      const normalizedEmail = 'test.mixed@example.com';

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mixedCaseEmail })
      });

      const response = await subscribePost({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Check database has normalized email
      const { data: subscriber } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      expect(subscriber).toBeTruthy();
      expect(subscriber.email).toBe(normalizedEmail);
    });
  });
});