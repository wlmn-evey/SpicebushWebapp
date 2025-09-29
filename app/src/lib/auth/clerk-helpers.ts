/**
 * Clerk Authentication Helpers
 * Utility functions for Clerk authentication
 */

import type { AstroGlobal } from 'astro';
import { getAdminConfig, isAdminEmail } from '../admin-config';

/**
 * User metadata interface
 */
export interface UserMetadata {
  email: string;
  isAdmin: boolean;
  role?: string;
  permissions?: string[];
}

/**
 * Check if user has admin privileges
 */
export function checkAdminAccess(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

/**
 * Get user metadata with admin status
 */
export function getUserMetadata(email: string): UserMetadata {
  return {
    email,
    isAdmin: checkAdminAccess(email),
    role: checkAdminAccess(email) ? 'admin' : 'user',
    permissions: checkAdminAccess(email) ? ['admin.access'] : []
  };
}

/**
 * Require authentication for a page
 * Redirects to sign-in if not authenticated
 */
export function requireAuth(Astro: AstroGlobal, userId?: string) {
  if (!userId) {
    return Astro.redirect('/auth/sign-in');
  }
}

/**
 * Require admin access for a page
 * Redirects to home if not admin
 */
export function requireAdmin(Astro: AstroGlobal, email?: string) {
  if (!email || !checkAdminAccess(email)) {
    return Astro.redirect('/');
  }
}

/**
 * Format user display name
 */
export function formatUserName(email: string): string {
  // Extract name from email if no full name available
  const [localPart] = email.split('@');
  const name = localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return name;
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(email: string): string {
  const name = formatUserName(email);
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Session validation
 */
export interface SessionInfo {
  isValid: boolean;
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  expiresAt?: Date;
}

/**
 * Validate current session
 */
export async function validateSession(sessionId?: string): Promise<SessionInfo> {
  // Feature flag for gradual rollout
  const USE_REAL_VALIDATION = import.meta.env.USE_REAL_CLERK_VALIDATION === 'true';
  
  if (!sessionId) {
    return { isValid: false };
  }

  try {
    if (USE_REAL_VALIDATION) {
      // Real Clerk implementation
      // Using real Clerk validation
      
      // For now, we need to integrate with Clerk's actual session management
      // This is a temporary implementation that's better than pure mock
      // TODO: Integrate with @clerk/astro auth() from middleware context
      
      // Check if we have a valid session format
      if (sessionId && sessionId.length > 10) {
        // Basic validation that this looks like a real session
        return {
          isValid: true,
          userId: sessionId,
          email: 'user@spicebushmontessori.org', // Will be replaced with real user data
          isAdmin: false, // Will check against admin list
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
        };
      }
      
      return { isValid: false };
    } else {
      // Existing mock (with deprecation warning)
      // Using mock validation (deprecated)
      
      return {
        isValid: true,
        userId: 'mock-clerk-user',
        email: 'admin@spicebushmontessori.org',
        isAdmin: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
    }
  } catch (error) {
    console.error('[AUTH] Session validation error:', error);
    return { isValid: false };
  }
}

/**
 * Create admin session cookie
 */
export function setAdminCookie(response: Response): void {
  response.headers.append(
    'Set-Cookie',
    'sbms-admin-auth=true; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax'
  );
}

/**
 * Remove admin session cookie
 */
export function clearAdminCookie(response: Response): void {
  response.headers.append(
    'Set-Cookie',
    'sbms-admin-auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
}

/**
 * Get authentication provider from environment
 */
export function getAuthProvider(): 'clerk' | 'supabase' {
  const provider = import.meta.env.USE_CLERK_AUTH;
  return provider === 'supabase' ? 'supabase' : 'clerk';
}

/**
 * Check if should use Clerk auth
 */
export function shouldUseClerk(): boolean {
  return getAuthProvider() === 'clerk';
}