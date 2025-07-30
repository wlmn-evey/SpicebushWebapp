---
id: 015
title: "Authentication Edge Cases"
severity: high
status: open
category: functionality
affected_pages: ["/auth/*", "/admin/*", "protected routes"]
related_bugs: [014, 016]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 015: Authentication Edge Cases

## Description
The authentication system fails to handle various edge cases properly, including expired magic links, concurrent login attempts, session management issues, and token refresh failures. This results in users being locked out or experiencing authentication errors.

## Steps to Reproduce
1. Click magic link after expiration
2. Try logging in from multiple devices
3. Leave session idle and return
4. Use back button after logout
5. Open multiple tabs with auth

## Expected Behavior
- Clear error messages for expired links
- Multi-device login handled gracefully
- Sessions refresh automatically
- Proper logout across all tabs
- Secure handling of auth states

## Actual Behavior
- Cryptic errors for expired links
- Sessions conflict across devices
- Users logged out unexpectedly
- Auth state inconsistent across tabs
- Security vulnerabilities in edge cases

## Edge Cases Identified
```
Authentication Edge Cases:

1. Magic Link Issues
   - Links used multiple times
   - Expired links show generic error
   - No rate limiting on requests
   - Links work after password change

2. Session Management
   - No session timeout warnings
   - Refresh tokens not renewed
   - Concurrent sessions conflict
   - Logout doesn't clear all data

3. Multi-Tab Behavior
   - Auth state not synchronized
   - Race conditions on login
   - Inconsistent permissions
   - Memory leaks from listeners

4. Security Vulnerabilities
   - Session fixation possible
   - No CSRF protection
   - Tokens in localStorage (XSS risk)
   - No account lockout mechanism

5. Error Handling
   - Generic error messages
   - No recovery instructions
   - Stack traces exposed
   - Silent failures
```

## Affected Files
- `/src/lib/supabase.ts` - Auth client setup
- `/src/pages/auth/*.astro` - Auth pages
- `/src/middleware.ts` - Auth middleware
- `/src/lib/admin-auth-check.ts` - Permission checks
- Client-side auth JavaScript

## Potential Causes
1. **Incomplete Implementation**
   - Edge cases not considered
   - Minimal error handling
   - No security review

2. **State Management Issues**
   - Auth state not centralized
   - No event synchronization
   - Client/server mismatch

3. **Security Oversights**
   - Following tutorials blindly
   - No threat modeling
   - Missing security headers

## Suggested Fixes

### Option 1: Comprehensive Auth State Manager
```typescript
// src/lib/auth-manager.ts
import { createClient } from '@supabase/supabase-js';

class AuthStateManager {
  private supabase: any;
  private refreshTimer?: NodeJS.Timeout;
  private syncChannel?: BroadcastChannel;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.initializeClient();
    this.setupEventListeners();
    this.setupCrossTabSync();
  }

  private initializeClient() {
    this.supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: this.createSecureStorage(),
          storageKey: 'spicebush-auth',
          flowType: 'pkce'
        }
      }
    );
  }

  private createSecureStorage() {
    // Use memory storage for sensitive data
    const memoryStorage = new Map();

    return {
      getItem: (key: string) => {
        // Try memory first, then sessionStorage
        return memoryStorage.get(key) || sessionStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        // Store tokens in memory, other data in sessionStorage
        if (key.includes('token')) {
          memoryStorage.set(key, value);
        } else {
          sessionStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
        sessionStorage.removeItem(key);
      }
    };
  }

  private setupEventListeners() {
    this.supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log('Auth event:', event);

      switch (event) {
        case 'SIGNED_IN':
          await this.handleSignIn(session);
          break;
        case 'SIGNED_OUT':
          await this.handleSignOut();
          break;
        case 'TOKEN_REFRESHED':
          await this.handleTokenRefresh(session);
          break;
        case 'USER_UPDATED':
          await this.handleUserUpdate(session);
          break;
      }

      // Broadcast to other tabs
      this.broadcastAuthChange(event, session);
    });
  }

  private setupCrossTabSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.syncChannel = new BroadcastChannel('auth-sync');
      
      this.syncChannel.onmessage = (event) => {
        const { type, session } = event.data;
        
        // Sync auth state across tabs
        if (type === 'SIGNED_OUT') {
          window.location.href = '/auth/login';
        } else if (type === 'SIGNED_IN' && !this.supabase.auth.session()) {
          window.location.reload();
        }
      };
    }
  }

  private broadcastAuthChange(event: string, session: any) {
    if (this.syncChannel) {
      this.syncChannel.postMessage({ type: event, session });
    }
  }

  async signInWithMagicLink(email: string) {
    try {
      // Rate limiting check
      const rateLimitKey = `magic-link-${email}`;
      const lastAttempt = sessionStorage.getItem(rateLimitKey);
      
      if (lastAttempt) {
        const timeSince = Date.now() - parseInt(lastAttempt);
        if (timeSince < 60000) { // 1 minute
          throw new Error('Please wait before requesting another magic link');
        }
      }

      const { data, error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent
          }
        }
      });

      if (error) throw error;

      // Store rate limit timestamp
      sessionStorage.setItem(rateLimitKey, Date.now().toString());

      return { success: true, message: 'Check your email for the magic link!' };
    } catch (error: any) {
      console.error('Magic link error:', error);
      return { 
        success: false, 
        message: this.getUserFriendlyError(error) 
      };
    }
  }

  async verifyMagicLink(token: string, type: string) {
    try {
      // Check if token is expired (magic links expire after 1 hour)
      const tokenData = this.decodeJWT(token);
      if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
        throw new Error('This magic link has expired. Please request a new one.');
      }

      const { data, error } = await this.supabase.auth.verifyOtp({
        token,
        type
      });

      if (error) throw error;

      return { success: true, session: data.session };
    } catch (error: any) {
      console.error('Verify magic link error:', error);
      return { 
        success: false, 
        message: this.getUserFriendlyError(error) 
      };
    }
  }

  private async handleSignIn(session: any) {
    // Clear any stale data
    this.clearStaleAuthData();

    // Set up token refresh
    this.scheduleTokenRefresh(session);

    // Initialize user permissions
    await this.loadUserPermissions(session.user.id);

    // Log security event
    await this.logSecurityEvent('sign_in', session.user.id);
  }

  private async handleSignOut() {
    // Clear all auth data
    this.clearAllAuthData();

    // Cancel refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Log security event
    await this.logSecurityEvent('sign_out');

    // Redirect to login
    window.location.href = '/auth/login';
  }

  private scheduleTokenRefresh(session: any) {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh 5 minutes before expiry
    const expiresAt = session.expires_at * 1000;
    const refreshAt = expiresAt - (5 * 60 * 1000);
    const timeUntilRefresh = refreshAt - Date.now();

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshSession();
      }, timeUntilRefresh);
    }
  }

  private async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.session) {
        this.scheduleTokenRefresh(data.session);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Force re-login
      await this.signOut();
    }
  }

  private getUserFriendlyError(error: any): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'The email or password you entered is incorrect.',
      'Email not confirmed': 'Please check your email and confirm your account.',
      'Token has expired': 'This link has expired. Please request a new one.',
      'Network request failed': 'Connection error. Please check your internet and try again.'
    };

    return errorMap[error.message] || 'An unexpected error occurred. Please try again.';
  }

  private decodeJWT(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch {
      return {};
    }
  }

  private clearStaleAuthData() {
    // Clear old sessions
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('spicebush-auth-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  private clearAllAuthData() {
    this.clearStaleAuthData();
    sessionStorage.clear();
    localStorage.removeItem('spicebush-auth');
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }
}

export const authManager = new AuthStateManager();
```

### Option 2: Secure Magic Link Handler
```astro
---
// /src/pages/auth/verify-magic-link.astro
import Layout from '@layouts/Layout.astro';
import { authManager } from '@lib/auth-manager';

const { token, type, error: urlError } = Astro.url.searchParams;

let verificationResult = null;
let errorMessage = urlError;

if (token && type && !urlError) {
  verificationResult = await authManager.verifyMagicLink(token, type);
  
  if (verificationResult.success) {
    // Set secure cookie
    Astro.cookies.set('auth-session', verificationResult.session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    // Redirect to dashboard
    return Astro.redirect('/admin/dashboard');
  } else {
    errorMessage = verificationResult.message;
  }
}
---

<Layout title="Verify Magic Link">
  <div class="auth-container">
    {errorMessage ? (
      <div class="error-state">
        <h1>Authentication Failed</h1>
        <p class="error-message">{errorMessage}</p>
        
        <div class="error-actions">
          {errorMessage.includes('expired') && (
            <a href="/auth/login" class="btn btn-primary">
              Request New Magic Link
            </a>
          )}
          
          <a href="/contact" class="btn btn-secondary">
            Contact Support
          </a>
        </div>
      </div>
    ) : (
      <div class="loading-state">
        <h1>Verifying your magic link...</h1>
        <div class="spinner"></div>
      </div>
    )}
  </div>
</Layout>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .error-state {
    text-align: center;
    max-width: 400px;
  }
  
  .error-message {
    color: var(--error-color);
    margin: 20px 0;
    font-size: 16px;
  }
  
  .error-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 32px;
  }
</style>
```

### Option 3: Session Security Middleware
```typescript
// src/middleware/auth-security.ts
export async function authSecurityMiddleware(
  request: Request, 
  next: () => Promise<Response>
) {
  const url = new URL(request.url);
  
  // CSRF Protection
  if (request.method === 'POST') {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const sessionCsrf = await getSessionCSRF(request);
    
    if (!csrfToken || csrfToken !== sessionCsrf) {
      return new Response('Invalid CSRF token', { status: 403 });
    }
  }
  
  // Session validation
  const session = await getSession(request);
  if (session) {
    // Check session age
    const sessionAge = Date.now() - session.createdAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxAge) {
      await clearSession(request);
      return Response.redirect(new URL('/auth/login', request.url));
    }
    
    // Check for session hijacking
    const fingerprint = generateFingerprint(request);
    if (session.fingerprint !== fingerprint) {
      await logSecurityEvent('session_hijack_attempt', session.userId);
      await clearSession(request);
      return new Response('Security violation', { status: 403 });
    }
  }
  
  // Add security headers
  const response = await next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  
  return response;
}

function generateFingerprint(request: Request): string {
  const userAgent = request.headers.get('User-Agent') || '';
  const acceptLanguage = request.headers.get('Accept-Language') || '';
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';
  
  return crypto
    .createHash('sha256')
    .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
    .digest('hex');
}
```

## Testing Requirements
1. Test expired magic links
2. Concurrent login attempts
3. Session timeout scenarios
4. Cross-tab authentication
5. CSRF attack prevention
6. XSS vulnerability testing
7. Session hijacking attempts

## Related Issues
- Bug #014: Database auth token expiration
- Bug #016: Admin panel auth failures

## Additional Notes
- Implement proper audit logging
- Consider 2FA for admin accounts
- Regular security assessments needed
- Monitor for brute force attempts
- Implement account lockout policies
- Consider OAuth providers for convenience