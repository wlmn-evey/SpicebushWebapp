/**
 * Authentication Adapter
 * Provides a unified interface for both Clerk and Supabase during migration
 */

import { shouldUseClerk } from './clerk-helpers';
import * as clerkAuth from './clerk-client';
import { supabase, auth as supabaseAuth } from '../supabase';
import type { AstroGlobal } from 'astro';

/**
 * Unified auth response interface
 */
export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
  debugUrl?: string; // For testing - remove in production
}

/**
 * Auth adapter that routes to correct provider based on feature flag
 */
export const authAdapter = {
  /**
   * Send magic link to user
   */
  async sendMagicLink(email: string): Promise<AuthResponse> {
    if (shouldUseClerk()) {
      const result = await clerkAuth.sendMagicLink(email);
      return {
        success: result.success,
        error: result.error,
        debugUrl: result.debugUrl, // For testing - remove in production
      };
    } else {
      const { data, error } = await supabaseAuth.signInWithMagicLink(email);
      return {
        success: !error,
        error: error?.message,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email || email,
        } : undefined,
      };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (shouldUseClerk()) {
      // Clerk sign-in will be handled by Clerk components
      return { success: false, error: 'Use Clerk SignIn component' };
    } else {
      const { data, error } = await supabaseAuth.signIn(email, password);
      return {
        success: !error,
        error: error?.message,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email || email,
        } : undefined,
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResponse> {
    if (shouldUseClerk()) {
      await clerkAuth.signOut();
      return { success: true };
    } else {
      const { error } = await supabaseAuth.signOut();
      return {
        success: !error,
        error: error?.message,
      };
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: any | null; error?: string }> {
    if (shouldUseClerk()) {
      const user = await clerkAuth.getCurrentUser();
      return { user };
    } else {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error: error?.message };
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (shouldUseClerk()) {
      return await clerkAuth.isAuthenticated();
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    }
  },

  /**
   * Get session
   */
  async getSession(): Promise<any> {
    if (shouldUseClerk()) {
      // Clerk session will be handled differently
      return null;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  },

  /**
   * Verify magic link token (for callback)
   */
  async verifyMagicLink(token: string): Promise<AuthResponse> {
    if (shouldUseClerk()) {
      const result = await clerkAuth.verifyMagicLink(token);
      return {
        success: result.success,
        error: result.error,
      };
    } else {
      // Supabase handles this automatically via URL params
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        return {
          success: !!session && !error,
          error: error?.message,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
          } : undefined,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Verification failed',
        };
      }
    }
  },

  /**
   * Get provider name
   */
  getProvider(): 'clerk' | 'supabase' {
    return shouldUseClerk() ? 'clerk' : 'supabase';
  },
};

/**
 * Helper to redirect based on auth status
 */
export function redirectIfNotAuthenticated(Astro: AstroGlobal, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return Astro.redirect('/auth/sign-in');
  }
}

/**
 * Helper to redirect admin users
 */
export function redirectToAdmin(Astro: AstroGlobal) {
  return Astro.redirect('/admin');
}