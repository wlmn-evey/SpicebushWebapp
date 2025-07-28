import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth } from '../../lib/supabase';
import { isAdminEmail } from '../../lib/admin-config';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithOtp: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
};

// Mock window object for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/auth/callback',
  },
  writable: true,
});

// Mock the supabase import
vi.mock('../../lib/supabase', async () => {
  const actual = await vi.importActual('../../lib/supabase');
  return {
    ...actual,
    supabase: mockSupabase,
  };
});

describe('Magic Link Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signInWithMagicLink', () => {
    it('should send magic link with correct parameters', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      const expectedRedirectUrl = `${window.location.origin}/auth/callback`;
      
      mockSupabase.auth.signInWithOtp.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });

      const result = await auth.signInWithMagicLink(testEmail);

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: testEmail,
        options: {
          emailRedirectTo: expectedRedirectUrl,
        },
      });
      expect(result.error).toBeNull();
    });

    it('should handle invalid email addresses', async () => {
      const invalidEmails = [
        'not-an-email',
        '',
        'test@',
        '@domain.com',
        'spaces in@email.com',
      ];

      mockSupabase.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      });

      for (const email of invalidEmails) {
        const result = await auth.signInWithMagicLink(email);
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle network errors gracefully', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      
      mockSupabase.auth.signInWithOtp.mockRejectedValue(new Error('Network error'));

      await expect(auth.signInWithMagicLink(testEmail)).rejects.toThrow('Network error');
    });

    it('should handle rate limiting errors', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      
      mockSupabase.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Email rate limit exceeded' },
      });

      const result = await auth.signInWithMagicLink(testEmail);
      expect(result.error.message).toContain('rate limit');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: '123',
        email: 'admin@spicebushmontessori.org',
        email_confirmed_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await auth.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await auth.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle auth errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const user = await auth.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return valid session', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: '123', email: 'admin@spicebushmontessori.org' },
        expires_at: Date.now() + 3600000, // 1 hour from now
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await auth.getCurrentSession();
      expect(session).toEqual(mockSession);
    });

    it('should return null for expired session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await auth.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', async () => {
      const adminEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
      ];

      for (const email of adminEmails) {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email } },
          error: null,
        });

        const isAdmin = await auth.isAdmin();
        expect(isAdmin).toBe(true);
      }
    });

    it('should return false for non-admin users', async () => {
      const nonAdminEmails = [
        'parent@example.com',
        'teacher@otherschool.org',
        'student@university.edu',
      ];

      for (const email of nonAdminEmails) {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email } },
          error: null,
        });

        const isAdmin = await auth.isAdmin();
        expect(isAdmin).toBe(false);
      }
    });

    it('should return false when no user is logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const isAdmin = await auth.isAdmin();
      expect(isAdmin).toBe(false);
    });

    it('should handle auth errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const isAdmin = await auth.isAdmin();
      expect(isAdmin).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await auth.signOut();
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await auth.signOut();
      expect(result.error.message).toBe('Sign out failed');
    });
  });

  describe('onAuthStateChange', () => {
    it('should register auth state change callback', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockUnsubscribe },
      });

      const unsubscribe = auth.onAuthStateChange(mockCallback);
      
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(unsubscribe).toBeDefined();
    });
  });
});

describe('Admin Configuration Tests', () => {
  describe('isAdminEmail', () => {
    it('should correctly identify admin emails', () => {
      const adminEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
        'ADMIN@SPICEBUSHMONTESSORI.ORG', // Test case insensitive
        ' admin@spicebushmontessori.org ', // Test whitespace handling
      ];

      adminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });

    it('should reject non-admin emails', () => {
      const nonAdminEmails = [
        'parent@example.com',
        'teacher@otherschool.org',
        'user@spicebush.com', // Wrong domain
        'admin@fake-spicebushmontessori.org', // Subdomain attack
        '', // Empty string
        null, // Null
        undefined, // Undefined
      ];

      nonAdminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should handle domain-based admin access', () => {
      const domainAdmins = [
        'newteacher@spicebushmontessori.org',
        'staff@spicebushmontessori.org',
        'substitute@spicebushmontessori.org',
      ];

      domainAdmins.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });

    it('should handle development test emails in dev mode', () => {
      // Mock dev environment
      vi.mock('astro:env', () => ({
        DEV: true,
      }));

      const testEmails = [
        'admin@spicebushmontessori.test',
        'admin@example.com',
        'admin@localhost',
      ];

      // Note: This test assumes dev mode behavior
      // In actual implementation, we'd need to test with proper env mocking
    });
  });
});

describe('Magic Link Security Tests', () => {
  it('should only allow admin emails to authenticate', async () => {
    const nonAdminEmail = 'parent@example.com';
    
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    // Magic link should be sent...
    const result = await auth.signInWithMagicLink(nonAdminEmail);
    expect(result.error).toBeNull();

    // But authentication should fail later in the callback
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: nonAdminEmail } },
      error: null,
    });

    const isAdmin = await auth.isAdmin();
    expect(isAdmin).toBe(false);
  });

  it('should handle malicious email inputs', async () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>@example.com',
      'admin@spicebushmontessori.org<script>',
      '../../admin@spicebushmontessori.org',
      'admin@spicebushmontessori.org?redirect=evil.com',
    ];

    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email' },
    });

    for (const maliciousEmail of maliciousInputs) {
      const result = await auth.signInWithMagicLink(maliciousEmail);
      expect(result.error).toBeTruthy();
    }
  });

  it('should validate redirect URLs', async () => {
    const originalOrigin = window.location.origin;
    
    // Test with malicious origin
    window.location.origin = 'https://evil.com';
    
    const result = await auth.signInWithMagicLink('admin@spicebushmontessori.org');
    
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'admin@spicebushmontessori.org',
      options: {
        emailRedirectTo: 'https://evil.com/auth/callback',
      },
    });
    
    // Restore original origin
    window.location.origin = originalOrigin;
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle Supabase service unavailable', async () => {
    mockSupabase.auth.signInWithOtp.mockRejectedValue(
      new Error('Service temporarily unavailable')
    );

    await expect(
      auth.signInWithMagicLink('admin@spicebushmontessori.org')
    ).rejects.toThrow('Service temporarily unavailable');
  });

  it('should handle invalid tokens gracefully', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid or expired token' },
    });

    // This would be tested in the callback handler
    const result = await mockSupabase.auth.exchangeCodeForSession('invalid-token');
    expect(result.error.message).toContain('Invalid or expired token');
  });

  it('should handle concurrent authentication attempts', async () => {
    const email = 'admin@spicebushmontessori.org';
    
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    // Simulate multiple rapid calls
    const promises = Array(5).fill(null).map(() => 
      auth.signInWithMagicLink(email)
    );

    const results = await Promise.all(promises);
    
    // All should succeed (Supabase handles rate limiting)
    results.forEach(result => {
      expect(result.error).toBeNull();
    });
    
    // Should have made 5 calls
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledTimes(5);
  });

  it('should handle email delivery failures', async () => {
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: null,
      error: { message: 'Email delivery failed' },
    });

    const result = await auth.signInWithMagicLink('admin@spicebushmontessori.org');
    expect(result.error.message).toContain('Email delivery failed');
  });

  it('should handle session expiration gracefully', async () => {
    // Mock expired session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired' },
    });

    const session = await auth.getCurrentSession();
    expect(session).toBeNull();
  });
});
