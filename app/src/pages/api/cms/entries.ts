import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';

export const GET: APIRoute = async (context) => {
  try {
    // Check admin authentication via Clerk middleware
    // @ts-ignore - locals is dynamic
    const userId = context.locals.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const collection = context.url.searchParams.get('collection');
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { supabase } = await import('@lib/supabase');
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', collection)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform to CMS format
    const entries = data.map(entry => ({
      ...entry.data,
      title: entry.title,
      slug: entry.slug,
      collection
    }));
    
    return new Response(JSON.stringify(entries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching entries:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};