import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager, type Session, type AuditLogEntry } from '@lib/session-manager';
import { checkAdminAuth, logoutAdmin } from '@lib/admin-auth-check';
import { supabase } from '@lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AstroGlobal } from 'astro';

// Mock dependencies
vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock crypto module for consistent testing
vi.mock('crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      digest: vi.fn().mockReturnValue('mocked-hash-value')
    })
  })
}));

// Mock nanoid for consistent testing
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-session-token-12345678901234567890')
}));

describe('Session Management System', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'admin@spicebushmontessori.org',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

  const mockSessionData = {
    id: 'session-123',
    session_token: 'mocked-hash-value',
    user_id: 'user-123',
    user_email: 'admin@spicebushmontessori.org',
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    is_active: true
  };

  const createMockAstro = (sessionToken?: string): AstroGlobal => ({
    cookies: {
      get: vi.fn().mockReturnValue(sessionToken ? { value: sessionToken } : undefined),
      set: vi.fn(),
      delete: vi.fn()
    },
    request: {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Mozilla/5.0'
      })
    },
    clientAddress: '127.0.0.1'
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default supabase mock behavior
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Session Creation', () => {
    it('should create a new session on login', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSessionData,
              error: null
            })
          })
        })
      } as any);

      const session = await SessionManager.createSession(
        mockUser,
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(session).toBeTruthy();
      expect(session?.userId).toBe(mockUser.id);
      expect(session?.userEmail).toBe(mockUser.email);
      expect(session?.sessionToken).toBe('mock-session-token-12345678901234567890');
      expect(session?.ipAddress).toBe('127.0.0.1');
      expect(session?.userAgent).toBe('Mozilla/5.0');
      expect(session?.isActive).toBe(true);

      // Verify database insert was called
      expect(mockFrom).toHaveBeenCalledWith('admin_sessions');
    });

    it('should handle session creation failure gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'db_error' }
            })
          })
        })
      } as any);

      const session = await SessionManager.createSession(mockUser);

      expect(session).toBeNull();
    });

    it('should set session expiry to 7 days from creation', async () => {
      const mockFrom = vi.mocked(supabase.from);
      let insertedData: any;

      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockSessionData, ...data },
                error: null
              })
            })
          };
        })
      } as any);

      const session = await SessionManager.createSession(mockUser);

      expect(session).toBeTruthy();
      const expiresAt = new Date(insertedData.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      // Check that expiry is approximately 7 days from now (within 1 minute tolerance)
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(60 * 1000); // 1 minute in milliseconds
    });
  });

  describe('Session Validation', () => {
    it('should validate active session successfully', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSessionData,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const session = await SessionManager.validateSession('mock-session-token');

      expect(session).toBeTruthy();
      expect(session?.userId).toBe(mockSessionData.user_id);
      expect(session?.isActive).toBe(true);
    });

    it('should reject expired sessions', async () => {
      const expiredSessionData = {
        ...mockSessionData,
        expires_at: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // No data returned for expired session
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const session = await SessionManager.validateSession('expired-token');

      expect(session).toBeNull();
    });

    it('should reject inactive sessions', async () => {
      const inactiveSessionData = {
        ...mockSessionData,
        is_active: false
      };

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // No data returned for inactive session
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const session = await SessionManager.validateSession('inactive-token');

      expect(session).toBeNull();
    });

    it('should update last activity when threshold is exceeded', async () => {
      const oldActivityData = {
        ...mockSessionData,
        last_activity: new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 minutes ago
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: oldActivityData,
                  error: null
                })
              })
            })
          })
        })
      } as any).mockReturnValueOnce({
        update: updateMock
      } as any);

      const session = await SessionManager.validateSession('mock-session-token');

      expect(session).toBeTruthy();
      expect(updateMock).toHaveBeenCalledWith({
        last_activity: expect.any(String)
      });
    });

    it('should not update last activity when within threshold', async () => {
      const recentActivityData = {
        ...mockSessionData,
        last_activity: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      };

      const updateMock = vi.fn();

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: recentActivityData,
                  error: null
                })
              })
            })
          })
        })
      } as any).mockReturnValueOnce({
        update: updateMock
      } as any);

      const session = await SessionManager.validateSession('mock-session-token');

      expect(session).toBeTruthy();
      expect(mockFrom).toHaveBeenCalledTimes(1); // Only called for select, not update
    });
  });

  describe('Session Invalidation', () => {
    it('should invalidate session on logout', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: updateMock
      } as any);

      const success = await SessionManager.invalidateSession('session-to-logout');

      expect(success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    });

    it('should handle invalidation errors gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' }
          })
        })
      } as any);

      const success = await SessionManager.invalidateSession('session-to-logout');

      expect(success).toBe(false);
    });

    it('should invalidate all user sessions', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: updateMock
      } as any);

      const success = await SessionManager.invalidateUserSessions('user-123');

      expect(success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('Audit Logging', () => {
    it('should log admin actions', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: insertMock
      } as any);

      const auditEntry: AuditLogEntry = {
        sessionId: 'session-123',
        userEmail: 'admin@spicebushmontessori.org',
        action: 'UPDATE_SETTINGS',
        resourceType: 'settings',
        resourceId: 'coming_soon_enabled',
        details: { oldValue: false, newValue: true },
        ipAddress: '127.0.0.1'
      };

      await SessionManager.logAction(auditEntry);

      expect(mockFrom).toHaveBeenCalledWith('admin_audit_log');
      expect(insertMock).toHaveBeenCalledWith({
        session_id: auditEntry.sessionId,
        user_email: auditEntry.userEmail,
        action: auditEntry.action,
        resource_type: auditEntry.resourceType,
        resource_id: auditEntry.resourceId,
        details: auditEntry.details,
        ip_address: auditEntry.ipAddress
      });
    });

    it('should not throw when audit logging fails', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      const auditEntry: AuditLogEntry = {
        sessionId: 'session-123',
        userEmail: 'admin@spicebushmontessori.org',
        action: 'DELETE_CONTENT'
      };

      // Should not throw
      await expect(SessionManager.logAction(auditEntry)).resolves.not.toThrow();
    });
  });

  describe('Admin Auth Check Integration', () => {
    it('should authenticate with valid session cookie', async () => {
      const mockAstro = createMockAstro('valid-session-token');

      // Mock session validation
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSessionData,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(true);
      expect(result.session).toBeTruthy();
      expect(result.user?.email).toBe('admin@spicebushmontessori.org');
      expect(mockAstro.cookies.set).not.toHaveBeenCalled();
    });

    it('should create new session for authenticated user without session', async () => {
      const mockAstro = createMockAstro(); // No session cookie

      // Mock supabase auth
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock session creation
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSessionData,
              error: null
            })
          })
        })
      } as any);

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(true);
      expect(result.session).toBeTruthy();
      expect(mockAstro.cookies.set).toHaveBeenCalledWith(
        'sbms-session',
        'mock-session-token-12345678901234567890',
        expect.objectContaining({
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
          sameSite: 'lax'
        })
      );
    });

    it('should clear invalid session cookie', async () => {
      const mockAstro = createMockAstro('invalid-session-token');

      // Mock session validation failure
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(false);
      expect(mockAstro.cookies.delete).toHaveBeenCalledWith('sbms-session', { path: '/' });
    });

    it('should reject non-admin users', async () => {
      const mockAstro = createMockAstro();
      const nonAdminUser = { ...mockUser, email: 'parent@gmail.com' };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: nonAdminUser },
        error: null
      });

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(false);
      expect(result.session).toBeNull();
      expect(mockAstro.cookies.set).not.toHaveBeenCalled();
    });
  });

  describe('Logout Functionality', () => {
    it('should properly logout user with session', async () => {
      const mockAstro = createMockAstro('session-to-logout');

      // Mock session invalidation
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: updateMock
      } as any);

      // Mock supabase signout
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      await logoutAdmin(mockAstro);

      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
      expect(mockAstro.cookies.delete).toHaveBeenCalledWith('sbms-session', { path: '/' });
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout without session gracefully', async () => {
      const mockAstro = createMockAstro(); // No session

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      await logoutAdmin(mockAstro);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockAstro.cookies.delete).not.toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should hash tokens before storage', async () => {
      const mockFrom = vi.mocked(supabase.from);
      let insertedData: any;

      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSessionData,
                error: null
              })
            })
          };
        })
      } as any);

      const session = await SessionManager.createSession(mockUser);

      expect(insertedData.session_token).toBe('mocked-hash-value');
      expect(insertedData.session_token).not.toBe('mock-session-token-12345678901234567890');
      expect(session?.sessionToken).toBe('mock-session-token-12345678901234567890'); // Original token returned
    });

    it('should protect against session fixation', async () => {
      const mockAstro = createMockAstro('existing-session');

      // First, validate existing session fails
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      // User authenticates
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // New session is created
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockSessionData, id: 'new-session-id' },
              error: null
            })
          })
        })
      } as any);

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(true);
      expect(result.session?.id).toBe('new-session-id');
      expect(mockAstro.cookies.delete).toHaveBeenCalled(); // Old session cleared
      expect(mockAstro.cookies.set).toHaveBeenCalled(); // New session set
    });

    it('should include IP address and user agent in sessions', async () => {
      const mockFrom = vi.mocked(supabase.from);
      let insertedData: any;

      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSessionData,
                error: null
              })
            })
          };
        })
      } as any);

      await SessionManager.createSession(mockUser, '192.168.1.1', 'Custom User Agent');

      expect(insertedData.ip_address).toBe('192.168.1.1');
      expect(insertedData.user_agent).toBe('Custom User Agent');
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup expired sessions', async () => {
      const updateMock = vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: updateMock
      } as any);

      await SessionManager.cleanupExpiredSessions();

      expect(mockFrom).toHaveBeenCalledWith('admin_sessions');
      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      } as any);

      // Should not throw
      await expect(SessionManager.cleanupExpiredSessions()).resolves.not.toThrow();
    });
  });

  describe('Old Cookie-Based Auth', () => {
    it('should not accept old cookie-based authentication', async () => {
      // Create mock Astro object with old cookie format
      const mockAstro = {
        cookies: {
          get: vi.fn().mockImplementation((name) => {
            if (name === 'sbms-admin-auth') return { value: 'true' };
            if (name === 'sbms-session') return undefined;
            return undefined;
          }),
          set: vi.fn(),
          delete: vi.fn()
        },
        request: {
          headers: new Headers({
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'Mozilla/5.0'
          })
        },
        clientAddress: '127.0.0.1'
      } as any;

      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(false);
      expect(result.session).toBeNull();
      // Old cookie should not grant access
    });
  });
});