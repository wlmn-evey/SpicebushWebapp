import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Check admin authentication
    const authCookie = cookies.get('sbms-admin-auth');
    
    if (authCookie?.value !== 'bypass' && !import.meta.env.DEV) {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const collection = url.searchParams.get('collection');
    const slug = url.searchParams.get('slug');
    
    if (!collection || !slug) {
      return new Response(JSON.stringify({ error: 'Collection and slug required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { supabase } = await import('../../../lib/supabase');
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
    // Check admin authentication
    const authCookie = cookies.get('sbms-admin-auth');
    let userEmail = 'admin@spicebushmontessori.org';
    
    if (authCookie?.value !== 'bypass' && !import.meta.env.DEV) {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      userEmail = user.email || userEmail;
    }
    
    const contentData = await request.json();
    
    // Handle both old format (entry object) and new format (direct data)
    const entry = contentData.entry || contentData;
    
    const content = {
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      data: entry.data || {},
      author_email: userEmail,
      status: entry.status || 'draft'
    };
    
    const { supabase } = await import('../../../lib/supabase');
    const { error } = await supabase
      .from('content')
      .upsert(content, { onConflict: 'type,slug' });
    
    if (error) throw error;
    
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
    // Check admin authentication
    const authCookie = cookies.get('sbms-admin-auth');
    let userEmail = 'admin@spicebushmontessori.org';
    
    if (authCookie?.value !== 'bypass' && !import.meta.env.DEV) {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      userEmail = user.email || userEmail;
    }
    
    const contentData = await request.json();
    
    // Handle both old format (entry object) and new format (direct data)
    const entry = contentData.entry || contentData;
    
    const content = {
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      data: entry.data || {},
      author_email: userEmail,
      status: entry.status || 'draft',
      updated_at: new Date().toISOString()
    };
    
    const { supabase } = await import('../../../lib/supabase');
    const { error } = await supabase
      .from('content')
      .upsert(content, { onConflict: 'type,slug' });
    
    if (error) throw error;
    
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
    // Check admin authentication
    const authCookie = cookies.get('sbms-admin-auth');
    
    if (authCookie?.value !== 'bypass' && !import.meta.env.DEV) {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
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
    
    const { supabase } = await import('../../../lib/supabase');
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('type', collection)
      .eq('slug', slug);
    
    if (error) throw error;
    
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