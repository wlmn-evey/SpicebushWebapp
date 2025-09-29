import type { APIRoute } from 'astro';
import { isAdminEmail } from '@lib/admin-config';

export const GET: APIRoute = async (context) => {
  try {
    // Check if user is authenticated via Clerk middleware
    // @ts-ignore - locals is dynamic
    const userId = context.locals.userId;
    // @ts-ignore - locals is dynamic
    const userEmail = context.locals.userEmail;

    if (!userId) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin email
    if (!isAdminEmail(userEmail)) {
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
    console.error('Auth check error:', error);
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};