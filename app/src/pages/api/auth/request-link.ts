import type { APIRoute } from 'astro';
import { requestAdminMagicLink } from '@lib/auth/admin-session';
import { isAllowedAdminLoginEmail } from '@lib/admin-config';
import { logServerError } from '@lib/server-logger';

const DEFAULT_REDIRECT = '/auth/sign-in';
const SUCCESS_NOTICE = 'check-email';
const ERROR_NOTICE = 'request-failed';
const DOMAIN_NOTICE = 'invalid-domain';

const parseRedirectPath = (value: FormDataEntryValue | string | null | undefined): string => {
  if (typeof value !== 'string') return DEFAULT_REDIRECT;
  if (!value.startsWith('/')) return DEFAULT_REDIRECT;
  if (value.startsWith('//')) return DEFAULT_REDIRECT;
  return value;
};

const parseNextPath = (value: FormDataEntryValue | string | null | undefined): string => {
  if (typeof value !== 'string') return '/admin';
  if (!value.startsWith('/')) return '/admin';
  if (value.startsWith('//')) return '/admin';
  return value;
};

const appendPathParam = (path: string, key: string, value: string): string => {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
};

const getRequestIp = (request: Request, locals: Record<string, unknown>): string | null => {
  const netlify = locals.netlify as { context?: { ip?: string } } | undefined;
  if (netlify?.context?.ip) {
    return netlify.context.ip;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  return forwarded.split(',')[0]?.trim() || null;
};

const toJsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseEmail = async (
  request: Request
): Promise<{ email: string; redirectTo: string; nextPath: string; isForm: boolean }> => {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

  if (isForm) {
    const formData = await request.formData();
    return {
      email: String(formData.get('email') || ''),
      redirectTo: parseRedirectPath(formData.get('redirectTo')),
      nextPath: parseNextPath(formData.get('next')),
      isForm
    };
  }

  if (contentType.includes('application/json')) {
    const data = (await request.json()) as { email?: string; redirectTo?: string; next?: string };
    return {
      email: String(data.email || ''),
      redirectTo: parseRedirectPath(data.redirectTo || null),
      nextPath: parseNextPath(data.next || null),
      isForm
    };
  }

  return {
    email: '',
    redirectTo: DEFAULT_REDIRECT,
    nextPath: '/admin',
    isForm
  };
};

const handleRequest: APIRoute = async (context) => {
  if (context.request.method !== 'POST') {
    return toJsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { email, redirectTo, nextPath, isForm } = await parseEmail(context.request);
    const locals = context.locals as unknown as Record<string, unknown>;

    if (!isAllowedAdminLoginEmail(email)) {
      if (isForm) {
        return context.redirect(appendPathParam(redirectTo, 'error', DOMAIN_NOTICE));
      }

      return toJsonResponse(403, {
        error: 'Please use a @spicebushmontessori.org or @eveywinters.com email address.'
      });
    }

    await requestAdminMagicLink({
      email,
      requestUrl: context.request.url,
      nextPath,
      requestedIp: getRequestIp(context.request, locals),
      userAgent: context.request.headers.get('user-agent')
    });

    if (isForm) {
      return context.redirect(appendPathParam(redirectTo, 'notice', SUCCESS_NOTICE));
    }

    return toJsonResponse(200, {
      success: true,
      message: 'If your email is authorized, a sign-in link has been sent.'
    });
  } catch (error) {
    logServerError('Magic link request failed', error, { route: '/api/auth/request-link' });

    const contentType = context.request.headers.get('content-type')?.toLowerCase() || '';
    const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
    if (isForm) {
      return context.redirect(appendPathParam(DEFAULT_REDIRECT, 'error', ERROR_NOTICE));
    }

    return toJsonResponse(500, { error: 'Unable to send login link' });
  }
};

export const POST = handleRequest;
