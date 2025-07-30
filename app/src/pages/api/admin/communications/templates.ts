import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { getTemplates } from '@lib/content-db-direct';
import { AuditLogger } from '@lib/audit-logger';
import { errorResponse } from '@lib/api-utils';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated } = await checkAdminAuth({ cookies } as any);
    
    if (!isAuthenticated) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Get all templates
    const templates = await getTemplates();
    return new Response(JSON.stringify(templates), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Templates GET error:', error);
    return errorResponse('Failed to fetch templates', 500);
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
    
    const templateData = await request.json();
    
    // Handle template usage update
    if (templateData.action === 'use_template') {
      if (!templateData.template_id) {
        return errorResponse('Missing template_id', 400);
      }
      
      const { error } = await supabase
        .from('communications_templates')
        .update({ 
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateData.template_id);
      
      if (error) {
        console.error('Failed to update template usage:', error);
        return errorResponse('Failed to update template usage', 500);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Template usage updated'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle new template creation
    if (!templateData.name || !templateData.subject_template || !templateData.content_template || !templateData.message_type) {
      return errorResponse('Missing required fields: name, subject_template, content_template, message_type', 400);
    }
    
    // Validate message type
    const validTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
    if (!validTypes.includes(templateData.message_type)) {
      return errorResponse('Invalid message type', 400);
    }
    
    // Save the template using Supabase
    const { data: savedTemplate, error } = await supabase
      .from('communications_templates')
      .insert({
        name: templateData.name.trim(),
        description: templateData.description?.trim() || null,
        message_type: templateData.message_type,
        subject_template: templateData.subject_template.trim(),
        content_template: templateData.content_template.trim(),
        created_by: session.user_id
      })
      .select()
      .single();
    
    if (error || !savedTemplate) {
      console.error('Failed to save template:', error);
      return errorResponse('Failed to save template', 500);
    }
    
    // Log the template creation
    await audit.logAction(
      'template_created',
      'communications_templates',
      savedTemplate.id,
      {
        name: savedTemplate.name,
        message_type: savedTemplate.message_type
      }
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Template created successfully',
      data: savedTemplate
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Templates POST error:', error);
    return errorResponse('Failed to process template request', 500);
  }
};