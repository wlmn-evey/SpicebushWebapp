import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIRoute } from 'astro';
import { PUT, PATCH, DELETE } from '@pages/api/admin/settings/update';

// Mock dependencies
vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/audit-logger', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    logSettingChange: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@lib/api-utils', () => ({
  errorResponse: (message: string, status: number) => 
    new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
  successResponse: (data: any, status = 200) => 
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }),
  parseJsonBody: vi.fn()
}));

vi.mock('@lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Import mocked dependencies
import { checkAdminAuth } from '@lib/admin-auth-check';
import { AuditLogger } from '@lib/audit-logger';
import { parseJsonBody } from '@lib/api-utils';
import { supabase } from '@lib/supabase';

describe('Settings Update API', () => {
  let mockRequest: Request;
  let mockCookies: any;
  let mockParams: any;
  let mockSupabaseChain: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mocks
    mockCookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    mockParams = {};
    
    // Setup mock audit logger
    mockAuditLogger = {
      logSettingChange: vi.fn().mockResolvedValue(undefined)
    };
    (AuditLogger as any).mockImplementation(() => mockAuditLogger);
    
    // Setup default Supabase chain mock
    mockSupabaseChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis()
    };
    
    (supabase.from as any).mockReturnValue(mockSupabaseChain);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('PUT - Single Setting Update', () => {
    it('should successfully update a single setting with valid authentication', async () => {
      // Mock authentication success
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      // Mock request body
      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      // Mock current setting retrieval
      mockSupabaseChain.single.mockResolvedValueOnce({ 
        data: { value: 'old-value' }, 
        error: null 
      });

      // Mock successful update
      mockSupabaseChain.single.mockResolvedValueOnce({ 
        data: { key: 'test_key', value: 'new-value', updated_at: '2025-07-31T12:00:00Z' }, 
        error: null 
      });

      // Create request
      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({ value: 'new-value' })
      });

      mockParams = { key: 'test_key' };

      // Execute
      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Setting 'test_key' updated successfully");
      expect(data.setting.key).toBe('test_key');
      expect(data.setting.value).toBe('new-value');

      // Verify audit logging
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledWith(
        'test_key',
        'old-value',
        'new-value'
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock authentication failure
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: false,
        session: null
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue(null);

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT'
      });

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing setting key', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        body: JSON.stringify({ value: 'new-value' })
      });

      mockParams = {}; // No key in params

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Setting key is required');
    });

    it('should return 400 for invalid key format', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        body: JSON.stringify({ value: 'new-value' })
      });

      mockParams = { key: 'invalid-key-with-dashes' };

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid setting key format');
    });

    it('should handle database errors gracefully', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      // Mock database error
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });
      mockSupabaseChain.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        body: JSON.stringify({ value: 'new-value' })
      });

      mockParams = { key: 'test_key' };

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update setting');
    });

    it('should create new setting if it does not exist (upsert)', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      // Mock that current setting doesn't exist
      mockSupabaseChain.single.mockResolvedValueOnce({ 
        data: null, 
        error: null 
      });

      // Mock successful upsert
      mockSupabaseChain.single.mockResolvedValueOnce({ 
        data: { key: 'new_key', value: 'new-value', updated_at: '2025-07-31T12:00:00Z' }, 
        error: null 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        body: JSON.stringify({ value: 'new-value' })
      });

      mockParams = { key: 'new_key' };

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify audit log shows null as old value
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledWith(
        'new_key',
        null,
        'new-value'
      );
    });
  });

  describe('PATCH - Bulk Settings Update', () => {
    it('should successfully update multiple settings', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      const bulkRequest = {
        settings: [
          { key: 'setting1', value: 'value1' },
          { key: 'setting2', value: 'value2' }
        ]
      };

      (parseJsonBody as any).mockResolvedValue(bulkRequest);

      // Mock current settings
      mockSupabaseChain.in.mockReturnThis();
      mockSupabaseChain.select.mockResolvedValue({
        data: [
          { key: 'setting1', value: 'old1' },
          { key: 'setting2', value: 'old2' }
        ],
        error: null
      });

      // Mock successful updates
      mockSupabaseChain.single
        .mockResolvedValueOnce({ 
          data: { key: 'setting1', value: 'value1' }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: { key: 'setting2', value: 'value2' }, 
          error: null 
        });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-real-ip': '10.0.0.1'
        },
        body: JSON.stringify(bulkRequest)
      });

      const response = await PATCH({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('All 2 settings updated successfully');
      expect(data.results).toHaveLength(2);
      expect(data.results[0]).toEqual({ key: 'setting1', success: true, value: 'value1' });
      expect(data.results[1]).toEqual({ key: 'setting2', success: true, value: 'value2' });

      // Verify audit logs
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledTimes(2);
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledWith('setting1', 'old1', 'value1');
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledWith('setting2', 'old2', 'value2');
    });

    it('should handle partial failures with 207 status', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      const bulkRequest = {
        settings: [
          { key: 'setting1', value: 'value1' },
          { key: 'setting2', value: 'value2' }
        ]
      };

      (parseJsonBody as any).mockResolvedValue(bulkRequest);

      // Mock current settings
      mockSupabaseChain.select.mockResolvedValue({
        data: [{ key: 'setting1', value: 'old1' }],
        error: null
      });

      // Mock one success and one failure
      mockSupabaseChain.single
        .mockResolvedValueOnce({ 
          data: { key: 'setting1', value: 'value1' }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: null, 
          error: { message: 'Database error' } 
        });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PATCH',
        body: JSON.stringify(bulkRequest)
      });

      const response = await PATCH({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data.success).toBe(false);
      expect(data.message).toBe('Updated 1 settings, 1 failed');
      expect(data.results).toHaveLength(2);
      expect(data.results[0]).toEqual({ key: 'setting1', success: true, value: 'value1' });
      expect(data.results[1]).toEqual({ 
        key: 'setting2', 
        success: false, 
        error: 'Database error' 
      });
    });

    it('should return 400 for invalid request body format', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ notSettings: [] });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PATCH',
        body: JSON.stringify({ notSettings: [] })
      });

      const response = await PATCH({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body. Expected { settings: [{ key, value }] }');
    });

    it('should validate all setting keys before processing', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      const bulkRequest = {
        settings: [
          { key: 'valid_key', value: 'value1' },
          { key: 'invalid-key', value: 'value2' } // Invalid format
        ]
      };

      (parseJsonBody as any).mockResolvedValue(bulkRequest);

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PATCH',
        body: JSON.stringify(bulkRequest)
      });

      const response = await PATCH({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid setting key format: invalid-key');
    });

    it('should validate missing keys in settings', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      const bulkRequest = {
        settings: [
          { value: 'value1' }, // Missing key
        ]
      };

      (parseJsonBody as any).mockResolvedValue(bulkRequest);

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PATCH',
        body: JSON.stringify(bulkRequest)
      });

      const response = await PATCH({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid setting: missing or invalid key');
    });
  });

  describe('DELETE - Setting Deletion', () => {
    it('should successfully delete a setting', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      // Mock current setting exists
      mockSupabaseChain.single.mockResolvedValue({ 
        data: { value: 'existing-value' }, 
        error: null 
      });

      // Mock successful deletion
      mockSupabaseChain.delete.mockReturnThis();
      mockSupabaseChain.eq.mockResolvedValue({ 
        data: null, 
        error: null 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update?key=test_key', {
        method: 'DELETE',
        headers: { 
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await DELETE({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Setting 'test_key' deleted successfully");

      // Verify audit log
      expect(mockAuditLogger.logSettingChange).toHaveBeenCalledWith(
        'test_key',
        'existing-value',
        null
      );
    });

    it('should return 404 for non-existent setting', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      // Mock setting doesn't exist
      mockSupabaseChain.single.mockResolvedValue({ 
        data: null, 
        error: null 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update?key=non_existent', {
        method: 'DELETE'
      });

      const response = await DELETE({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Setting not found');
    });

    it('should return 400 for missing key', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'DELETE'
      });

      const response = await DELETE({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Setting key is required');
    });

    it('should handle key from params', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      mockSupabaseChain.single.mockResolvedValue({ 
        data: { value: 'value' }, 
        error: null 
      });

      mockSupabaseChain.delete.mockReturnThis();
      mockSupabaseChain.eq.mockResolvedValue({ 
        data: null, 
        error: null 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'DELETE'
      });

      mockParams = { key: 'param_key' };

      const response = await DELETE({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Setting 'param_key' deleted successfully");
    });

    it('should handle database deletion errors', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      mockSupabaseChain.single.mockResolvedValue({ 
        data: { value: 'value' }, 
        error: null 
      });

      mockSupabaseChain.delete.mockReturnThis();
      mockSupabaseChain.eq.mockResolvedValue({ 
        data: null, 
        error: { message: 'Delete failed' } 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update?key=test_key', {
        method: 'DELETE'
      });

      const response = await DELETE({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete setting');
    });
  });

  describe('Audit Logging', () => {
    it('should include IP address in audit logs when available', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      mockSupabaseChain.single.mockResolvedValue({ 
        data: { key: 'test_key', value: 'new-value' }, 
        error: null 
      });

      // Test with x-forwarded-for header
      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        headers: { 
          'x-forwarded-for': '192.168.1.100',
          'x-real-ip': '10.0.0.1'
        }
      });

      mockParams = { key: 'test_key' };

      await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);

      // Verify AuditLogger was initialized with IP address
      expect(AuditLogger).toHaveBeenCalledWith(
        { id: 'session-123', userEmail: 'admin@example.com' },
        '192.168.1.100'
      );
    });

    it('should use x-real-ip when x-forwarded-for is not available', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockResolvedValue({ value: 'new-value' });

      mockSupabaseChain.single.mockResolvedValue({ 
        data: { key: 'test_key', value: 'new-value' }, 
        error: null 
      });

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT',
        headers: { 
          'x-real-ip': '10.0.0.1'
        }
      });

      mockParams = { key: 'test_key' };

      await PUT({ request: mockRequest, cookies: mockCookies, params: mockParams } as any);

      expect(AuditLogger).toHaveBeenCalledWith(
        { id: 'session-123', userEmail: 'admin@example.com' },
        '10.0.0.1'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      (checkAdminAuth as any).mockRejectedValue(new Error('Unexpected error'));

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT'
      });

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update setting');
    });

    it('should handle JSON parsing errors', async () => {
      (checkAdminAuth as any).mockResolvedValue({
        isAuthenticated: true,
        session: { id: 'session-123', userEmail: 'admin@example.com' }
      });

      (parseJsonBody as any).mockRejectedValue(new Error('JSON parse error'));

      mockRequest = new Request('http://localhost:3000/api/admin/settings/update', {
        method: 'PUT'
      });

      const response = await PUT({ request: mockRequest, cookies: mockCookies, params: {} } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update setting');
    });
  });
});