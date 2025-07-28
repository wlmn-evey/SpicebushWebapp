import type { APIRoute } from 'astro';
import { checkAdminAuth } from '../../../lib/admin-auth-check';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Check if user is authenticated as admin
    const authCookie = cookies.get('sbms-admin-auth');
    
    // Allow bypass in development
    if (authCookie?.value === 'bypass' && import.meta.env.DEV) {
      return new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check Supabase session
    const { supabase } = await import('../../../lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify admin email
    const { isAdminEmail } = await import('../../../lib/admin-config');
    if (!isAdminEmail(user.email)) {
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