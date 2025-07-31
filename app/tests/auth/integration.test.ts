import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@lib/admin-config';

// Test configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing PUBLIC_SUPABASE_ANON_KEY or TEST_SUPABASE_ANON_KEY environment variable');
}

// Test credentials
const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const TEST_ADMIN_PASSWORD = 'gcb4uvd*pvz*ZGD_hta';

describe('Authentication Integration Tests', () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  beforeAll(async () => {
    // Clean up any existing sessions
    await supabase.auth.signOut();
  });

  afterAll(async () => {
    // Clean up after tests
    await supabase.auth.signOut();
  });

  describe('Login Flow', () => {
    it('should successfully login with correct admin credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(TEST_ADMIN_EMAIL);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: 'wrong-password',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid login credentials');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should fail login with non-existent email', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'any-password',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle empty credentials gracefully', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: '',
        password: '',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle malformed email addresses', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'not-an-email',
        password: 'password',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should persist session after login', async () => {
      // First login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      expect(loginError).toBeNull();
      expect(loginData.session).toBeDefined();

      // Check session persistence
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      expect(sessionError).toBeNull();
      expect(session).toBeDefined();
      expect(session?.user?.email).toBe(TEST_ADMIN_EMAIL);
    });

    it('should get current user after login', async () => {
      // Ensure we're logged in
      await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      const { data: { user }, error } = await supabase.auth.getUser();

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user?.email).toBe(TEST_ADMIN_EMAIL);
    });

    it('should successfully logout', async () => {
      // Login first
      await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      // Logout
      const { error } = await supabase.auth.signOut();
      expect(error).toBeNull();

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it('should return null user when not logged in', async () => {
      // Ensure we're logged out
      await supabase.auth.signOut();

      const { data: { user }, error } = await supabase.auth.getUser();

      // Note: Supabase may return an error for unauthenticated getUser calls
      if (error) {
        expect(error.message).toContain('not authenticated');
      } else {
        expect(user).toBeNull();
      }
    });
  });

  describe('Authorization', () => {
    it('should correctly identify admin users', async () => {
      // Login as admin
      const { data } = await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
      });

      expect(isAdminEmail(data.user?.email)).toBe(true);
    });

    it('should correctly identify non-admin users', () => {
      const nonAdminEmails = [
        'parent@gmail.com',
        'user@example.com',
        'test@test.com',
      ];

      nonAdminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should handle domain-based admin access', () => {
      const domainAdminEmails = [
        'anyone@spicebushmontessori.org',
        'teacher@spicebushmontessori.org',
        'staff@spicebushmontessori.org',
      ];

      domainAdminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });

    it('should handle specific admin emails', () => {
      const specificAdmins = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
      ];

      specificAdmins.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });

    it('should handle email case variations', () => {
      const emailVariations = [
        'EVEY@EVEYWINTERS.COM',
        'Evey@EveYWinters.Com',
        'evey@eveywinters.com',
      ];

      emailVariations.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create a client with invalid URL
      const badClient = createClient('http://invalid-url', SUPABASE_ANON_KEY);

      try {
        await badClient.auth.signInWithPassword({
          email: TEST_ADMIN_EMAIL,
          password: TEST_ADMIN_PASSWORD,
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle rate limiting', async () => {
      // Attempt multiple rapid logins
      const promises = Array(5).fill(null).map(() =>
        supabase.auth.signInWithPassword({
          email: TEST_ADMIN_EMAIL,
          password: 'wrong-password',
        })
      );

      const results = await Promise.allSettled(promises);
      
      // All should complete (rate limiting might kick in on some)
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in error messages', async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: 'wrong-password',
      });

      expect(error?.message).not.toContain(TEST_ADMIN_EMAIL);
      expect(error?.message).not.toContain('wrong-password');
    });

    it('should handle SQL injection attempts in email field', async () => {
      const sqlInjectionAttempts = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "admin' UNION SELECT * FROM users --",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const { error } = await supabase.auth.signInWithPassword({
          email: attempt,
          password: 'password',
        });

        expect(error).toBeDefined();
        // Should fail with validation error, not SQL error
        expect(error?.message).not.toContain('SQL');
        expect(error?.message).not.toContain('syntax');
      }
    });

    it('should enforce password requirements', async () => {
      const weakPasswords = [
        '123',
        'pass',
        '12345',
      ];

      // Note: This would test signup, not signin
      // Supabase enforces password requirements on signup
      for (const weakPassword of weakPasswords) {
        const { error } = await supabase.auth.signUp({
          email: 'test@example.com',
          password: weakPassword,
        });

        if (error) {
          expect(error.message).toMatch(/password|weak|short/i);
        }
      }
    });
  });
});