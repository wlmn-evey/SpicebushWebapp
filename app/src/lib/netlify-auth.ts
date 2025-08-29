import { jwtDecode } from 'jwt-decode';
import type { AstroGlobal } from 'astro';
import adminConfig from '../../config/admin-users.json';

const NETLIFY_SESSION_COOKIE = 'netlify-session';

interface NetlifyUser {
  email: string;
  exp: number;
  sub: string;
  app_metadata?: {
    provider?: string;
    roles?: string[];
  };
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface NetlifySession {
  id: string;
  userId: string;
  userEmail: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Parse and decode Netlify Identity JWT token
 */
export function parseNetlifyJWT(token: string): NetlifyUser | null {
  try {
    const decoded = jwtDecode<NetlifyUser>(token);
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.log('Netlify JWT token expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Failed to parse Netlify JWT:', error);
    return null;
  }
}

/**
 * Verify if email is allowed to access admin
 */
export function verifyAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check specific admin emails
  if (adminConfig.adminEmails.includes(normalizedEmail)) {
    return true;
  }
  
  // Check allowed domains
  return adminConfig.allowedDomains.some(domain => 
    normalizedEmail.endsWith(domain)
  );
}

/**
 * Get Netlify user from request headers or cookies
 */
export function getNetlifyUser(Astro: AstroGlobal): NetlifyUser | null {
  // Check for JWT in Authorization header (for API routes)
  const authHeader = Astro.request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = parseNetlifyJWT(token);
    if (user && verifyAdminEmail(user.email)) {
      return user;
    }
  }
  
  // Check for JWT in cookie (for page routes)
  const sessionCookie = Astro.cookies.get(NETLIFY_SESSION_COOKIE)?.value;
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie) as NetlifySession;
      // Simple session validation - in production, you'd want server-side session storage
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return {
          email: session.userEmail,
          sub: session.userId,
          exp: new Date(session.expiresAt).getTime() / 1000
        } as NetlifyUser;
      }
    } catch (error) {
      console.error('Failed to parse session cookie:', error);
    }
  }
  
  return null;
}

/**
 * Create a session for Netlify user
 */
export function createNetlifySession(user: NetlifyUser, Astro: AstroGlobal): NetlifySession {
  const session: NetlifySession = {
    id: crypto.randomUUID(),
    userId: user.sub,
    userEmail: user.email,
    sessionToken: crypto.randomUUID(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  // Set session cookie
  Astro.cookies.set(NETLIFY_SESSION_COOKIE, JSON.stringify(session), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax'
  });
  
  return session;
}

/**
 * Clear Netlify session
 */
export function clearNetlifySession(Astro: AstroGlobal): void {
  Astro.cookies.delete(NETLIFY_SESSION_COOKIE, { path: '/' });
}

/**
 * Check if user is authenticated with Netlify Identity
 */
export async function checkNetlifyAuth(Astro: AstroGlobal) {
  const user = getNetlifyUser(Astro);
  
  if (!user) {
    return { isAuthenticated: false, user: null };
  }
  
  if (!verifyAdminEmail(user.email)) {
    return { isAuthenticated: false, user: null };
  }
  
  return {
    isAuthenticated: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.user_metadata?.full_name
    }
  };
}