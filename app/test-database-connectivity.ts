import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

describe('Database Connectivity Tests', () => {
  let supabase: any;

  beforeAll(() => {
    // Create a Supabase client for testing
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables not set');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Direct Supabase Connection', () => {
    it('should be able to connect to Supabase', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should be able to read from newsletter_subscribers table', async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('API Routes Database Access', () => {
    it('should handle newsletter subscription via API', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      
      const response = await fetch(`${BASE_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          subscription_type: 'general',
          signup_source: 'test'
        })
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Thank you for subscribing');
      
      // Clean up test data
      await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('email', testEmail);
    });

    it('should handle tour scheduling request', async () => {
      const response = await fetch(`${BASE_URL}/api/schedule-tour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentName: 'Test Parent',
          email: 'test@example.com',
          phone: '555-0123',
          childAge: '4 years old',
          preferredTimes: 'Weekday mornings',
          questions: 'Test question',
          schoolEmail: 'info@spicebushmontessori.org'
        })
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('Server-Side Rendering Database Access', () => {
    it('should load coming-soon page with database content', async () => {
      const response = await fetch(`${BASE_URL}/coming-soon`);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Spicebush Montessori School');
      expect(html).toContain('Now Enrolling');
      
      // Check if database content is rendered
      expect(html).toContain('Family Income Tuition');
      expect(html).toContain('Schedule a Tour');
    });
  });

  describe('Admin Panel Database Access', () => {
    it('should reject unauthenticated access to admin settings', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      expect(response.status).toBe(401);
    });

    it('should check auth status endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('authenticated');
      expect(result.authenticated).toBe(false);
    });
  });

  describe('Client-Side Security Check', () => {
    it('should NOT expose database credentials in client-side JavaScript', async () => {
      // Fetch the main page
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      
      // Check that sensitive environment variables are not exposed
      expect(html).not.toContain('SUPABASE_SERVICE_KEY');
      expect(html).not.toContain('SUPABASE_DB_PASSWORD');
      expect(html).not.toContain('DATABASE_URL');
      
      // PUBLIC keys are okay to be exposed
      // But they should only appear in specific contexts, not in vite.define
    });

    it('should NOT have database credentials in built JavaScript files', async () => {
      // This test would need to run after build
      // For now, we'll check the development response
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      
      // Extract script tags
      const scriptRegex = /<script[^>]*src="([^"]+)"/g;
      let match;
      const scriptUrls = [];
      
      while ((match = scriptRegex.exec(html)) !== null) {
        scriptUrls.push(match[1]);
      }
      
      // Check each script for sensitive data
      for (const scriptUrl of scriptUrls) {
        if (scriptUrl.startsWith('http')) continue; // Skip external scripts
        
        const scriptResponse = await fetch(`${BASE_URL}${scriptUrl}`);
        const scriptContent = await scriptResponse.text();
        
        expect(scriptContent).not.toContain('SUPABASE_SERVICE_KEY');
        expect(scriptContent).not.toContain('SUPABASE_DB_PASSWORD');
        expect(scriptContent).not.toContain('DATABASE_URL');
      }
    });
  });

  afterAll(async () => {
    // Clean up any test data if needed
  });
});

// Integration test for the complete flow
describe('End-to-End Database Flow', () => {
  it('should complete a full user journey', async () => {
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    
    // 1. Subscribe to newsletter
    const subscribeResponse = await fetch(`${BASE_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        first_name: 'E2E',
        last_name: 'Test'
      })
    });
    
    expect(subscribeResponse.status).toBe(200);
    
    // 2. Verify subscription exists in database
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    expect(subscriber).toBeTruthy();
    expect(subscriber.email).toBe(testEmail);
    expect(subscriber.subscription_status).toBe('active');
    
    // 3. Clean up
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('email', testEmail);
  });
});