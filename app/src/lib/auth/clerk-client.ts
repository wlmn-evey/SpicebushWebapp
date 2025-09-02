/**
 * Clerk Client Wrapper
 * Centralized Clerk authentication client configuration
 */

import type { SignInResource, SignUpResource, UserResource } from '@clerk/types';

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
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isClerkConfigured()) {
      throw new Error('Clerk is not configured');
    }

    // This will be implemented using Clerk's email link authentication
    // For now, we'll use the sign-in with email code strategy
    const response = await fetch('/.netlify/functions/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to send magic link');
    }

    return { success: true };
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
  try {
    // This will be implemented using Clerk's user management
    // For SSR, this would need to be called from the server
    return null;
  } catch (error) {
    console.error('Get user error:', error);
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