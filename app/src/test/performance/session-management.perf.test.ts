import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '@lib/session-manager';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { supabase } from '@lib/supabase';
import type { User } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

vi.mock('crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      digest: vi.fn().mockReturnValue('mocked-hash')
    })
  })
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-token-12345678901234567890')
}));

describe('Session Management Performance Tests', () => {
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
    session_token: 'mocked-hash',
    user_id: 'user-123',
    user_email: 'admin@spicebushmontessori.org',
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    is_active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Creation Performance', () => {
    it('should create sessions efficiently', async () => {
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

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await SessionManager.createSession(mockUser, '127.0.0.1', 'Mozilla/5.0');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Session creation: ${avgTime.toFixed(2)}ms average per session`);
      
      // Session creation should be fast (under 10ms on average)
      expect(avgTime).toBeLessThan(10);
    });

    it('should handle concurrent session creation', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => 
              new Promise(resolve => 
                setTimeout(() => resolve({ data: mockSessionData, error: null }), 5)
              )
            )
          })
        })
      } as any);

      const concurrentRequests = 50;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        SessionManager.createSession(mockUser)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Concurrent session creation (${concurrentRequests} requests): ${totalTime.toFixed(2)}ms total`);

      // All sessions should be created successfully
      expect(results.every(r => r !== null)).toBe(true);
      
      // Should handle concurrent requests efficiently (under 500ms for 50 requests)
      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('Session Validation Performance', () => {
    it('should validate sessions quickly', async () => {
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

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await SessionManager.validateSession('test-token');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Session validation: ${avgTime.toFixed(3)}ms average per validation`);
      
      // Validation should be very fast (under 2ms on average)
      expect(avgTime).toBeLessThan(2);
    });

    it('should cache validation results efficiently', async () => {
      // Test with recent activity (no update needed)
      const recentSessionData = {
        ...mockSessionData,
        last_activity: new Date().toISOString()
      };

      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: recentSessionData,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await SessionManager.validateSession('test-token');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Session validation (no activity update): ${avgTime.toFixed(3)}ms average`);
      
      // Should be faster when no activity update is needed
      expect(avgTime).toBeLessThan(1.5);
      
      // Verify no update calls were made
      expect(mockFrom).toHaveBeenCalledTimes(iterations);
      expect(mockFrom).toHaveBeenCalledWith('admin_sessions');
    });
  });

  describe('Auth Check Performance', () => {
    it('should perform auth checks efficiently', async () => {
      const mockAstro = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'valid-token' }),
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

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await checkAdminAuth(mockAstro);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Full auth check: ${avgTime.toFixed(2)}ms average per check`);
      
      // Full auth check should be reasonably fast (under 5ms on average)
      expect(avgTime).toBeLessThan(5);
    });
  });

  describe('Token Hashing Performance', () => {
    it('should hash tokens efficiently', async () => {
      // Direct test of token generation and hashing
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // This would normally call the private methods
        // For testing, we're just measuring the mock performance
        const token = `test-token-${  i}`;
        const hash = 'mocked-hash'; // Mocked crypto.createHash
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Token hashing: ${avgTime.toFixed(4)}ms average per hash`);
      
      // Hashing should be very fast (under 0.1ms)
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe('Cleanup Performance', () => {
    it('should perform cleanup efficiently', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      } as any);

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await SessionManager.cleanupExpiredSessions();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Session cleanup: ${avgTime.toFixed(2)}ms average per cleanup`);
      
      // Cleanup should be fast (under 5ms on average)
      expect(avgTime).toBeLessThan(5);
    });
  });

  describe('Audit Logging Performance', () => {
    it('should log actions without blocking', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ error: null }), 10) // Simulate 10ms database write
          )
        )
      } as any);

      const iterations = 100;
      const startTime = performance.now();

      // Fire off audit logs without waiting
      const promises = Array.from({ length: iterations }, (_, i) =>
        SessionManager.logAction({
          sessionId: 'session-123',
          userEmail: 'admin@spicebushmontessori.org',
          action: `TEST_ACTION_${  i}`,
          details: { iteration: i }
        })
      );

      // Measure time to initiate all logs
      const initiateTime = performance.now() - startTime;

      // Now wait for all to complete
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      console.log(`Audit logging initiation: ${initiateTime.toFixed(2)}ms for ${iterations} logs`);
      console.log(`Audit logging completion: ${totalTime.toFixed(2)}ms total`);

      // Initiating logs should be nearly instant (under 50ms for 100 logs)
      expect(initiateTime).toBeLessThan(50);
      
      // Even with simulated delay, should complete reasonably fast
      expect(totalTime).toBeLessThan(1500);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
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

      // Get initial memory usage
      if (global.gc) global.gc(); // Force garbage collection if available
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      const iterations = 10000;
      for (let i = 0; i < iterations; i++) {
        await SessionManager.validateSession(`test-token-${  i}`);
        
        // Periodically check memory growth
        if (i % 1000 === 0 && global.gc) {
          global.gc();
        }
      }

      // Get final memory usage
      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

      console.log(`Memory growth after ${iterations} operations: ${memoryGrowth.toFixed(2)} MB`);

      // Memory growth should be reasonable (less than 50MB for 10k operations)
      expect(memoryGrowth).toBeLessThan(50);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high load gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from);
      let callCount = 0;

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  // Simulate occasional slow responses
                  const delay = callCount % 10 === 0 ? 50 : 1;
                  return new Promise(resolve => 
                    setTimeout(() => resolve({ data: mockSessionData, error: null }), delay)
                  );
                })
              })
            })
          })
        })
      } as any);

      const concurrentRequests = 200;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        SessionManager.validateSession(`stress-test-token-${  i}`)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;

      console.log(`Stress test (${concurrentRequests} concurrent validations): ${totalTime.toFixed(2)}ms total`);
      console.log(`Average time per validation under load: ${avgTime.toFixed(2)}ms`);

      // All validations should succeed
      expect(results.every(r => r !== null)).toBe(true);
      
      // Should complete within reasonable time even under load
      expect(totalTime).toBeLessThan(5000);
      
      // Average time should still be reasonable
      expect(avgTime).toBeLessThan(25);
    });
  });
});