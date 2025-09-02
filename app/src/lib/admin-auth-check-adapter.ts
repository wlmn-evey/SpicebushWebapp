import type { AstroGlobal } from 'astro';
import { checkClerkAuth } from './clerk-auth';
import { shouldUseClerk } from './auth/clerk-helpers';
import { supabase } from './supabase';

/**
 * Unified admin authentication check for all admin pages
 * Routes to appropriate auth provider based on feature flag
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  if (shouldUseClerk()) {
    // Use Clerk authentication
    return checkClerkAuth(Astro);
  } else {
    // Use Supabase authentication
    return checkSupabaseAuth(Astro);
  }
}

/**
 * Check Supabase authentication for admin access
 */
async function checkSupabaseAuth(Astro: AstroGlobal) {
  try {
    // Get session from cookies
    const accessToken = Astro.cookies.get('sb-access-token');
    const refreshToken = Astro.cookies.get('sb-refresh-token');
    
    if (!accessToken?.value) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        session: null,
        redirectUrl: '/auth/sign-in'
      };
    }
    
    // Set the session in Supabase client
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken?.value || ''
    });
    
    if (error || !session) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        session: null,
        redirectUrl: '/auth/sign-in'
      };
    }
    
    // Check if user is admin
    const adminEmails = [
      'admin@spicebushmontessori.org',
      'director@spicebushmontessori.org',
      'evey@eveywinters.com'
    ];
    
    const isAdmin = session.user?.email && (
      adminEmails.includes(session.user.email) ||
      session.user.email.endsWith('@spicebushmontessori.org') ||
      session.user.email.endsWith('@eveywinters.com')
    );
    
    return {
      isAuthenticated: true,
      isAdmin,
      session,
      redirectUrl: isAdmin ? null : '/'
    };
  } catch (error) {
    console.error('Supabase auth check error:', error);
    return {
      isAuthenticated: false,
      isAdmin: false,
      session: null,
      redirectUrl: '/auth/sign-in'
    };
  }
}

/**
 * Logout admin user
 */
export async function logoutAdmin(Astro: AstroGlobal) {
  if (shouldUseClerk()) {
    // Clerk handles logout through its own session management
    // This function is kept for compatibility but doesn't need to do anything
    return;
  } else {
    // Supabase logout
    await supabase.auth.signOut();
    
    // Clear cookies
    Astro.cookies.delete('sb-access-token', { path: '/' });
    Astro.cookies.delete('sb-refresh-token', { path: '/' });
  }
}