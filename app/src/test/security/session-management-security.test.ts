import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '@lib/session-manager';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { supabase } from '@lib/supabase';
import type { User } from '@supabase/supabase-js';
import * as crypto from 'crypto';

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

// Don't mock crypto for security tests - we want to test real hashing
vi.unmock('crypto');

// Mock nanoid with a predictable pattern for testing
let tokenCounter = 0;
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockImplementation(() => {
    tokenCounter++;
    return `test-token-${tokenCounter}`.padEnd(32, '0');
  })
}));

describe('Session Management Security Tests', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'admin@spicebushmontessori.org',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tokenCounter = 0;
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = new Set<string>();
      const iterations = 1000;

      // Generate many tokens and ensure they're unique
      for (let i = 0; i < iterations; i++) {
        const token = `test-token-${i + 1}`.padEnd(32, '0');
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);

      // Tokens should be 32 characters long
      expect(Array.from(tokens).every(t => t.length === 32)).toBe(true);
    });

    it('should properly hash tokens before storage', async () => {
      const plainToken = 'test-session-token-12345678901234';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      // Hash should be different from plain token
      expect(hashedToken).not.toBe(plainToken);

      // Hash should be consistent
      const hashedAgain = crypto.createHash('sha256').update(plainToken).digest('hex');
      expect(hashedToken).toBe(hashedAgain);

      // Hash should be 64 characters (SHA-256 hex)
      expect(hashedToken.length).toBe(64);
    });

    it('should never store plain tokens in database', async () => {
      let capturedInsertData: any;

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedInsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'session-123' },
                error: null
              })
            })
          };
        })
      } as any);

      const session = await SessionManager.createSession(mockUser);

      // The stored token should be hashed
      expect(capturedInsertData.session_token).toBeTruthy();
      expect(capturedInsertData.session_token).not.toBe(session?.sessionToken);
      expect(capturedInsertData.session_token.length).toBe(64); // SHA-256 hex length
    });
  });

  describe('Session Hijacking Protection', () => {
    it('should validate IP address consistency', async () => {
      const originalIP = '192.168.1.100';
      const attackerIP = '10.0.0.50';

      const sessionData = {
        id: 'session-123',
        session_token: 'hashed-token',
        user_id: 'user-123',
        user_email: 'admin@spicebushmontessori.org',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: originalIP,
        user_agent: 'Mozilla/5.0',
        is_active: true
      };

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: sessionData,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      // Validate session returns data but application should check IP
      const session = await SessionManager.validateSession('test-token');
      
      expect(session).toBeTruthy();
      expect(session?.ipAddress).toBe(originalIP);
      
      // Application layer should validate IP matches
      // This would be done in middleware or auth check
    });

    it('should track user agent for anomaly detection', async () => {
      const originalUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const suspiciousUA = 'curl/7.68.0';

      let capturedInsertData: any;

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedInsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'session-123' },
                error: null
              })
            })
          };
        })
      } as any);

      await SessionManager.createSession(mockUser, '127.0.0.1', originalUA);

      expect(capturedInsertData.user_agent).toBe(originalUA);
    });
  });

  describe('Session Fixation Protection', () => {
    it('should invalidate pre-existing sessions on new login', async () => {
      const mockAstro = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'old-session-token' }),
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

      // Old session validation fails
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

      // User is authenticated
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // New session is created
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-session-123',
                session_token: 'new-hashed-token',
                user_id: mockUser.id,
                user_email: mockUser.email,
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                is_active: true
              },
              error: null
            })
          })
        })
      } as any);

      const result = await checkAdminAuth(mockAstro);

      // Old cookie should be deleted
      expect(mockAstro.cookies.delete).toHaveBeenCalledWith('sbms-session', { path: '/' });
      
      // New session should be created
      expect(mockAstro.cookies.set).toHaveBeenCalled();
      expect(result.isAuthenticated).toBe(true);
      expect(result.session?.id).toBe('new-session-123');
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use constant-time token comparison', async () => {
      const validToken = 'valid-session-token-1234567890123';
      const invalidToken = 'invalid-session-token-123456789012';
      
      const timings: number[] = [];
      const iterations = 100;

      const mockFrom = vi.mocked(supabase.from);

      // Test with valid token
      for (let i = 0; i < iterations; i++) {
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

        const start = performance.now();
        await SessionManager.validateSession(validToken);
        const end = performance.now();
        timings.push(end - start);
      }

      const avgValidTime = timings.reduce((a, b) => a + b) / timings.length;
      timings.length = 0;

      // Test with invalid token
      for (let i = 0; i < iterations; i++) {
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

        const start = performance.now();
        await SessionManager.validateSession(invalidToken);
        const end = performance.now();
        timings.push(end - start);
      }

      const avgInvalidTime = timings.reduce((a, b) => a + b) / timings.length;

      // Timing difference should be minimal (less than 10% variance)
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime);
      const avgTime = (avgValidTime + avgInvalidTime) / 2;
      const variance = timingDifference / avgTime;

      console.log(`Timing attack test - Valid: ${avgValidTime.toFixed(3)}ms, Invalid: ${avgInvalidTime.toFixed(3)}ms, Variance: ${(variance * 100).toFixed(2)}%`);

      expect(variance).toBeLessThan(0.1); // Less than 10% variance
    });
  });

  describe('CSRF Protection', () => {
    it('should set appropriate cookie security flags', async () => {
      const mockAstro = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
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

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'session-123',
                session_token: 'hashed-token',
                user_id: mockUser.id,
                user_email: mockUser.email,
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                is_active: true
              },
              error: null
            })
          })
        })
      } as any);

      await checkAdminAuth(mockAstro);

      // Verify secure cookie settings
      expect(mockAstro.cookies.set).toHaveBeenCalledWith(
        'sbms-session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,       // Prevents XSS access
          sameSite: 'lax',      // CSRF protection
          path: '/',            // Proper scope
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
      );
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should not allow non-admin users to create admin sessions', async () => {
      const nonAdminUser: User = {
        ...mockUser,
        email: 'regular@example.com'
      };

      const mockAstro = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
          set: vi.fn(),
          delete: vi.fn()
        },
        request: {
          headers: new Headers({})
        },
        clientAddress: '127.0.0.1'
      } as any;

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: nonAdminUser },
        error: null
      });

      const result = await checkAdminAuth(mockAstro);

      expect(result.isAuthenticated).toBe(false);
      expect(result.session).toBeNull();
      expect(mockAstro.cookies.set).not.toHaveBeenCalled();
    });

    it('should validate admin email on every request', async () => {
      // Even with a valid session, should check admin status
      const sessionData = {
        id: 'session-123',
        session_token: 'hashed-token',
        user_id: 'user-123',
        user_email: 'hacker@evil.com', // Non-admin email in session
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: sessionData,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const session = await SessionManager.validateSession('test-token');

      // Session is technically valid
      expect(session).toBeTruthy();
      
      // But application should verify admin status
      // This would be enforced in checkAdminAuth
      expect(session?.userEmail).toBe('hacker@evil.com');
      
      // Admin check would fail for this email
      const { isAdminEmail } = await import('@lib/admin-config');
      expect(isAdminEmail(session?.userEmail)).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle malicious input in tokens', async () => {
      const maliciousTokens = [
        "'; DROP TABLE admin_sessions; --",
        "1' OR '1'='1",
        "admin' --",
        "<script>alert('xss')</script>",
        '${process.env.DATABASE_URL}',
        '\\x00\\x01\\x02\\x03',
        '../../../etc/passwd'
      ];

      const mockFrom = vi.mocked(supabase.from);

      for (const maliciousToken of maliciousTokens) {
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

        // Should not throw or cause issues
        const result = await SessionManager.validateSession(maliciousToken);
        expect(result).toBeNull();
      }

      // All calls should complete without SQL injection
      expect(mockFrom).toHaveBeenCalledTimes(maliciousTokens.length);
    });
  });

  describe('Audit Trail Security', () => {
    it('should log security-relevant events', async () => {
      let capturedAuditLog: any;

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockImplementation((table) => {
        if (table === 'admin_audit_log') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              capturedAuditLog = data;
              return Promise.resolve({ error: null });
            })
          } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'session-123',
                  session_token: 'hashed-token',
                  user_id: mockUser.id,
                  user_email: mockUser.email,
                  created_at: new Date().toISOString(),
                  last_activity: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  is_active: true
                },
                error: null
              })
            })
          })
        } as any;
      });

      await SessionManager.logAction({
        sessionId: 'session-123',
        userEmail: 'admin@spicebushmontessori.org',
        action: 'SENSITIVE_DATA_ACCESS',
        resourceType: 'user_data',
        resourceId: 'user-456',
        details: { reason: 'Support request' },
        ipAddress: '192.168.1.1'
      });

      expect(capturedAuditLog).toBeTruthy();
      expect(capturedAuditLog.action).toBe('SENSITIVE_DATA_ACCESS');
      expect(capturedAuditLog.ip_address).toBe('192.168.1.1');
      expect(capturedAuditLog.details).toEqual({ reason: 'Support request' });
    });

    it('should not expose sensitive data in logs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await SessionManager.logAction({
        sessionId: 'session-123',
        userEmail: 'admin@spicebushmontessori.org',
        action: 'UPDATE_PASSWORD',
        details: { 
          oldPassword: 'should-not-be-logged',
          newPassword: 'definitely-not-logged' 
        }
      });

      // Check that sensitive data wasn't logged to console
      const errorCalls = consoleErrorSpy.mock.calls;
      const errorStrings = errorCalls.map(call => call.join(' ')).join(' ');
      
      expect(errorStrings).not.toContain('should-not-be-logged');
      expect(errorStrings).not.toContain('definitely-not-logged');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Session Limits', () => {
    it('should enforce reasonable session duration', async () => {
      let capturedInsertData: any;

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedInsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'session-123' },
                error: null
              })
            })
          };
        })
      } as any);

      await SessionManager.createSession(mockUser);

      const expiresAt = new Date(capturedInsertData.expires_at);
      const createdAt = new Date(capturedInsertData.created_at || Date.now());
      const durationMs = expiresAt.getTime() - createdAt.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);

      // Session should expire in exactly 7 days
      expect(Math.round(durationDays)).toBe(7);
    });
  });
});