import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { AuditLogger } from '@lib/audit-logger';
import { errorResponse, successResponse, parseJsonBody } from '@lib/api-utils';
import { supabase } from '@lib/supabase';

interface SettingUpdate {
  key: string;
  value: any;
}

interface BulkUpdateRequest {
  settings: SettingUpdate[];
}

// PUT endpoint for updating a single setting by key
export const PUT: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Parse request body
    const body = await parseJsonBody<{ value: any }>(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    // Get key from query params or body
    const key = params.key || body.key;
    if (!key) {
      return errorResponse('Setting key is required', 400);
    }
    
    // Validate key format (alphanumeric with underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return errorResponse('Invalid setting key format', 400);
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    // Get current value for audit log
    const { data: currentSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    // Update the setting
    const { data, error } = await supabase
      .from('settings')
      .upsert({ 
        key, 
        value: body.value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Setting update error:', error);
      return errorResponse('Failed to update setting', 500);
    }
    
    // Log the change
    await audit.logSettingChange(key, currentSetting?.value || null, body.value);
    
    return successResponse({
      success: true,
      message: `Setting '${key}' updated successfully`,
      setting: data
    });
    
  } catch (error) {
    console.error('Settings PUT error:', error);
    return errorResponse('Failed to update setting', 500);
  }
};

// PATCH endpoint for bulk updates
export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Parse request body
    const body = await parseJsonBody<BulkUpdateRequest>(request);
    if (!body || !Array.isArray(body.settings)) {
      return errorResponse('Invalid request body. Expected { settings: [{ key, value }] }', 400);
    }
    
    // Validate all settings
    for (const setting of body.settings) {
      if (!setting.key || typeof setting.key !== 'string') {
        return errorResponse(`Invalid setting: missing or invalid key`, 400);
      }
      if (!/^[a-zA-Z0-9_]+$/.test(setting.key)) {
        return errorResponse(`Invalid setting key format: ${setting.key}`, 400);
      }
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    // Get current values for audit log
    const keys = body.settings.map(s => s.key);
    const { data: currentSettings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', keys);
    
    const currentValuesMap = new Map(
      currentSettings?.map(s => [s.key, s.value]) || []
    );
    
    // Perform bulk update
    const results = [];
    const errors = [];
    
    for (const setting of body.settings) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .upsert({ 
            key: setting.key, 
            value: setting.value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Log the change
        const oldValue = currentValuesMap.get(setting.key) || null;
        await audit.logSettingChange(setting.key, oldValue, setting.value);
        
        results.push({
          key: setting.key,
          success: true,
          value: data.value
        });
      } catch (error) {
        console.error(`Failed to update setting ${setting.key}:`, error);
        errors.push({
          key: setting.key,
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        });
      }
    }
    
    // Determine overall success
    const allSuccessful = errors.length === 0;
    const status = allSuccessful ? 200 : 207; // 207 Multi-Status for partial success
    
    return new Response(JSON.stringify({
      success: allSuccessful,
      message: allSuccessful 
        ? `All ${results.length} settings updated successfully`
        : `Updated ${results.length} settings, ${errors.length} failed`,
      results: [...results, ...errors]
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return errorResponse('Failed to update settings', 500);
  }
};

// DELETE endpoint to remove a setting (admin only)
export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Check authentication
    const { isAuthenticated, session } = await checkAdminAuth({ cookies, request } as any);
    
    if (!isAuthenticated || !session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Get key from params or query
    const url = new URL(request.url);
    const key = params.key || url.searchParams.get('key');
    
    if (!key) {
      return errorResponse('Setting key is required', 400);
    }
    
    // Initialize audit logger
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip');
    const audit = new AuditLogger(session, ipAddress || undefined);
    
    // Get current value for audit log
    const { data: currentSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (!currentSetting) {
      return errorResponse('Setting not found', 404);
    }
    
    // Delete the setting
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('key', key);
    
    if (error) {
      console.error('Setting delete error:', error);
      return errorResponse('Failed to delete setting', 500);
    }
    
    // Log the deletion
    await audit.logSettingChange(key, currentSetting.value, null);
    
    return successResponse({
      success: true,
      message: `Setting '${key}' deleted successfully`
    });
    
  } catch (error) {
    console.error('Settings DELETE error:', error);
    return errorResponse('Failed to delete setting', 500);
  }
};