import type { APIRoute } from 'astro';

const PREVIEW_MODE_COOKIE = 'sbms-preview-mode';
const VALID_MODES = new Set(['site', 'coming-soon']);

const parseRedirectPath = (value: string | null): string => {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
};

const parseMode = (value: string | null): 'site' | 'coming-soon' => {
  if (value && VALID_MODES.has(value)) {
    return value as 'site' | 'coming-soon';
  }
  return 'coming-soon';
};

const requireAdmin = (locals: Record<string, unknown>): Response | null => {
  if (!locals.userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (locals.isAdmin !== true) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
};

const handleToggle: APIRoute = async (context) => {
  const locals = context.locals as unknown as Record<string, unknown>;
  const authError = requireAdmin(locals);
  if (authError) return authError;

  const url = new URL(context.request.url);
  let requestedMode = url.searchParams.get('mode');
  let redirectTo = url.searchParams.get('redirect');

  if (context.request.method === 'POST') {
    try {
      const formData = await context.request.formData();
      requestedMode = (formData.get('mode') as string | null) ?? requestedMode;
      redirectTo = (formData.get('redirect') as string | null) ?? redirectTo;
    } catch {
      // Use query params as fallback.
    }
  }

  const mode = parseMode(requestedMode);
  const redirectPath = parseRedirectPath(redirectTo);

  if (mode === 'site') {
    context.cookies.set(PREVIEW_MODE_COOKIE, 'site', {
      path: '/',
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
      maxAge: 60 * 60 * 12
    });
  } else {
    context.cookies.delete(PREVIEW_MODE_COOKIE, { path: '/' });
  }

  return context.redirect(redirectPath);
};

export const GET = handleToggle;
export const POST = handleToggle;
