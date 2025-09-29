/**
 * Authentication Error Handling
 * Centralized error handling for auth system
 */

import { AuthErrorType } from './types';
import type { AuthError } from './types';

/**
 * Custom auth error class
 */
export class AuthenticationError extends Error implements AuthError {
  type: AuthErrorType;
  code?: string;
  details?: any;

  constructor(type: AuthErrorType, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'AuthenticationError';
    this.type = type;
    this.code = code;
    this.details = details;
  }

  /**
   * Create error from unknown source
   */
  static fromUnknown(error: unknown): AuthenticationError {
    if (error instanceof AuthenticationError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to map known error patterns
      if (error.message.includes('Invalid login credentials')) {
        return new AuthenticationError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid email or password'
        );
      }

      if (error.message.includes('User not found')) {
        return new AuthenticationError(
          AuthErrorType.USER_NOT_FOUND,
          'No account found with this email'
        );
      }

      if (error.message.includes('Email not confirmed')) {
        return new AuthenticationError(
          AuthErrorType.EMAIL_NOT_VERIFIED,
          'Please verify your email address'
        );
      }

      if (error.message.includes('JWT expired')) {
        return new AuthenticationError(
          AuthErrorType.SESSION_EXPIRED,
          'Your session has expired. Please sign in again'
        );
      }

      if (error.message.includes('Rate limit')) {
        return new AuthenticationError(
          AuthErrorType.RATE_LIMITED,
          'Too many attempts. Please try again later'
        );
      }

      if (error.message.includes('Network') || error.message.includes('fetch')) {
        return new AuthenticationError(
          AuthErrorType.NETWORK_ERROR,
          'Network error. Please check your connection'
        );
      }

      return new AuthenticationError(
        AuthErrorType.UNKNOWN_ERROR,
        error.message || 'An unexpected error occurred'
      );
    }

    return new AuthenticationError(
      AuthErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred'
    );
  }

  /**
   * Convert to user-friendly message
   */
  toUserMessage(): string {
    switch (this.type) {
    case AuthErrorType.INVALID_CREDENTIALS:
      return 'Invalid email or password. Please try again.';
      
    case AuthErrorType.USER_NOT_FOUND:
      return 'No account found with this email address.';
      
    case AuthErrorType.EMAIL_NOT_VERIFIED:
      return 'Please verify your email address before signing in.';
      
    case AuthErrorType.ACCOUNT_DISABLED:
      return 'Your account has been disabled. Please contact support.';
      
    case AuthErrorType.SESSION_EXPIRED:
      return 'Your session has expired. Please sign in again.';
      
    case AuthErrorType.INVALID_TOKEN:
      return 'This link has expired or is invalid. Please request a new one.';
      
    case AuthErrorType.RATE_LIMITED:
      return 'Too many attempts. Please wait a few minutes and try again.';
      
    case AuthErrorType.NETWORK_ERROR:
      return 'Connection error. Please check your internet and try again.';
      
    case AuthErrorType.CONFIGURATION_ERROR:
      return 'Authentication is not properly configured. Please contact support.';
      
    default:
      return 'An error occurred. Please try again or contact support.';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      AuthErrorType.NETWORK_ERROR,
      AuthErrorType.RATE_LIMITED
    ].includes(this.type);
  }

  /**
   * Get suggested action for user
   */
  getSuggestedAction(): string {
    switch (this.type) {
    case AuthErrorType.INVALID_CREDENTIALS:
      return 'Check your email and password';
      
    case AuthErrorType.USER_NOT_FOUND:
      return 'Sign up for a new account';
      
    case AuthErrorType.EMAIL_NOT_VERIFIED:
      return 'Check your email for verification link';
      
    case AuthErrorType.SESSION_EXPIRED:
    case AuthErrorType.INVALID_TOKEN:
      return 'Sign in again';
      
    case AuthErrorType.RATE_LIMITED:
      return 'Wait a few minutes';
      
    case AuthErrorType.NETWORK_ERROR:
      return 'Check your internet connection';
      
    default:
      return 'Try again or contact support';
    }
  }
}

/**
 * Error boundary for auth operations
 */
export async function withAuthErrorHandling<T>(
  operation: () => Promise<T>,
  onError?: (error: AuthenticationError) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const authError = AuthenticationError.fromUnknown(error);
    
    // Log error for debugging
    console.error('[Auth Error]', {
      type: authError.type,
      message: authError.message,
      code: authError.code,
      details: authError.details
    });

    // Call error handler if provided
    if (onError) {
      onError(authError);
    }

    // Return null to indicate failure
    return null;
  }
}

/**
 * Format error for display
 */
export function formatAuthError(error: unknown): {
  title: string;
  message: string;
  action: string;
  isRetryable: boolean;
} {
  const authError = AuthenticationError.fromUnknown(error);
  
  return {
    title: getErrorTitle(authError.type),
    message: authError.toUserMessage(),
    action: authError.getSuggestedAction(),
    isRetryable: authError.isRetryable()
  };
}

/**
 * Get error title by type
 */
function getErrorTitle(type: AuthErrorType): string {
  switch (type) {
  case AuthErrorType.INVALID_CREDENTIALS:
  case AuthErrorType.USER_NOT_FOUND:
    return 'Sign In Failed';
    
  case AuthErrorType.EMAIL_NOT_VERIFIED:
    return 'Email Not Verified';
    
  case AuthErrorType.ACCOUNT_DISABLED:
    return 'Account Disabled';
    
  case AuthErrorType.SESSION_EXPIRED:
    return 'Session Expired';
    
  case AuthErrorType.INVALID_TOKEN:
    return 'Invalid Link';
    
  case AuthErrorType.RATE_LIMITED:
    return 'Too Many Attempts';
    
  case AuthErrorType.NETWORK_ERROR:
    return 'Connection Error';
    
  case AuthErrorType.CONFIGURATION_ERROR:
    return 'Configuration Error';
    
  default:
    return 'Authentication Error';
  }
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}