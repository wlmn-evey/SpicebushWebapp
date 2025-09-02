/**
 * Authentication Type Definitions
 * Shared types for authentication system
 */

/**
 * User role types
 */
export type UserRole = 'admin' | 'user' | 'guest';

/**
 * Permission types
 */
export type Permission = 
  | 'admin.access'
  | 'admin.manage'
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  | 'users.view'
  | 'users.manage'
  | 'settings.view'
  | 'settings.manage';

/**
 * Authentication method types
 */
export type AuthMethod = 'magic-link' | 'password' | 'oauth' | 'sso';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Session interface
 */
export interface Session {
  id: string;
  userId: string;
  userEmail: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Magic link request
 */
export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Magic link response
 */
export interface MagicLinkResponse {
  success: boolean;
  message?: string;
  error?: string;
  sentTo?: string;
  expiresAt?: Date;
}

/**
 * Sign in request
 */
export interface SignInRequest {
  email: string;
  password?: string;
  method: AuthMethod;
  rememberMe?: boolean;
}

/**
 * Sign in response
 */
export interface SignInResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  requiresVerification?: boolean;
  requiresMFA?: boolean;
}

/**
 * Auth error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  ACCOUNT_DISABLED = 'account_disabled',
  SESSION_EXPIRED = 'session_expired',
  INVALID_TOKEN = 'invalid_token',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Auth error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Auth event types for logging
 */
export enum AuthEventType {
  SIGN_IN_ATTEMPT = 'sign_in_attempt',
  SIGN_IN_SUCCESS = 'sign_in_success',
  SIGN_IN_FAILURE = 'sign_in_failure',
  SIGN_OUT = 'sign_out',
  MAGIC_LINK_SENT = 'magic_link_sent',
  MAGIC_LINK_VERIFIED = 'magic_link_verified',
  MAGIC_LINK_EXPIRED = 'magic_link_expired',
  SESSION_CREATED = 'session_created',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_EXPIRED = 'session_expired',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  EMAIL_VERIFIED = 'email_verified',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_DELETED = 'account_deleted',
}

/**
 * Auth event interface
 */
export interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  email?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Auth configuration interface
 */
export interface AuthConfig {
  provider: 'clerk' | 'supabase';
  sessionDuration: number;
  magicLinkExpiry: number;
  allowedDomains: string[];
  allowedEmails: string[];
  requireEmailVerification: boolean;
  enableMFA: boolean;
  enablePasswordless: boolean;
  enableOAuth: boolean;
  oauthProviders?: string[];
}