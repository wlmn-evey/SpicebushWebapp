import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin-config';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

// GET /api/cms/settings/:key - Get a setting value
export const GET: APIRoute = async ({ params, cookies }) => {
  const { key } = params;
  
  if (!key) {
    return new Response(JSON.stringify({ error: 'Setting key required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create service client for reading settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('cms_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Setting not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch setting' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/cms/settings/:key - Update a setting value (admin only)
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const { key } = params;
  
  if (!key) {
    return new Response(JSON.stringify({ error: 'Setting key required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check authentication
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user || !isAdminEmail(user.email)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const value = await request.json();

    // Update setting
    const { data, error } = await supabase
      .from('cms_settings')
      .upsert({
        key,
        value,
        updated_by: user.email,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return new Response(JSON.stringify({ error: 'Failed to update setting' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};