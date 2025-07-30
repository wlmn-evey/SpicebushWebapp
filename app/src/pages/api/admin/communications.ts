import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { 
  getRecentMessages, 
  getCommunicationStats 
} from '@lib/content-db-direct';
import { AuditLogger } from '@lib/audit-logger';
import { errorResponse } from '@lib/api-utils';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated } = await checkAdminAuth({ cookies } as any);
    
    if (!isAuthenticated) {
      return errorResponse('Unauthorized', 401);
    }
    
    const searchParams = new URL(url).searchParams;
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Get communication statistics
      const stats = await getCommunicationStats();
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'recent' || !action) {
      // Get recent messages
      const limit = parseInt(searchParams.get('limit') || '10');
      const messages = await getRecentMessages(limit);
      return new Response(JSON.stringify(messages), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return errorResponse('Invalid action', 400);
    
  } catch (error) {
    console.error('Communications GET error:', error);
    return errorResponse('Failed to fetch communications data', 500);
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
    
    const messageData = await request.json();
    
    // Validate required fields
    if (!messageData.subject || !messageData.message_content || !messageData.message_type) {
      return errorResponse('Missing required fields: subject, message_content, message_type', 400);
    }
    
    // Validate message type
    const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
    if (!validTypes.includes(messageData.message_type)) {
      return errorResponse('Invalid message type', 400);
    }
    
    // Parse scheduled date if provided
    let scheduled_for: Date | undefined;
    if (messageData.scheduled_for) {
      scheduled_for = new Date(messageData.scheduled_for);
      if (isNaN(scheduled_for.getTime())) {
        return errorResponse('Invalid scheduled date', 400);
      }
    }
    
    // Save the message using Supabase
    const { data: savedMessage, error } = await supabase
      .from('communications_messages')
      .insert({
        subject: messageData.subject.trim(),
        message_content: messageData.message_content.trim(),
        message_type: messageData.message_type,
        recipient_type: messageData.recipient_type || 'all_families',
        scheduled_for: scheduled_for?.toISOString() || null,
        created_by: session.user_id,
        recipient_count: 0 // Will be updated when actually sent
      })
      .select()
      .single();
    
    if (error || !savedMessage) {
      console.error('Failed to save message:', error);
      return errorResponse('Failed to save message', 500);
    }
    
    // Log the communication action
    await audit.logAction(
      'communication_sent',
      'communications_messages',
      savedMessage.id,
      {
        subject: savedMessage.subject,
        message_type: savedMessage.message_type,
        recipient_type: savedMessage.recipient_type,
        scheduled: !!scheduled_for
      }
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: scheduled_for ? 'Message scheduled successfully' : 'Message sent successfully',
      data: savedMessage
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Communications POST error:', error);
    return errorResponse('Failed to save message', 500);
  }
};