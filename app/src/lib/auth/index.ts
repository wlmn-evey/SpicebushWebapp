/**
 * Unified Authentication Module
 * Single entry point for all authentication functionality
 */

// Re-export auth adapter as default
export { authAdapter as auth } from './adapter';

// Re-export all auth utilities
export * from './clerk-helpers';
export * from './clerk-admin';
export * from './adapter';

// Re-export types
export type { UserMetadata, SessionInfo } from './clerk-helpers';
export type { AdminUser, AdminSession } from './clerk-admin';
export type { AuthResponse } from './adapter';

// Auth constants
export const AUTH_COOKIE_NAME = 'sbms-admin-auth';
export const AUTH_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
export const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes in ms

/**
 * Check if authentication is properly configured
 */
export function isAuthConfigured(): boolean {
  const provider = import.meta.env.USE_CLERK_AUTH;
  
  if (provider === 'clerk' || !provider) {
    // Check Clerk configuration
    return !!(
      import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY &&
      import.meta.env.CLERK_SECRET_KEY
    );
  } else {
    // Check Supabase configuration
    return !!(
      import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );
  }
}

/**
 * Get auth provider display name
 */
export function getAuthProviderName(): string {
  const provider = import.meta.env.USE_CLERK_AUTH;
  return provider === 'supabase' ? 'Supabase' : 'Clerk';
}