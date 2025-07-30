import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock DOM environment
let dom: JSDOM;
beforeEach(() => {
  dom = new JSDOM(`<!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="app"></div>
        <div id="auth-alert" class="hidden" role="alert" aria-live="polite">
          <p id="auth-alert-message"></p>
        </div>
        <div id="success-message" class="hidden">
          <span id="sent-email"></span>
        </div>
        <div id="error" class="hidden">
          <p id="error-message"></p>
        </div>
      </body>
    </html>`, {
    url: 'http://localhost:3000'
  });
  
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.location = dom.window.location;
});

afterEach(() => {
  dom?.window?.close();
});

describe('Magic Link Error Handling', () => {
  describe('Network Error Handling', () => {
    it('should handle fetch failures gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const mockAuth = {
        async signInWithMagicLink(email: string) {
          try {
            const response = await fetch('/auth/otp', {
              method: 'POST',
              body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
              throw new Error('Network request failed');
            }
            
            return { error: null };
          } catch (error) {
            return { error: { message: 'Failed to send magic link. Please check your connection and try again.' } };
          }
        }
      };
      
      const result = await mockAuth.signInWithMagicLink('admin@spicebushmontessori.org');
      
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Failed to send magic link');
    });

    it('should handle timeout errors', async () => {
      // Mock fetch to timeout
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      const mockAuth = {
        async signInWithMagicLink(email: string) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 50);
            
            const response = await fetch('/auth/otp', {
              method: 'POST',
              body: JSON.stringify({ email }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return { error: null };
          } catch (error) {
            if (error.name === 'AbortError') {
              return { error: { message: 'Request timed out. Please try again.' } };
            }
            return { error: { message: error.message } };
          }
        }
      };
      
      const result = await mockAuth.signInWithMagicLink('admin@spicebushmontessori.org');
      
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('timed out');
    });

    it('should handle server errors with appropriate messages', async () => {
      const serverErrors = [
        { status: 400, message: 'Invalid email format' },
        { status: 429, message: 'Rate limit exceeded' },
        { status: 500, message: 'Internal server error' },
        { status: 503, message: 'Service temporarily unavailable' }
      ];
      
      for (const serverError of serverErrors) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: serverError.status,
          json: () => Promise.resolve({ error: serverError.message })
        });
        
        const mockAuth = {
          async signInWithMagicLink(email: string) {
            try {
              const response = await fetch('/auth/otp', {
                method: 'POST',
                body: JSON.stringify({ email })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                return { error: { message: errorData.error } };
              }
              
              return { error: null };
            } catch (error) {
              return { error: { message: 'Network error occurred' } };
            }
          }
        };
        
        const result = await mockAuth.signInWithMagicLink('admin@spicebushmontessori.org');
        
        expect(result.error).toBeTruthy();
        expect(result.error.message).toBe(serverError.message);
      }
    });
  });

  describe('Email Validation Errors', () => {
    it('should handle various invalid email formats', () => {
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
        `${'a'.repeat(320)  }@example.com` // Too long
      ];
      
      const validateEmail = (email: string): boolean => {
        if (!email || email.length === 0) return false;
        if (email.length > 254) return false; // RFC 5321 limit
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return false;
        
        // Additional checks
        if (email.includes('..')) return false;
        if (email.startsWith('.') || email.endsWith('.')) return false;
        if (email.includes(' ')) return false;
        
        return true;
      };
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should provide helpful validation error messages', () => {
      const getValidationError = (email: string): string | null => {
        if (!email || email.trim().length === 0) {
          return 'Email address is required';
        }
        
        if (email.length > 254) {
          return 'Email address is too long';
        }
        
        if (!email.includes('@')) {
          return 'Please enter a valid email address';
        }
        
        if (email.includes(' ')) {
          return 'Email address cannot contain spaces';
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return 'Please enter a valid email address';
        }
        
        return null;
      };
      
      expect(getValidationError('')).toBe('Email address is required');
      expect(getValidationError('not-an-email')).toBe('Please enter a valid email address');
      expect(getValidationError('user space@example.com')).toBe('Email address cannot contain spaces');
      expect(getValidationError(`${'a'.repeat(320)  }@example.com`)).toBe('Email address is too long');
      expect(getValidationError('valid@example.com')).toBeNull();
    });
  });

  describe('Authentication Callback Errors', () => {
    it('should handle missing URL parameters', () => {
      const parseCallbackParams = (url: string) => {
        try {
          const urlObj = new URL(url);
          const params = urlObj.searchParams;
          
          const type = params.get('type');
          const token = params.get('token');
          const error = params.get('error');
          const errorDescription = params.get('error_description');
          
          if (error || errorDescription) {
            return {
              success: false,
              error: errorDescription || error || 'Authentication failed'
            };
          }
          
          if (!type || !token) {
            return {
              success: false,
              error: 'Missing required authentication parameters'
            };
          }
          
          if (type !== 'magiclink') {
            return {
              success: false,
              error: 'Invalid authentication type'
            };
          }
          
          return {
            success: true,
            type,
            token
          };
        } catch {
          return {
            success: false,
            error: 'Invalid callback URL'
          };
        }
      };
      
      const testCases = [
        {
          url: 'http://localhost:3000/auth/callback',
          expectedError: 'Missing required authentication parameters'
        },
        {
          url: 'http://localhost:3000/auth/callback?type=magiclink',
          expectedError: 'Missing required authentication parameters'
        },
        {
          url: 'http://localhost:3000/auth/callback?token=abc123',
          expectedError: 'Missing required authentication parameters'
        },
        {
          url: 'http://localhost:3000/auth/callback?type=invalid&token=abc123',
          expectedError: 'Invalid authentication type'
        },
        {
          url: 'http://localhost:3000/auth/callback?error=access_denied',
          expectedError: 'access_denied'
        },
        {
          url: 'http://localhost:3000/auth/callback?error_description=Token+expired',
          expectedError: 'Token expired'
        }
      ];
      
      testCases.forEach(({ url, expectedError }) => {
        const result = parseCallbackParams(url);
        expect(result.success).toBe(false);
        expect(result.error).toBe(expectedError);
      });
    });

    it('should handle expired tokens gracefully', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Token has expired' }
          })
        }
      };
      
      const handleCallback = async (token: string) => {
        try {
          const { data, error } = await mockSupabase.auth.exchangeCodeForSession(token);
          
          if (error) {
            if (error.message.includes('expired')) {
              return {
                success: false,
                error: 'Your magic link has expired. Please request a new one.',
                recoverable: true
              };
            }
            
            return {
              success: false,
              error: error.message,
              recoverable: false
            };
          }
          
          return {
            success: true,
            session: data.session
          };
        } catch (error) {
          return {
            success: false,
            error: 'An unexpected error occurred',
            recoverable: true
          };
        }
      };
      
      const result = await handleCallback('expired-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
      expect(result.recoverable).toBe(true);
    });

    it('should handle invalid tokens', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Invalid token' }
          })
        }
      };
      
      const handleCallback = async (token: string) => {
        const { data, error } = await mockSupabase.auth.exchangeCodeForSession(token);
        
        if (error) {
          return {
            success: false,
            error: 'Invalid or corrupted magic link. Please request a new one.'
          };
        }
        
        return { success: true, session: data.session };
      };
      
      const result = await handleCallback('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or corrupted');
    });
  });

  describe('Authorization Errors', () => {
    it('should handle non-admin users appropriately', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'parent@example.com' } },
            error: null
          }),
          signOut: vi.fn().mockResolvedValue({ error: null })
        }
      };
      
      const isAdminEmail = (email: string) => {
        const adminEmails = [
          'admin@spicebushmontessori.org',
          'director@spicebushmontessori.org',
          'evey@eveywinters.com'
        ];
        return adminEmails.includes(email.toLowerCase());
      };
      
      const handleAuthentication = async () => {
        const { data } = await mockSupabase.auth.getUser();
        const user = data?.user;
        
        if (!user) {
          return {
            success: false,
            error: 'Authentication failed'
          };
        }
        
        if (!isAdminEmail(user.email)) {
          // Sign out non-admin user
          await mockSupabase.auth.signOut();
          
          return {
            success: false,
            error: 'Access denied. Only school administrators can access this area.',
            unauthorized: true
          };
        }
        
        return {
          success: true,
          user
        };
      };
      
      const result = await handleAuthentication();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
      expect(result.unauthorized).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle missing user data', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      };
      
      const handleAuthentication = async () => {
        const { data } = await mockSupabase.auth.getUser();
        
        if (!data?.user) {
          return {
            success: false,
            error: 'Unable to verify your identity. Please try signing in again.'
          };
        }
        
        return { success: true, user: data.user };
      };
      
      const result = await handleAuthentication();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to verify');
    });
  });

  describe('UI Error Display', () => {
    it('should display error messages appropriately', () => {
      const showError = (message: string, isRecoverable = true) => {
        const alertElement = document.getElementById('auth-alert');
        const messageElement = document.getElementById('auth-alert-message');
        
        if (alertElement && messageElement) {
          // Clear previous classes
          alertElement.classList.remove('hidden', 'bg-red-50', 'bg-yellow-50');
          
          // Set appropriate styling
          if (isRecoverable) {
            alertElement.classList.add('bg-yellow-50');
          } else {
            alertElement.classList.add('bg-red-50');
          }
          
          messageElement.textContent = message;
          alertElement.style.display = 'block';
          
          return true;
        }
        
        return false;
      };
      
      // Test recoverable error
      const recoverableResult = showError('Network error. Please try again.', true);
      expect(recoverableResult).toBe(true);
      
      const alertElement = document.getElementById('auth-alert');
      expect(alertElement?.classList.contains('bg-yellow-50')).toBe(true);
      expect(alertElement?.style.display).toBe('block');
      
      // Test non-recoverable error
      const criticalResult = showError('Access denied.', false);
      expect(criticalResult).toBe(true);
      expect(alertElement?.classList.contains('bg-red-50')).toBe(true);
    });

    it('should clear error messages when appropriate', () => {
      const clearError = () => {
        const alertElement = document.getElementById('auth-alert');
        const messageElement = document.getElementById('auth-alert-message');
        
        if (alertElement && messageElement) {
          alertElement.classList.add('hidden');
          alertElement.style.display = 'none';
          messageElement.textContent = '';
          return true;
        }
        
        return false;
      };
      
      // Set up error first
      const alertElement = document.getElementById('auth-alert');
      const messageElement = document.getElementById('auth-alert-message');
      
      if (alertElement && messageElement) {
        alertElement.style.display = 'block';
        messageElement.textContent = 'Test error';
      }
      
      // Clear error
      const result = clearError();
      expect(result).toBe(true);
      expect(alertElement?.classList.contains('hidden')).toBe(true);
      expect(alertElement?.style.display).toBe('none');
      expect(messageElement?.textContent).toBe('');
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should handle rate limiting gracefully', async () => {
      let requestCount = 0;
      
      global.fetch = vi.fn().mockImplementation(() => {
        requestCount++;
        
        if (requestCount > 5) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({
              error: 'Too many requests. Please wait before trying again.'
            })
          });
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
      
      const mockAuth = {
        async signInWithMagicLink(email: string) {
          try {
            const response = await fetch('/auth/otp', {
              method: 'POST',
              body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              return {
                error: {
                  message: errorData.error,
                  rateLimited: response.status === 429
                }
              };
            }
            
            return { error: null };
          } catch (error) {
            return { error: { message: 'Network error' } };
          }
        }
      };
      
      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = await mockAuth.signInWithMagicLink('admin@spicebushmontessori.org');
        expect(result.error).toBeNull();
      }
      
      // 6th request should be rate limited
      const rateLimitedResult = await mockAuth.signInWithMagicLink('admin@spicebushmontessori.org');
      expect(rateLimitedResult.error).toBeTruthy();
      expect(rateLimitedResult.error.rateLimited).toBe(true);
      expect(rateLimitedResult.error.message).toContain('Too many requests');
    });
  });

  describe('Browser Compatibility Errors', () => {
    it('should handle missing modern browser features', () => {
      // Mock older browser environment
      const originalFetch = global.fetch;
      delete (global as any).fetch;
      
      const checkBrowserCompatibility = () => {
        const missingFeatures = [];
        
        if (typeof fetch === 'undefined') {
          missingFeatures.push('fetch');
        }
        
        if (typeof Promise === 'undefined') {
          missingFeatures.push('Promise');
        }
        
        if (typeof URL === 'undefined') {
          missingFeatures.push('URL');
        }
        
        return {
          compatible: missingFeatures.length === 0,
          missingFeatures,
          message: missingFeatures.length > 0 
            ? `Your browser is missing required features: ${missingFeatures.join(', ')}. Please update your browser.`
            : null
        };
      };
      
      const result = checkBrowserCompatibility();
      
      expect(result.compatible).toBe(false);
      expect(result.missingFeatures).toContain('fetch');
      expect(result.message).toContain('missing required features');
      
      // Restore fetch
      global.fetch = originalFetch;
    });

    it('should provide fallback for localStorage issues', () => {
      // Mock localStorage failure
      const originalLocalStorage = global.localStorage;
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage not available'); },
          setItem: () => { throw new Error('localStorage not available'); },
          removeItem: () => { throw new Error('localStorage not available'); }
        },
        writable: true
      });
      
      const safeStorage = {
        getItem(key: string): string | null {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        
        setItem(key: string, value: string): boolean {
          try {
            localStorage.setItem(key, value);
            return true;
          } catch {
            return false;
          }
        },
        
        removeItem(key: string): boolean {
          try {
            localStorage.removeItem(key);
            return true;
          } catch {
            return false;
          }
        }
      };
      
      expect(safeStorage.getItem('test')).toBeNull();
      expect(safeStorage.setItem('test', 'value')).toBe(false);
      expect(safeStorage.removeItem('test')).toBe(false);
      
      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });
  });
});
