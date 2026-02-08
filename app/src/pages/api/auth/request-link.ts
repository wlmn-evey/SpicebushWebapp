import type { APIRoute } from 'astro';
import { requestAdminMagicLink } from '@lib/auth/admin-session';
import { logServerError } from '@lib/server-logger';

const DEFAULT_REDIRECT = '/auth/sign-in';
const SUCCESS_NOTICE = 'check-email';
const ERROR_NOTICE = 'request-failed';

const parseRedirectPath = (value: FormDataEntryValue | string | null | undefined): string => {
  if (typeof value !== 'string') return DEFAULT_REDIRECT;
  if (!value.startsWith('/')) return DEFAULT_REDIRECT;
  if (value.startsWith('//')) return DEFAULT_REDIRECT;
  return value;
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

const parseEmail = async (request: Request): Promise<{ email: string; redirectTo: string; isForm: boolean }> => {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

  if (isForm) {
    const formData = await request.formData();
    return {
      email: String(formData.get('email') || ''),
      redirectTo: parseRedirectPath(formData.get('redirectTo')),
      isForm
    };
  }

  if (contentType.includes('application/json')) {
    const data = (await request.json()) as { email?: string; redirectTo?: string };
    return {
      email: String(data.email || ''),
      redirectTo: parseRedirectPath(data.redirectTo || null),
      isForm
    };
  }

  return {
    email: '',
    redirectTo: DEFAULT_REDIRECT,
    isForm
  };
};

const handleRequest: APIRoute = async (context) => {
  if (context.request.method !== 'POST') {
    return toJsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { email, redirectTo, isForm } = await parseEmail(context.request);
    const locals = context.locals as unknown as Record<string, unknown>;

    await requestAdminMagicLink({
      email,
      requestUrl: context.request.url,
      requestedIp: getRequestIp(context.request, locals),
      userAgent: context.request.headers.get('user-agent')
    });

    if (isForm) {
      return context.redirect(`${redirectTo}?notice=${encodeURIComponent(SUCCESS_NOTICE)}`);
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
      return context.redirect(`${DEFAULT_REDIRECT}?error=${encodeURIComponent(ERROR_NOTICE)}`);
    }

    return toJsonResponse(500, { error: 'Unable to send login link' });
  }
};

export const POST = handleRequest;
