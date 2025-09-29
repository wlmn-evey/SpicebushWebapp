import type { APIRoute } from 'astro';

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

    const { supabase } = await import('@lib/supabase');
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

export const DELETE: APIRoute = async (context) => {
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

    const { id } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Photo ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { supabase } = await import('@lib/supabase');

    // Get the media record first to get file path for cleanup
    const { data: mediaRecord, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !mediaRecord) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // TODO: Delete physical file from storage
    // This would be handled by the storage provider in production
    // For now, we just remove the database record

    return new Response(JSON.stringify({
      success: true,
      message: 'Photo deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};