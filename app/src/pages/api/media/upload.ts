import type { APIRoute } from 'astro';
import { checkAdminAuth } from '../../../lib/admin-auth-check';
import { handleMediaUpload, validateFile } from '../../../lib/media-storage';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check admin authentication
    const authCookie = cookies.get('sbms-admin-auth');
    const { supabase } = await import('../../../lib/supabase');
    
    let userId: string | null = null;
    
    // Check for bypass cookie in development
    if (authCookie?.value === 'bypass' && import.meta.env.DEV) {
      userId = 'dev-admin@spicebushmontessori.org';
    } else {
      // Check actual Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      userId = user.email || user.id;
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate file
    const validation = await validateFile({
      mimetype: file.type,
      size: file.size
    });
    
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Handle upload
    const result = await handleMediaUpload(
      {
        buffer,
        originalname: file.name,
        mimetype: file.type,
        size: file.size
      },
      userId
    );
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      url: result.url,
      message: 'File uploaded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Upload API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};