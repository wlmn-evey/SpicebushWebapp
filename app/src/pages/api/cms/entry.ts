import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { errorResponse } from '@lib/api-utils';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated } = await checkAdminAuth({ cookies } as any);
    
    if (!isAuthenticated) {
      return errorResponse('Unauthorized', 401);
    }
    
    const collection = url.searchParams.get('collection');
    const slug = url.searchParams.get('slug');
    
    if (!collection || !slug) {
      return new Response(JSON.stringify({ error: 'Collection and slug required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { supabase } = await import('@lib/supabase');
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', collection)
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Transform to CMS format
    const entry = {
      ...data.data,
      title: data.title,
      slug: data.slug,
      collection
    };
    
    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching entry:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    const contentData = await request.json();
    
    // Handle both old format (entry object) and new format (direct data)
    const entry = contentData.entry || contentData;
    
    const content = {
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      data: entry.data || {},
      author_email: session.userEmail,
      status: entry.status || 'draft'
    };
    
    const { supabase } = await import('@lib/supabase');
    const { error } = await supabase
      .from('content')
      .upsert(content, { onConflict: 'type,slug' });
    
    if (error) throw error;
    
    // Log the action
    await audit.logContentChange('CREATE', entry.type, entry.slug, {
      title: entry.title,
      status: entry.status || 'draft'
    });
    
    return new Response(JSON.stringify({ success: true, data: content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error saving entry:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    const contentData = await request.json();
    
    // Handle both old format (entry object) and new format (direct data)
    const entry = contentData.entry || contentData;
    
    const content = {
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      data: entry.data || {},
      author_email: session.userEmail,
      status: entry.status || 'draft',
      updated_at: new Date().toISOString()
    };
    
    const { supabase } = await import('@lib/supabase');
    const { error } = await supabase
      .from('content')
      .upsert(content, { onConflict: 'type,slug' });
    
    if (error) throw error;
    
    // Log the action
    await audit.logContentChange('UPDATE', entry.type, entry.slug, {
      title: entry.title,
      status: entry.status || 'draft'
    });
    
    return new Response(JSON.stringify({ success: true, data: content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error updating entry:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ url, request, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    let collection, slug;
    
    // Try to get from URL params first, then from request body
    collection = url.searchParams.get('collection') || url.searchParams.get('type');
    slug = url.searchParams.get('slug');
    
    if (!collection || !slug) {
      try {
        const body = await request.json();
        collection = body.type || body.collection;
        slug = body.slug;
      } catch (e) {
        // If body parsing fails, fall back to URL params
      }
    }
    
    if (!collection || !slug) {
      return new Response(JSON.stringify({ error: 'Collection/type and slug required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { supabase } = await import('@lib/supabase');
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('type', collection)
      .eq('slug', slug);
    
    if (error) throw error;
    
    // Log the action
    await audit.logContentChange('DELETE', collection, slug);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error deleting entry:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};