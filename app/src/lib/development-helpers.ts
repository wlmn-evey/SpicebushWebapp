/**
 * Development Helper Utilities
 * 
 * This module provides utility functions for development and testing environments,
 * including test email detection, enhanced error messaging, and environment checks.
 */

/**
 * Test email domains that should be treated as development/test accounts
 */
const TEST_DOMAINS = [
  '@spicebushmontessori.org',
  '@spicebushmontessori.test',
  '@example.com',
  '@test.com',
  '@localhost.test',
  '@dev.test'
];

/**
 * Determines if an email address belongs to a test/development account
 * 
 * @param email - The email address to check
 * @returns true if the email is from a test domain, false otherwise
 * 
 * @example
 * ```typescript
 * isTestEmail('user@spicebushmontessori.test') // returns true
 * isTestEmail('user@gmail.com') // returns false
 * ```
 */
export function isTestEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  return TEST_DOMAINS.some(domain => 
    normalizedEmail.endsWith(domain.toLowerCase())
  );
}

/**
 * Enhanced error message formatter for authentication errors
 * Provides user-friendly error messages with special handling for test accounts
 * 
 * @param error - The error object from authentication operations
 * @param email - Optional email address for context-specific messaging
 * @returns A user-friendly error message string
 * 
 * @example
 * ```typescript
 * const message = getAuthErrorMessage(authError, 'user@test.com');
 * ```
 */
export function getAuthErrorMessage(error: unknown, email?: string): string {
  // Handle null/undefined errors
  if (!error) {
    return 'An unknown error occurred. Please try again.';
  }

  // Extract error message from various error formats
  let errorMessage: string;
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    // Handle Supabase error format
    const supabaseError = error as any;
    errorMessage = supabaseError.message || supabaseError.error_description || 'Unknown error';
  } else {
    errorMessage = 'An unexpected error occurred';
  }

  // Normalize error message for consistent handling
  const normalizedError = errorMessage.toLowerCase();
  
  // Enhanced error messages based on error type
  if (normalizedError.includes('invalid login credentials') || 
      normalizedError.includes('invalid_credentials')) {
    if (email && isTestEmail(email)) {
      return 'Invalid credentials. For test accounts, ensure you\'ve registered first or check your password.';
    }
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (normalizedError.includes('email not confirmed') || 
      normalizedError.includes('email_not_confirmed')) {
    if (email && isTestEmail(email)) {
      return 'Email not confirmed. Test accounts should be auto-confirmed - please try signing in again or contact support.';
    }
    return 'Please check your email and click the confirmation link before signing in.';
  }
  
  if (normalizedError.includes('user not found') || 
      normalizedError.includes('user_not_found')) {
    return 'No account found with this email address. Please register first.';
  }
  
  if (normalizedError.includes('signup_disabled') || 
      normalizedError.includes('signups not allowed')) {
    return 'Account registration is currently disabled. Please contact an administrator.';
  }
  
  if (normalizedError.includes('password') && normalizedError.includes('weak')) {
    return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
  }
  
  if (normalizedError.includes('rate limit') || normalizedError.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  
  if (normalizedError.includes('network') || normalizedError.includes('fetch')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  
  if (normalizedError.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  
  if (normalizedError.includes('password too short')) {
    return 'Password must be at least 6 characters long.';
  }

  // Development-specific error enhancements
  if (isDevEnvironment()) {
    // In development, show more detailed error information
    if (normalizedError.includes('auth') || normalizedError.includes('supabase')) {
      return `Authentication error: ${errorMessage}. Check browser console for details.`;
    }
  }
  
  // Fallback to original message, cleaned up
  return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
}

/**
 * Determines if the application is running in development mode
 * 
 * @returns true if in development environment, false otherwise
 * 
 * @example
 * ```typescript
 * if (isDevEnvironment()) {
 *   console.log('Development mode - showing debug info');
 * }
 * ```
 */
export function isDevEnvironment(): boolean {
  // Check Astro's development mode
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Astro's DEV flag
    if (import.meta.env.DEV === true) {
      return true;
    }
    
    // Check NODE_ENV
    if (import.meta.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Check for local development URLs
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    if (supabaseUrl && (
      supabaseUrl.includes('localhost') || 
      supabaseUrl.includes('127.0.0.1') ||
      supabaseUrl.includes('.local')
    )) {
      return true;
    }
  }
  
  // Fallback checks for browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.endsWith('.local') ||
        hostname.endsWith('.test')) {
      return true;
    }
  }
  
  // Default to production mode for safety
  return false;
}

/**
 * Development utility: Get test account domains
 * Used internally and for testing purposes
 * 
 * @returns Array of test domain strings
 */
export function getTestDomains(): readonly string[] {
  return [...TEST_DOMAINS];
}

/**
 * Development utility: Check if verbose logging should be enabled
 * 
 * @returns true if verbose logging should be enabled
 */
export function shouldEnableVerboseLogging(): boolean {
  return isDevEnvironment() && (
    typeof import.meta !== 'undefined' && 
    import.meta.env?.VITE_VERBOSE_LOGGING === 'true'
  );
}