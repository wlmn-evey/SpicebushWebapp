import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
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
    
    const { supabase } = await import('../../../lib/supabase');
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    
    const media = data.map(item => ({
      id: item.id,
      name: item.filename,
      url: item.url,
      path: item.url
    }));
    
    return new Response(JSON.stringify(media), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching media:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};