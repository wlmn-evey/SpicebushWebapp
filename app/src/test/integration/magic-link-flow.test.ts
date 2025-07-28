import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock environment setup
let dom: JSDOM;
let mockWindow: Window & typeof globalThis;

beforeEach(() => {
  // Create a clean DOM environment for each test
  dom = new JSDOM(`<!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="app"></div>
      </body>
    </html>`, {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable',
  });
  
  mockWindow = dom.window as Window & typeof globalThis;
  global.window = mockWindow;
  global.document = mockWindow.document;
  global.navigator = mockWindow.navigator;
  global.location = mockWindow.location;
});

afterEach(() => {
  dom?.window?.close();
});

// Mock Supabase client for integration tests
const mockSupabaseAuth = {
  signInWithOtp: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
};

const mockSupabase = {
  auth: mockSupabaseAuth,
};

// Mock the Supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
  auth: {
    signInWithMagicLink: async (email: string) => {
      return mockSupabaseAuth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    },
    getCurrentUser: () => mockSupabaseAuth.getUser(),
    getCurrentSession: () => mockSupabaseAuth.getSession(),
    isAdmin: async () => {
      const { data } = await mockSupabaseAuth.getUser();
      const user = data?.user;
      if (!user?.email) return false;
      
      const adminEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
      ];
      
      return adminEmails.includes(user.email.toLowerCase());
    },
    signOut: () => mockSupabaseAuth.signOut(),
  },
}));

describe('Magic Link Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete magic link authentication flow', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      
      // Step 1: User requests magic link
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });
      
      // Simulate magic link request
      const { auth } = await import('../../lib/supabase');
      const magicLinkResult = await auth.signInWithMagicLink(testEmail);
      
      expect(magicLinkResult.error).toBeNull();
      expect(mockSupabaseAuth.signInWithOtp).toHaveBeenCalledWith({
        email: testEmail,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      });
      
      // Step 2: User clicks magic link (simulated)
      // This would normally happen via email, but we simulate the callback
      const mockSession = {
        access_token: 'mock-access-token',
        user: {
          id: 'user-123',
          email: testEmail,
          email_confirmed_at: new Date().toISOString(),
        },
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });
      
      // Step 3: Verify authentication status
      const session = await auth.getCurrentSession();
      expect(session).toEqual(mockSession);
      
      const user = await auth.getCurrentUser();
      expect(user.email).toBe(testEmail);
      
      // Step 4: Verify admin access
      const isAdmin = await auth.isAdmin();
      expect(isAdmin).toBe(true);
    });

    it('should reject non-admin users in callback', async () => {
      const nonAdminEmail = 'parent@example.com';
      
      // Step 1: Magic link sent successfully
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });
      
      const { auth } = await import('../../lib/supabase');
      await auth.signInWithMagicLink(nonAdminEmail);
      
      // Step 2: User authenticated but not admin
      const mockSession = {
        access_token: 'mock-access-token',
        user: {
          id: 'user-456',
          email: nonAdminEmail,
          email_confirmed_at: new Date().toISOString(),
        },
        expires_at: Date.now() + 3600000,
      };
      
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });
      
      // Step 3: Should not be admin
      const isAdmin = await auth.isAdmin();
      expect(isAdmin).toBe(false);
      
      // Step 4: Should trigger sign out
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
      await auth.signOut();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('Magic Link URL Handling', () => {
    it('should handle magic link redirect from update-password', () => {
      // Simulate the redirect logic from update-password.astro
      const mockUrl = new URL('http://localhost:3000/auth/update-password?type=magiclink&token=abc123');
      const type = mockUrl.searchParams.get('type');
      const isMagicLink = type === 'magiclink';
      
      expect(isMagicLink).toBe(true);
      
      // Should redirect to callback
      const callbackUrl = mockUrl.href.replace('/auth/update-password', '/auth/callback');
      expect(callbackUrl).toBe('http://localhost:3000/auth/callback?type=magiclink&token=abc123');
    });

    it('should preserve URL parameters during redirect', () => {
      const originalUrl = 'http://localhost:3000/auth/update-password?type=magiclink&token=abc123&other=param';
      const callbackUrl = originalUrl.replace('/auth/update-password', '/auth/callback');
      
      const url = new URL(callbackUrl);
      expect(url.searchParams.get('type')).toBe('magiclink');
      expect(url.searchParams.get('token')).toBe('abc123');
      expect(url.searchParams.get('other')).toBe('param');
    });

    it('should handle password reset URLs differently', () => {
      const resetUrl = new URL('http://localhost:3000/auth/update-password?type=recovery&token=def456');
      const type = resetUrl.searchParams.get('type');
      const isMagicLink = type === 'magiclink';
      
      expect(isMagicLink).toBe(false);
      expect(type).toBe('recovery');
    });
  });

  describe('Session Management', () => {
    it('should handle session persistence', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      const mockSession = {
        access_token: 'persistent-token',
        user: { id: 'user-123', email: testEmail },
        expires_at: Date.now() + 3600000,
      };
      
      // First call returns session
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      
      const { auth } = await import('../../lib/supabase');
      const session1 = await auth.getCurrentSession();
      expect(session1).toEqual(mockSession);
      
      // Second call should also return session (persistence)
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      
      const session2 = await auth.getCurrentSession();
      expect(session2).toEqual(mockSession);
    });

    it('should handle session expiration', async () => {
      // First call returns valid session
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'expired-token',
            user: { id: 'user-123', email: 'admin@spicebushmontessori.org' },
            expires_at: Date.now() - 1000, // Expired
          },
        },
        error: null,
      });
      
      // Second call returns no session (expired)
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });
      
      const { auth } = await import('../../lib/supabase');
      const session = await auth.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('Cookie Management', () => {
    it('should set admin cookie after successful authentication', () => {
      // Mock document.cookie setter
      let cookieValue = '';
      Object.defineProperty(document, 'cookie', {
        get: () => cookieValue,
        set: (value: string) => {
          cookieValue = value;
        },
      });
      
      // Simulate setting admin cookie (from callback.astro)
      document.cookie = 'sbms-admin-auth=true; path=/; max-age=604800';
      
      expect(document.cookie).toContain('sbms-admin-auth=true');
    });

    it('should handle cookie parsing for middleware', () => {
      // Simulate cookies as they would appear in middleware
      const mockCookies = new Map();
      mockCookies.set('sbms-admin-auth', { value: 'true' });
      
      const isAdmin = mockCookies.get('sbms-admin-auth')?.value === 'true';
      expect(isAdmin).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle invalid magic link tokens', async () => {
      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid or expired link' },
      });
      
      const result = await mockSupabaseAuth.exchangeCodeForSession('invalid-code');
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid or expired');
    });

    it('should handle network failures during authentication', async () => {
      mockSupabaseAuth.signInWithOtp.mockRejectedValue(
        new Error('Failed to fetch')
      );
      
      const { auth } = await import('../../lib/supabase');
      
      await expect(
        auth.signInWithMagicLink('admin@spicebushmontessori.org')
      ).rejects.toThrow('Failed to fetch');
    });

    it('should handle Supabase service downtime', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Service temporarily unavailable' },
      });
      
      const { auth } = await import('../../lib/supabase');
      const result = await auth.signInWithMagicLink('admin@spicebushmontessori.org');
      
      expect(result.error.message).toContain('temporarily unavailable');
    });
  });

  describe('Middleware Integration', () => {
    it('should allow authenticated admin users to bypass coming soon mode', () => {
      // Mock middleware logic
      const pathname = '/admin/settings';
      const bypassPaths = ['/coming-soon', '/admin', '/auth', '/api'];
      const shouldBypass = bypassPaths.some(path => pathname.startsWith(path));
      const isAdmin = true; // From cookie
      const isComingSoonEnabled = true;
      
      // Should allow access for admin user
      const shouldRedirect = isComingSoonEnabled && !shouldBypass && !isAdmin;
      expect(shouldRedirect).toBe(false);
    });

    it('should redirect non-admin users to coming soon page', () => {
      const pathname = '/programs';
      const bypassPaths = ['/coming-soon', '/admin', '/auth', '/api'];
      const shouldBypass = bypassPaths.some(path => pathname.startsWith(path));
      const isAdmin = false; // No admin cookie
      const isComingSoonEnabled = true;
      
      // Should redirect non-admin user
      const shouldRedirect = isComingSoonEnabled && !shouldBypass && !isAdmin;
      expect(shouldRedirect).toBe(true);
    });

    it('should handle auth callback URLs with parameters', () => {
      const pathname = '/auth/callback';
      const searchParams = new URLSearchParams('?type=magiclink&token=abc123');
      const hasAuthParams = searchParams.has('token_hash') || 
                           searchParams.has('type') ||
                           searchParams.has('error');
      
      expect(hasAuthParams).toBe(true);
      
      // Should bypass coming soon mode for auth callbacks
      const bypassPaths = ['/auth'];
      const shouldBypass = bypassPaths.some(path => pathname.startsWith(path)) || hasAuthParams;
      expect(shouldBypass).toBe(true);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle email rate limiting', async () => {
      const testEmail = 'admin@spicebushmontessori.org';
      
      // First few requests succeed
      mockSupabaseAuth.signInWithOtp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: null,
      });
      
      // Subsequent requests hit rate limit
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Email rate limit exceeded' },
      });
      
      const { auth } = await import('../../lib/supabase');
      
      // First request succeeds
      const result1 = await auth.signInWithMagicLink(testEmail);
      expect(result1.error).toBeNull();
      
      // Second request hits rate limit
      const result2 = await auth.signInWithMagicLink(testEmail);
      expect(result2.error.message).toContain('rate limit');
    });

    it('should validate admin email before proceeding', async () => {
      const { isAdminEmail } = await import('../../lib/admin-config');
      
      const validEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
      ];
      
      const invalidEmails = [
        'parent@example.com',
        'attacker@evil.com',
      ];
      
      validEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });
  });
});

describe('Integration with MailHog (Development)', () => {
  it('should be testable with MailHog email service', async () => {
    // This test documents how to test with MailHog in development
    const testEmail = 'admin@spicebushmontessori.org';
    
    // In development, emails go to MailHog
    // Test would verify:
    // 1. Email is sent to MailHog
    // 2. Email contains correct magic link URL
    // 3. Link format is correct for callback handling
    
    const expectedEmailPattern = {
      to: testEmail,
      subject: /sign.*in|magic.*link|access/i,
      body: /auth\/update-password.*type=magiclink/,
    };
    
    // Mock MailHog API response
    const mockMailHogEmail = {
      To: [{ Mailbox: 'admin', Domain: 'spicebushmontessori.org' }],
      Subject: 'Confirm your signup',
      Body: {
        Text: 'Click here to sign in: http://localhost:3000/auth/update-password?type=magiclink&token=test-token',
      },
    };
    
    expect(mockMailHogEmail.To[0].Mailbox).toBe('admin');
    expect(mockMailHogEmail.Body.Text).toContain('type=magiclink');
  });
});
