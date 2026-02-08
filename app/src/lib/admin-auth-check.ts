import type { AstroGlobal } from 'astro';
import { isAdminEmail } from './admin-config';

type AuthContext = Pick<AstroGlobal, 'locals'> | { locals?: unknown };

type AdminSession = {
  userId: string;
  userEmail?: string;
};

type AdminUser = {
  id: string;
  email?: string;
};

export type AdminAuthResult = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AdminUser | null;
  session: AdminSession | null;
};

/**
 * Unified admin authentication check for all admin pages
 * Auth provider is handled upstream in middleware.
 */
export async function checkAdminAuth(context: AuthContext): Promise<AdminAuthResult> {
  // Middleware sets user identity and admin flags on locals.
  const locals = (context.locals ?? {}) as Record<string, unknown>;
  const userId = typeof locals.userId === 'string' ? locals.userId : undefined;
  const userEmail = typeof locals.userEmail === 'string' ? locals.userEmail : undefined;

  if (!userId) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      session: null
    };
  }

  // Check if user is admin
  const isAdmin = locals.isAdmin === true || isAdminEmail(userEmail);

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
 * Session revocation is handled by /auth/logout.
 */
export async function logoutAdmin(Astro: AstroGlobal) {
  return Astro.redirect('/auth/logout');
}
