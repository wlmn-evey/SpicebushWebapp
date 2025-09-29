import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { handleMediaUpload, validateFile } from '@lib/media-storage';
import { errorResponse } from '@lib/api-utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated, session, user } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    const userId = user?.email || session.userEmail;
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
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
    
    // Log the upload
    await audit.logMediaUpload(file.name, file.size, result.url);
    
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