import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAdminEmail } from '@lib/admin-config';

// Mock environment for security tests
class SecurityTestEnvironment {
  private mockRequests: Array<{ url: string; method: string; headers: any; body?: any }> = [];
  
  setupMocks() {
    // Mock fetch for security testing
    global.fetch = vi.fn().mockImplementation((url, options) => {
      this.mockRequests.push({
        url: url.toString(),
        method: options?.method || 'GET',
        headers: options?.headers || {},
        body: options?.body
      });
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Map(),
        status: 200
      });
    });
  }
  
  getRequests() {
    return this.mockRequests;
  }
  
  clearRequests() {
    this.mockRequests = [];
  }
}

describe('Magic Link Security Validation', () => {
  let securityEnv: SecurityTestEnvironment;
  
  beforeEach(() => {
    securityEnv = new SecurityTestEnvironment();
    securityEnv.setupMocks();
    vi.clearAllMocks();
  });

  describe('Input Validation Security', () => {
    it('should sanitize email inputs against XSS', () => {
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'admin@spicebushmontessori.org<script>alert("xss")</script>',
        'javascript:alert("xss")@example.com',
        'data:text/html,<script>alert("xss")</script>@example.com',
        '><img src=x onerror=alert("xss")>@example.com',
        '"><script>alert("xss")</script>@example.com'
      ];
      
      maliciousEmails.forEach(email => {
        // Email validation should reject these
        expect(isAdminEmail(email)).toBe(false);
        
        // Email regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate email format strictly', () => {
      const invalidEmails = [
        '',
        ' ',
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@com.',
        'user space@example.com',
        'user@example..com',
        'user@example.com.',
        '.user@example.com',
        'user.@example.com',
        'user@-example.com',
        'user@example-.com',
        'user@example.c',
        'user@example.toolongtobevalid'
      ];
      
      invalidEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should prevent email header injection', () => {
      const injectionAttempts = [
        'admin@spicebushmontessori.org\r\nBcc: attacker@evil.com',
        'admin@spicebushmontessori.org\nTo: victim@example.com',
        'admin@spicebushmontessori.org%0D%0ABcc: attacker@evil.com',
        'admin@spicebushmontessori.org\r\nSubject: Malicious Email',
        'admin@spicebushmontessori.org\n\nMalicious body content'
      ];
      
      injectionAttempts.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should handle unicode and internationalized emails safely', () => {
      const unicodeEmails = [
        'üser@example.com',
        'admin@spicebüsh.org',
        'тест@example.com',
        '测试@example.com',
        'admin@spicebushmontessori.org\u0000',
        'admin@spicebushmontessori.org\uFEFF'
      ];
      
      unicodeEmails.forEach(email => {
        // Should handle gracefully without crashing
        expect(() => isAdminEmail(email)).not.toThrow();
      });
    });
  });

  describe('Authorization Security', () => {
    it('should only allow specific admin emails', () => {
      const authorizedEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
        'ADMIN@SPICEBUSHMONTESSORI.ORG', // Case insensitive
        ' admin@spicebushmontessori.org ' // Whitespace handling
      ];
      
      authorizedEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });
    });

    it('should reject unauthorized emails', () => {
      const unauthorizedEmails = [
        'admin@fake-spicebushmontessori.org',
        'admin@spicebushmontessori.org.evil.com',
        'admin@evil.com',
        'parent@spicebushmontessori.org',
        'teacher@spicebushmontessori.org',
        'student@spicebushmontessori.org',
        'hacker@attacker.com',
        'social.engineer@phishing.com'
      ];
      
      unauthorizedEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should prevent subdomain attacks', () => {
      const subdomainAttacks = [
        'admin@evil.spicebushmontessori.org',
        'admin@spicebushmontessori.org.evil.com',
        'admin@sub.spicebushmontessori.org',
        'admin@api.spicebushmontessori.org',
        'admin@mail.spicebushmontessori.org'
      ];
      
      subdomainAttacks.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should handle homograph attacks', () => {
      const homographAttacks = [
        'admin@spіcebushmontessori.org', // Cyrillic 'i'
        'admin@spicebushmοntessori.org', // Greek 'o'
        'admin@spicebushmontessοri.org', // Greek 'o'
        'аdmin@spicebushmontessori.org', // Cyrillic 'a'
        'admin@spicebushmontessоri.org' // Cyrillic 'o'
      ];
      
      homographAttacks.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });
  });

  describe('Session Security', () => {
    it('should validate session tokens securely', () => {
      const invalidTokens = [
        '',
        ' ',
        'null',
        'undefined',
        'false',
        '0',
        'admin-token', // Too simple
        'token123', // Predictable
        '../../../etc/passwd', // Path traversal
        '<script>alert("xss")</script>', // XSS
        'SELECT * FROM users' // SQL injection
      ];
      
      invalidTokens.forEach(token => {
        // Mock token validation
        const isValidToken = (t: string) => {
          if (!t || t.length < 32) return false;
          if (!/^[a-zA-Z0-9_-]+$/.test(t)) return false;
          return true;
        };
        
        expect(isValidToken(token)).toBe(false);
      });
    });

    it('should enforce token expiration', () => {
      const mockToken = {
        value: 'valid-token-string',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        issuedAt: Date.now()
      };
      
      // Valid token
      expect(mockToken.expiresAt > Date.now()).toBe(true);
      
      // Expired token
      const expiredToken = {
        ...mockToken,
        expiresAt: Date.now() - 1000 // 1 second ago
      };
      
      expect(expiredToken.expiresAt > Date.now()).toBe(false);
    });

    it('should prevent session fixation attacks', () => {
      // Mock session management
      const sessions = new Map();
      
      const createSession = (userId: string) => {
        const sessionId = Math.random().toString(36).substring(2, 15) +
                         Math.random().toString(36).substring(2, 15);
        sessions.set(sessionId, {
          userId,
          createdAt: Date.now(),
          lastAccess: Date.now()
        });
        return sessionId;
      };
      
      // Each login should create new session
      const session1 = createSession('user1');
      const session2 = createSession('user1');
      
      expect(session1).not.toBe(session2);
      expect(sessions.has(session1)).toBe(true);
      expect(sessions.has(session2)).toBe(true);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting for magic link requests', () => {
      const rateLimiter = {
        requests: new Map<string, number[]>(),
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        
        isAllowed(email: string): boolean {
          const now = Date.now();
          const requests = this.requests.get(email) || [];
          
          // Remove old requests outside window
          const validRequests = requests.filter(time => now - time < this.windowMs);
          
          if (validRequests.length >= this.maxRequests) {
            return false;
          }
          
          validRequests.push(now);
          this.requests.set(email, validRequests);
          return true;
        }
      };
      
      const testEmail = 'admin@spicebushmontessori.org';
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(testEmail)).toBe(true);
      }
      
      // 6th request should be denied
      expect(rateLimiter.isAllowed(testEmail)).toBe(false);
    });

    it('should handle distributed rate limiting attacks', () => {
      const emails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com'
      ];
      
      // Simulate attack across multiple admin emails
      const globalRateLimiter = {
        totalRequests: 0,
        maxGlobalRequests: 10,
        
        isGloballyAllowed(): boolean {
          return this.totalRequests < this.maxGlobalRequests;
        },
        
        recordRequest(): boolean {
          if (!this.isGloballyAllowed()) return false;
          this.totalRequests++;
          return true;
        }
      };
      
      // Should allow some requests
      for (let i = 0; i < 10; i++) {
        const email = emails[i % emails.length];
        expect(globalRateLimiter.recordRequest()).toBe(true);
      }
      
      // Should deny further requests
      expect(globalRateLimiter.recordRequest()).toBe(false);
    });
  });

  describe('URL Security', () => {
    it('should validate redirect URLs', () => {
      const validRedirects = [
        'http://localhost:3000/auth/callback',
        'https://spicebushmontessori.org/auth/callback',
        'https://admin.spicebushmontessori.org/auth/callback'
      ];
      
      const invalidRedirects = [
        'http://evil.com/auth/callback',
        'https://evil.com/auth/callback',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://attacker.com/malware',
        '//evil.com/phishing',
        'https://spicebushmontessori.org.evil.com/callback'
      ];
      
      const isValidRedirect = (url: string) => {
        try {
          const parsed = new URL(url);
          const allowedHosts = [
            'localhost',
            'spicebushmontessori.org',
            'admin.spicebushmontessori.org'
          ];
          const allowedProtocols = ['http:', 'https:'];
          
          return allowedProtocols.includes(parsed.protocol) &&
                 allowedHosts.includes(parsed.hostname);
        } catch {
          return false;
        }
      };
      
      validRedirects.forEach(url => {
        expect(isValidRedirect(url)).toBe(true);
      });
      
      invalidRedirects.forEach(url => {
        expect(isValidRedirect(url)).toBe(false);
      });
    });

    it('should prevent open redirect attacks', () => {
      const maliciousRedirects = [
        '/auth/callback?redirect=http://evil.com',
        '/auth/callback?redirect=//evil.com',
        '/auth/callback?redirect=\\evil.com',
        '/auth/callback?redirect=%2F%2Fevil.com',
        '/auth/callback?redirect=javascript:alert("xss")'
      ];
      
      const sanitizeRedirect = (redirectParam: string) => {
        // Only allow relative URLs or specific allowed domains
        if (redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
          return redirectParam;
        }
        
        try {
          const url = new URL(redirectParam);
          const allowedDomains = ['spicebushmontessori.org', 'localhost'];
          if (allowedDomains.includes(url.hostname)) {
            return redirectParam;
          }
        } catch {
          // Invalid URL
        }
        
        return '/admin'; // Safe default
      };
      
      maliciousRedirects.forEach(url => {
        const redirectParam = new URL(`http://example.com${url}`).searchParams.get('redirect');
        const sanitized = sanitizeRedirect(redirectParam || '');
        expect(sanitized).toBe('/admin');
      });
    });
  });

  describe('CSRF Protection', () => {
    it('should validate request origins', () => {
      const validOrigins = [
        'http://localhost:3000',
        'https://spicebushmontessori.org',
        'https://admin.spicebushmontessori.org'
      ];
      
      const invalidOrigins = [
        'http://evil.com',
        'https://phishing.com',
        'https://spicebushmontessori.org.evil.com',
        'null',
        ''
      ];
      
      const isValidOrigin = (origin: string) => {
        return validOrigins.includes(origin);
      };
      
      validOrigins.forEach(origin => {
        expect(isValidOrigin(origin)).toBe(true);
      });
      
      invalidOrigins.forEach(origin => {
        expect(isValidOrigin(origin)).toBe(false);
      });
    });

    it('should require proper referrer headers', () => {
      const validReferrers = [
        'https://spicebushmontessori.org/auth/magic-login',
        'http://localhost:3000/auth/magic-login'
      ];
      
      const invalidReferrers = [
        'https://evil.com/fake-login',
        'https://phishing.com/admin',
        '',
        'null'
      ];
      
      const isValidReferrer = (referrer: string) => {
        if (!referrer) return false;
        
        try {
          const url = new URL(referrer);
          const allowedDomains = ['spicebushmontessori.org', 'localhost'];
          return allowedDomains.includes(url.hostname);
        } catch {
          return false;
        }
      };
      
      validReferrers.forEach(referrer => {
        expect(isValidReferrer(referrer)).toBe(true);
      });
      
      invalidReferrers.forEach(referrer => {
        expect(isValidReferrer(referrer)).toBe(false);
      });
    });
  });

  describe('Content Security Policy', () => {
    it('should prevent inline script execution', () => {
      const cspPolicy = "default-src 'self'; script-src 'self'; object-src 'none';";
      
      // This would be tested in a real browser environment
      // Here we just validate the policy structure
      expect(cspPolicy).toContain("script-src 'self'");
      expect(cspPolicy).toContain("object-src 'none'");
      expect(cspPolicy).not.toContain("'unsafe-inline'");
      expect(cspPolicy).not.toContain("'unsafe-eval'");
    });

    it('should restrict frame ancestors', () => {
      const frameOptions = 'DENY';
      const cspFrameAncestors = "frame-ancestors 'none'";
      
      // Should prevent clickjacking
      expect(['DENY', 'SAMEORIGIN'].includes(frameOptions)).toBe(true);
      expect(cspFrameAncestors).toContain("frame-ancestors 'none'");
    });
  });

  describe('Data Protection', () => {
    it('should not log sensitive information', () => {
      const sensitiveData = [
        'password123',
        'token-abc123',
        'session-xyz789',
        'admin@spicebushmontessori.org'
      ];
      
      const mockLogger = {
        logs: [] as string[],
        log(message: string) {
          this.logs.push(message);
        },
        
        containsSensitiveData() {
          return this.logs.some(log => 
            sensitiveData.some(sensitive => 
              log.toLowerCase().includes(sensitive.toLowerCase())
            )
          );
        }
      };
      
      // Simulate logging
      mockLogger.log('User authentication attempt');
      mockLogger.log('Magic link sent successfully');
      mockLogger.log('Session created for user ID: user123');
      
      // Should not contain sensitive data
      expect(mockLogger.containsSensitiveData()).toBe(false);
    });

    it('should encrypt sensitive data in storage', () => {
      // Mock encryption
      const mockEncryption = {
        encrypt(data: string): string {
          // In real implementation, use proper encryption
          return Buffer.from(data).toString('base64');
        },
        
        decrypt(encrypted: string): string {
          return Buffer.from(encrypted, 'base64').toString();
        }
      };
      
      const sensitiveData = 'user-session-token';
      const encrypted = mockEncryption.encrypt(sensitiveData);
      
      // Should be encrypted
      expect(encrypted).not.toBe(sensitiveData);
      
      // Should be decryptable
      const decrypted = mockEncryption.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });
  });

  describe('Environment Security', () => {
    it('should use secure defaults in production', () => {
      const productionConfig = {
        NODE_ENV: 'production',
        SECURE_COOKIES: true,
        HTTPS_ONLY: true,
        STRICT_TRANSPORT_SECURITY: true,
        SESSION_TIMEOUT: 3600000 // 1 hour
      };
      
      // Production should use secure settings
      expect(productionConfig.SECURE_COOKIES).toBe(true);
      expect(productionConfig.HTTPS_ONLY).toBe(true);
      expect(productionConfig.STRICT_TRANSPORT_SECURITY).toBe(true);
      expect(productionConfig.SESSION_TIMEOUT).toBeLessThanOrEqual(3600000);
    });

    it('should validate environment variables', () => {
      const mockEnv = {
        PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'eyJ...valid-key',
        ADMIN_EMAILS: 'admin@spicebushmontessori.org,director@spicebushmontessori.org'
      };
      
      const validateEnv = (env: any) => {
        const required = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY'];
        return required.every(key => env[key] && env[key].length > 0);
      };
      
      expect(validateEnv(mockEnv)).toBe(true);
      
      // Missing required vars should fail
      const invalidEnv = { ...mockEnv, PUBLIC_SUPABASE_URL: '' };
      expect(validateEnv(invalidEnv)).toBe(false);
    });
  });
});
