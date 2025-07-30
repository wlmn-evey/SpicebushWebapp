import type { AstroGlobal } from 'astro';
import { supabase } from './supabase';
import { isAdminEmail } from './admin-config';
import { SessionManager } from './session-manager';

const SESSION_COOKIE_NAME = 'sbms-session';

/**
 * Unified admin authentication check for all admin pages
 * Uses secure session management instead of simple cookies
 */
export async function checkAdminAuth(Astro: AstroGlobal) {
  try {
    // Get session token from cookie
    const sessionToken = Astro.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionToken) {
      // Validate session
      const session = await SessionManager.validateSession(sessionToken);
      
      if (session) {
        // Valid session exists
        return {
          isAuthenticated: true,
          session,
          user: { id: session.userId, email: session.userEmail }
        };
      }
      
      // Invalid session - clear cookie
      Astro.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    }
    
    // No valid session, check Supabase authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !isAdminEmail(user.email)) {
      return { isAuthenticated: false, session: null, user: null };
    }
    
    // User is authenticated but no session - create one
    const ipAddress = Astro.request.headers.get('x-forwarded-for') || 
                     Astro.request.headers.get('x-real-ip') ||
                     Astro.clientAddress;
    const userAgent = Astro.request.headers.get('user-agent') || undefined;
    
    const newSession = await SessionManager.createSession(user, ipAddress, userAgent);
    
    if (newSession) {
      // Set secure session cookie
      Astro.cookies.set(SESSION_COOKIE_NAME, newSession.sessionToken, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax'
      });
      
      // Log login action
      await SessionManager.logAction({
        sessionId: newSession.id,
        userEmail: user.email!,
        action: 'LOGIN',
        ipAddress
      });
      
      return {
        isAuthenticated: true,
        session: newSession,
        user
      };
    }
    
    return { isAuthenticated: false, session: null, user: null };
    
  } catch (error) {
    console.error('Auth check error:', error);
    return { isAuthenticated: false, session: null, user: null };
  }
}

export async function logoutAdmin(Astro: AstroGlobal) {
  const sessionToken = Astro.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionToken) {
    await SessionManager.invalidateSession(sessionToken);
    Astro.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  }
  
  await supabase.auth.signOut();
}