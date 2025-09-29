import type { AstroGlobal } from 'astro';
import { isAdminEmail } from './admin-config';

/**
 * Unified admin authentication check for all admin pages
 * Uses Clerk for authentication (via middleware)
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  // Clerk middleware already handles authentication
  // If we reach here, user is authenticated
  // Check locals for userId and userEmail set by middleware
  const userId = (Astro.locals as any).userId;
  const userEmail = (Astro.locals as any).userEmail;

  if (!userId) {
    return {
      isAuthenticated: false,
      user: null,
      session: null
    };
  }

  // Check if user is admin
  const isAdmin = isAdminEmail(userEmail);

  return {
    isAuthenticated: true,
    isAdmin,
    user: {
      id: userId,
      email: userEmail
    },
    session: {
      userId,
      userEmail
    }
  };
}

/**
 * Logout admin user
 * Note: With Clerk, logout is handled client-side through Clerk components
 */
export async function logoutAdmin(Astro: AstroGlobal) {
  // Clerk handles logout through its own session management
  // Redirect to sign-out page
  return Astro.redirect('/auth/sign-out');
}