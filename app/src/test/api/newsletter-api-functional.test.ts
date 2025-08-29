import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@lib/supabase';

/**
 * Functional tests for Newsletter API endpoints
 * These tests simulate real API calls to test the actual functionality
 */

describe('Newsletter API Functional Tests', () => {
  const baseUrl = 'http://localhost:4321'; // Default Astro dev server port
  const testEmail = `test-functional-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  async function cleanupTestData() {
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .like('email', 'test-functional-%@example.com');
  }

  describe('Public Subscribe Endpoint', () => {
    it('should subscribe a new email successfully', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          subscription_type: 'general'
        })
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Thank you for subscribing');
      expect(result.subscriber.email).toBe(testEmail);

      // Verify in database
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(data).toBeTruthy();
      expect(data.subscription_status).toBe('active');
    });

    it('should reject invalid email format', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'invalid-email-format'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('valid email');
    });

    it('should handle duplicate subscriptions gracefully', async () => {
      // First subscription
      await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail
        })
      });

      // Duplicate subscription
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail
        })
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.message).toContain('already subscribed');
    });

    it('should not reveal subscriber existence via GET', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe?email=${testEmail}`);
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.message).toBe('Please check your email for subscription status');
    });
  });

  describe('Newsletter Functionality Verification', () => {
    it('should normalize email addresses to lowercase', async () => {
      const mixedCaseEmail = `TeSt-MiXeD-${Date.now()}@ExAmPlE.com`;
      const normalizedEmail = mixedCaseEmail.toLowerCase();

      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: mixedCaseEmail
        })
      });

      expect(response.ok).toBe(true);

      // Check database has normalized email
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      expect(data).toBeTruthy();
      expect(data.email).toBe(normalizedEmail);
    });

    it('should log signup attempts', async () => {
      const logTestEmail = `test-log-${Date.now()}@example.com`;

      await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Test Browser'
        },
        body: JSON.stringify({
          email: logTestEmail
        })
      });

      // Check logs were created
      const { data: logs } = await supabase
        .from('newsletter_signup_logs')
        .select('*')
        .eq('email', logTestEmail);

      expect(logs).toBeTruthy();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].signup_successful).toBe(true);
    });

    it('should handle resubscription properly', async () => {
      const resubEmail = `test-resub-${Date.now()}@example.com`;

      // Create unsubscribed user
      await supabase
        .from('newsletter_subscribers')
        .insert({
          email: resubEmail,
          subscription_status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        });

      // Try to resubscribe
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: resubEmail
        })
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.message).toContain('Welcome back');

      // Verify status updated
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', resubEmail)
        .single();

      expect(data.subscription_status).toBe('active');
      expect(data.unsubscribed_at).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing email gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'not valid json'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should require email parameter for GET status check', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/subscribe`);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Email parameter required');
    });
  });
});

// Note: Admin endpoint tests would require authentication setup
// These can be tested manually or with authenticated test sessions