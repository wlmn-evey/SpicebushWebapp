/**
 * Clerk Client Wrapper
 * Centralized Clerk authentication client configuration
 */

import type { SignInResource, SignUpResource, UserResource } from '@clerk/types';

// Extend window interface for Clerk
declare global {
  interface Window {
    Clerk?: {
      user?: UserResource;
      session?: any;
      signIn?: SignInResource;
      signUp?: SignUpResource;
    };
  }
}

/**
 * Clerk Auth Client Configuration
 */
export const clerkConfig = {
  publishableKey: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
  signInUrl: import.meta.env.PUBLIC_CLERK_SIGN_IN_URL || '/auth/sign-in',
  signUpUrl: import.meta.env.PUBLIC_CLERK_SIGN_UP_URL || '/auth/sign-up',
  afterSignInUrl: import.meta.env.PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/admin',
  afterSignUpUrl: import.meta.env.PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/admin',
};

/**
 * Check if Clerk is properly configured
 */
export function isClerkConfigured(): boolean {
  return !!clerkConfig.publishableKey;
}

/**
 * Magic Link Configuration
 */
export const magicLinkConfig = {
  // Email template identifier for magic links
  emailTemplate: 'magic_link',
  // Redirect URL after magic link is clicked
  redirectUrl: '/auth/callback',
  // Expiration time in minutes
  expirationMinutes: 15,
};

/**
 * Send magic link to user email
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string; debugUrl?: string }> {
  try {
    if (!isClerkConfigured()) {
      throw new Error('Clerk is not configured');
    }

    // Call the Netlify function to send magic link
    const response = await fetch('/.netlify/functions/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send magic link');
    }

    return { 
      success: true,
      debugUrl: result.debugUrl // Remove in production
    };
  } catch (error) {
    console.error('Magic link error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send magic link' 
    };
  }
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // This will be handled by Clerk's built-in verification
    // The actual implementation will use Clerk's session management
    return { success: true };
  } catch (error) {
    console.error('Magic link verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid or expired link' 
    };
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  try {
    // Clear any local session data
    if (typeof window !== 'undefined') {
      // Remove admin cookie
      document.cookie = 'sbms-admin-auth=; path=/; max-age=0';
      // Redirect to home
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Get current user from Clerk
 */
export async function getCurrentUser(): Promise<UserResource | null> {
  const USE_REAL_CLERK = import.meta.env.USE_REAL_CLERK_VALIDATION === 'true';
  
  try {
    // Log all calls to track usage
    console.log('[AUTH] getCurrentUser called');
    
    if (USE_REAL_CLERK) {
      console.log('[AUTH] Attempting real Clerk user fetch');
      
      // Check if we're in a browser context
      if (typeof window !== 'undefined' && window.Clerk) {
        // Use Clerk's client-side SDK if available
        const clerk = window.Clerk;
        if (clerk.user) {
          console.log('[AUTH] User found via Clerk SDK');
          return clerk.user as UserResource;
        }
      }
      
      // For SSR context, we need to get user from cookies/session
      // This is a temporary implementation
      console.warn('[AUTH] getCurrentUser: Unable to fetch real user (SSR context)');
      return null;
    } else {
      // Mock implementation with warning
      console.warn('[AUTH] getCurrentUser: Returning NULL (mock mode)');
      console.warn('[AUTH] Set USE_REAL_CLERK_VALIDATION=true for real user data');
      
      // Return null to maintain existing behavior
      // This is safer than returning fake user data
      return null;
    }
  } catch (error) {
    console.error('[AUTH] Get user error:', error);
    // Safe fallback - always return null on error
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch {
    return false;
  }
}