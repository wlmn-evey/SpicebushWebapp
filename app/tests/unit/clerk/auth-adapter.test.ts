/**
 * Unit Tests for Auth Adapter
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { authAdapter } from '../../../src/lib/auth/adapter';

// Mock the auth modules
vi.mock('../../../src/lib/auth/clerk-helpers', () => ({
  shouldUseClerk: vi.fn(),
}));

vi.mock('../../../src/lib/auth/clerk-client', () => ({
  sendMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
  auth: {
    signInWithMagicLink: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('Auth Adapter', () => {
  let shouldUseClerk: Mock;
  let clerkAuth: any;
  let supabaseAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get mocked functions
    const clerkHelpers = vi.mocked(await import('../../../src/lib/auth/clerk-helpers'));
    shouldUseClerk = clerkHelpers.shouldUseClerk as Mock;
    
    clerkAuth = vi.mocked(await import('../../../src/lib/auth/clerk-client'));
    const supabaseModule = vi.mocked(await import('../../../src/lib/supabase'));
    supabaseAuth = supabaseModule.auth;
  });

  describe('sendMagicLink', () => {
    it('should use Clerk when USE_CLERK_AUTH is true', async () => {
      shouldUseClerk.mockReturnValue(true);
      clerkAuth.sendMagicLink.mockResolvedValue({ success: true });

      const result = await authAdapter.sendMagicLink('test@example.com');
      
      expect(clerkAuth.sendMagicLink).toHaveBeenCalledWith('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should use Supabase when USE_CLERK_AUTH is false', async () => {
      shouldUseClerk.mockReturnValue(false);
      supabaseAuth.signInWithMagicLink.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      });

      const result = await authAdapter.sendMagicLink('test@example.com');
      
      expect(supabaseAuth.signInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: '123', email: 'test@example.com' });
    });

    it('should handle errors from Clerk', async () => {
      shouldUseClerk.mockReturnValue(true);
      clerkAuth.sendMagicLink.mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      });

      const result = await authAdapter.sendMagicLink('test@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle errors from Supabase', async () => {
      shouldUseClerk.mockReturnValue(false);
      supabaseAuth.signInWithMagicLink.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      });

      const result = await authAdapter.sendMagicLink('test@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email');
    });
  });

  describe('signOut', () => {
    it('should use Clerk signOut when enabled', async () => {
      shouldUseClerk.mockReturnValue(true);
      clerkAuth.signOut.mockResolvedValue(undefined);

      const result = await authAdapter.signOut();
      
      expect(clerkAuth.signOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should use Supabase signOut when Clerk disabled', async () => {
      shouldUseClerk.mockReturnValue(false);
      supabaseAuth.signOut.mockResolvedValue({ error: null });

      const result = await authAdapter.signOut();
      
      expect(supabaseAuth.signOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should check Clerk authentication when enabled', async () => {
      shouldUseClerk.mockReturnValue(true);
      clerkAuth.isAuthenticated.mockResolvedValue(true);

      const result = await authAdapter.isAuthenticated();
      
      expect(clerkAuth.isAuthenticated).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should check Supabase session when Clerk disabled', async () => {
      shouldUseClerk.mockReturnValue(false);
      const supabase = vi.mocked(await import('../../../src/lib/supabase')).supabase;
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      });

      const result = await authAdapter.isAuthenticated();
      
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('getProvider', () => {
    it('should return clerk when enabled', () => {
      shouldUseClerk.mockReturnValue(true);
      expect(authAdapter.getProvider()).toBe('clerk');
    });

    it('should return supabase when clerk disabled', () => {
      shouldUseClerk.mockReturnValue(false);
      expect(authAdapter.getProvider()).toBe('supabase');
    });
  });
});