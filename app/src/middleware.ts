import type { APIContext, MiddlewareNext } from 'astro';
import { isAdminEmail } from '@lib/admin-config';
import { ADMIN_SESSION_COOKIE_NAME, validateAdminSession } from '@lib/auth/admin-session';
import { queryFirst } from '@lib/db/client';

const PREVIEW_MODE_COOKIE = 'sbms-preview-mode';
const PREVIEW_MODE_SITE = 'site';
const COMING_SOON_CACHE_TTL_MS = 30 * 1000;

let cachedComingSoonValue: boolean | null = null;
let cachedComingSoonExpiresAt = 0;

const PROTECTED_PREFIXES = ['/admin', '/api/admin', '/api/cms', '/api/media/upload', '/api/storage/stats'];

const isProtectedRoute = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const isApiRoute = (pathname: string): boolean => pathname.startsWith('/api/');

const unauthorizedResponse = (status: 401 | 403, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

async function getComingSoonEnabled(): Promise<boolean> {
  const runtimeEnv = (typeof process !== 'undefined' && typeof process.env !== 'undefined') ? process.env : undefined;
  const rawComingSoon = runtimeEnv?.COMING_SOON_MODE ?? import.meta.env.COMING_SOON_MODE;
  if (typeof rawComingSoon === 'string') {
    return parseBoolean(rawComingSoon);
  }

  const now = Date.now();
  if (cachedComingSoonValue !== null && cachedComingSoonExpiresAt > now) {
    return cachedComingSoonValue;
  }

  try {
    const data = await queryFirst<{ value: unknown }>(
      `
        SELECT value
        FROM settings
        WHERE key = $1
        LIMIT 1
      `,
      ['coming_soon_enabled']
    );

    const enabled = parseBoolean(data?.value ?? false);
    cachedComingSoonValue = enabled;
    cachedComingSoonExpiresAt = now + COMING_SOON_CACHE_TTL_MS;
    return enabled;
  } catch {
    cachedComingSoonValue = false;
    cachedComingSoonExpiresAt = now + COMING_SOON_CACHE_TTL_MS;
    return false;
  }
}

const handleComingSoon = async (context: APIContext, next: MiddlewareNext) => {
  const isComingSoonEnabled = await getComingSoonEnabled();
  const pathname = context.url.pathname;

  const bypassPaths = [
    '/coming-soon',
    '/coming-soon-comprehensive',
    '/admin',
    '/auth',
    '/api',
    '/uploads',
    '/_image',
    '/favicon.svg',
    '/images/'
  ];

  const shouldBypass = bypassPaths.some((path) => pathname.startsWith(path));
  const hasAuthParams = context.url.searchParams.has('token_hash') ||
                       context.url.searchParams.has('type') ||
                       context.url.searchParams.has('error') ||
                       context.url.searchParams.has('error_code');

  if (isComingSoonEnabled && !shouldBypass && !hasAuthParams) {
    const locals = context.locals as unknown as Record<string, unknown>;
    const isAdmin = locals.isAdmin === true;
    const previewMode = context.cookies.get(PREVIEW_MODE_COOKIE)?.value;
    if (isAdmin && previewMode === PREVIEW_MODE_SITE) {
      return next();
    }

    return context.redirect('/coming-soon');
  }

  return next();
};

export const onRequest = async (context: APIContext, next: MiddlewareNext) => {
  const locals = context.locals as unknown as Record<string, unknown>;
  const sessionToken = context.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  let userId: string | null = null;
  let userEmail: string | undefined;

  if (sessionToken) {
    const session = await validateAdminSession(sessionToken);
    if (session) {
      userId = session.sessionId;
      userEmail = session.email;
    }
  }

  locals.userId = userId;
  if (userEmail) {
    locals.userEmail = userEmail;
  } else {
    delete locals.userEmail;
  }

  const isAdmin = isAdminEmail(userEmail);
  locals.isAdmin = isAdmin;

  if (isProtectedRoute(context.url.pathname)) {
    if (!userId) {
      if (isApiRoute(context.url.pathname)) {
        return unauthorizedResponse(401, 'Authentication required');
      }
      return context.redirect('/auth/sign-in');
    }

    if (!isAdmin) {
      if (isApiRoute(context.url.pathname)) {
        return unauthorizedResponse(403, 'Admin access required');
      }
      return context.redirect('/');
    }
  }

  return handleComingSoon(context, next);
};
