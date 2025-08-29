import type { AstroGlobal } from 'astro';
import { checkClerkAuth } from './clerk-auth';

/**
 * Unified admin authentication check for all admin pages
 * Uses Clerk for authentication
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  return checkClerkAuth(Astro);
}

/**
 * Logout admin user
 * Note: With Clerk, logout is handled client-side through the Clerk components
 */
export async function logoutAdmin(Astro: AstroGlobal) {
  // Clerk handles logout through its own session management
  // This function is kept for compatibility but doesn't need to do anything
  return;
}