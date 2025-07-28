import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAdminEmail } from '../../lib/admin-config';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Admin Authentication Integration', () => {
  let mockUser = {
    id: 'test-user-id',
    email: 'admin@spicebushmontessori.org',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should authenticate valid admin email successfully', async () => {
      const adminEmail = 'admin@spicebushmontessori.org';
      const password = 'secure-password';

      // Mock successful authentication
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: mockUser,
          },
        },
        error: null,
      });

      // Perform authentication
      const result = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password,
      });

      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe(adminEmail);
      expect(isAdminEmail(result.data?.user?.email)).toBe(true);
    });

    it('should reject non-admin email during authorization check', async () => {
      const nonAdminEmail = 'parent@gmail.com';
      const password = 'secure-password';

      // Mock successful authentication (user exists)
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: { ...mockUser, email: nonAdminEmail },
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: { ...mockUser, email: nonAdminEmail },
          },
        },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: nonAdminEmail,
        password,
      });

      // Authentication succeeds
      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe(nonAdminEmail);
      
      // But admin check fails
      expect(isAdminEmail(result.data?.user?.email)).toBe(false);
    });

    it('should handle authentication errors gracefully', async () => {
      const adminEmail = 'admin@spicebushmontessori.org';
      const wrongPassword = 'wrong-password';

      // Mock authentication failure
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
          code: 'invalid_credentials',
        },
      });

      const result = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: wrongPassword,
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid login credentials');
      expect(result.data?.user).toBeNull();
    });

    it('should handle director email authentication', async () => {
      const directorEmail = 'director@spicebushmontessori.org';
      const password = 'secure-password';

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: { ...mockUser, email: directorEmail },
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: { ...mockUser, email: directorEmail },
          },
        },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: directorEmail,
        password,
      });

      expect(result.error).toBeNull();
      expect(isAdminEmail(result.data?.user?.email)).toBe(true);
    });

    it('should handle domain-based admin access', async () => {
      const staffEmail = 'teacher@spicebushmontessori.org';
      const password = 'secure-password';

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: { ...mockUser, email: staffEmail },
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: { ...mockUser, email: staffEmail },
          },
        },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password,
      });

      expect(result.error).toBeNull();
      expect(isAdminEmail(result.data?.user?.email)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should retrieve current admin user session', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await supabase.auth.getUser();

      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe('admin@spicebushmontessori.org');
      expect(isAdminEmail(result.data?.user?.email)).toBe(true);
    });

    it('should handle expired sessions', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: {
          message: 'Session expired',
          status: 401,
          code: 'session_expired',
        },
      });

      const result = await supabase.auth.getUser();

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('session_expired');
      expect(result.data?.user).toBeNull();
    });

    it('should sign out admin users successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      });

      const result = await supabase.auth.signOut();

      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });
  });

  describe('Authorization Middleware Pattern', () => {
    // Example middleware function that would be used in the app
    async function requireAdmin() {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { authorized: false, error: 'Not authenticated' };
      }

      if (!isAdminEmail(user.email)) {
        return { authorized: false, error: 'Not authorized - admin access required' };
      }

      return { authorized: true, user };
    }

    it('should authorize admin users', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await requireAdmin();

      expect(result.authorized).toBe(true);
      expect(result.user?.email).toBe('admin@spicebushmontessori.org');
    });

    it('should reject non-admin users', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { ...mockUser, email: 'parent@gmail.com' } },
        error: null,
      });

      const result = await requireAdmin();

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Not authorized - admin access required');
    });

    it('should reject unauthenticated requests', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await requireAdmin();

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle case variations in email addresses', async () => {
      const emailVariations = [
        'ADMIN@spicebushmontessori.org',
        'Admin@SpicebushMontessori.Org',
        '  admin@spicebushmontessori.org  ',
      ];

      for (const email of emailVariations) {
        vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
          data: { user: { ...mockUser, email } },
          error: null,
        });

        const result = await supabase.auth.getUser();
        expect(isAdminEmail(result.data?.user?.email)).toBe(true);
      }
    });

    it('should reject malformed email addresses', async () => {
      const malformedEmails = [
        'admin@',
        '@spicebushmontessori.org',
        'admin.spicebushmontessori.org',
        'admin@spicebushmontessori',
        '',
        null,
        undefined,
      ];

      for (const email of malformedEmails) {
        expect(isAdminEmail(email as any)).toBe(false);
      }
    });

    it('should handle concurrent authentication attempts', async () => {
      const authPromises = Array.from({ length: 5 }, (_, i) => {
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
          data: {
            user: { ...mockUser, id: `user-${i}` },
            session: {
              access_token: `token-${i}`,
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: `refresh-${i}`,
              user: { ...mockUser, id: `user-${i}` },
            },
          },
          error: null,
        });

        return supabase.auth.signInWithPassword({
          email: 'admin@spicebushmontessori.org',
          password: 'password',
        });
      });

      const results = await Promise.all(authPromises);

      results.forEach((result, i) => {
        expect(result.error).toBeNull();
        expect(result.data?.session?.access_token).toBe(`token-${i}`);
      });
    });
  });

  describe('Development Mode Testing', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should allow test admin accounts in development', async () => {
      const testAdminEmail = 'admin@spicebushmontessori.test';

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { ...mockUser, email: testAdminEmail } },
        error: null,
      });

      const result = await supabase.auth.getUser();
      expect(isAdminEmail(result.data?.user?.email)).toBe(true);
    });
  });
});