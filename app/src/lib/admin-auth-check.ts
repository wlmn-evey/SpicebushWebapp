import type { AstroGlobal } from 'astro';
import { supabase } from './supabase';
import { isAdminEmail } from './admin-config';

/**
 * Unified admin authentication check for all admin pages
 * Checks both cookie and Supabase session
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  // First check for admin cookie (fastest check)
  const isAdminCookie = Astro.cookies.get('sbms-admin-auth')?.value === 'true';
  
  if (isAdminCookie) {
    // Cookie exists, user is authenticated
    return { isAuthenticated: true, user: null };
  }
  
  // No cookie, check Supabase session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !isAdminEmail(user.email)) {
    // Not authenticated
    return { isAuthenticated: false, user: null };
  }
  
  // User is authenticated via Supabase, set cookie for future requests
  Astro.cookies.set('sbms-admin-auth', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  });
  
  return { isAuthenticated: true, user };
}