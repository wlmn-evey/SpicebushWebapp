import type { AstroGlobal } from 'astro';
import { checkNetlifyAuth, clearNetlifySession } from './netlify-auth';

/**
 * Unified admin authentication check for all admin pages
 * Uses Netlify Identity for authentication
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  return checkNetlifyAuth(Astro);
}

/**
 * Logout admin user
 */
export async function logoutAdmin(Astro: AstroGlobal) {
  clearNetlifySession(Astro);
}