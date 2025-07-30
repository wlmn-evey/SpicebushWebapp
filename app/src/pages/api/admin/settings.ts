import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
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
    
    // Get all settings from database
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .order('key');
    
    if (error) throw error;
    
    // Convert to key-value object
    const settings: Record<string, any> = {};
    data?.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return new Response(JSON.stringify(settings), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Settings GET error:', error);
    return errorResponse('Failed to load settings', 500);
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
    
    const updates = await request.json();
    
    // Validate that we received an object
    if (typeof updates !== 'object' || updates === null) {
      return errorResponse('Invalid request data', 400);
    }
    
    // Update each setting
    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      try {
        // Use Supabase to update settings
        const { error } = await supabase
          .from('settings')
          .upsert({ 
            key, 
            value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });
        
        if (error) throw error;
        
        // Log the setting change
        await audit.logSettingChange(key, null, value); // oldValue could be fetched if needed
        
        results.push({ key, success: true });
      } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        results.push({ key, success: false, error: 'Update failed' });
      }
    }
    
    // Check if all updates succeeded
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to update ${failures.length} setting(s)`,
        results
      }), {
        status: 207, // Multi-status
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${results.length} setting(s) successfully`,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Settings POST error:', error);
    return errorResponse('Failed to update settings', 500);
  }
};