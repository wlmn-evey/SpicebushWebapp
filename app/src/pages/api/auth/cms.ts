import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';
import { isAdminEmail } from '@lib/admin-config';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Check if user is authenticated
  const isAdminCookie = cookies.get('sbms-admin-auth')?.value === 'true';
  
  if (!isAdminCookie) {
    // Check Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !isAdminEmail(user.email)) {
      return redirect('/auth/login?redirect=/admin/cms');
    }
  }
  
  // User is authenticated, return success response for Decap CMS
  return new Response(JSON.stringify({
    authenticated: true,
    provider: 'supabase',
    token: 'authenticated-via-supabase'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  
  // Handle CMS auth callback
  if (body.action === 'login') {
    // Check if user is authenticated
    const isAdminCookie = cookies.get('sbms-admin-auth')?.value === 'true';
    
    if (isAdminCookie) {
      return new Response(JSON.stringify({
        authenticated: true,
        provider: 'supabase',
        token: 'authenticated-via-supabase'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  return new Response(JSON.stringify({
    authenticated: false,
    error: 'Not authenticated'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};