import type { APIRoute } from 'astro';
import { logServerError } from '@lib/server-logger';

export const GET: APIRoute = async (context) => {
  try {
    const locals = context.locals as unknown as Record<string, unknown>;
    const userId = locals.userId as string | undefined;
    const isAdmin = locals.isAdmin === true;

    if (!userId) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ authenticated: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logServerError('Auth check failed', error, { route: '/api/auth/check' });
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
