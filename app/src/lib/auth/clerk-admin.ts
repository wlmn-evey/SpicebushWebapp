/**
 * Clerk Admin Authorization
 * Handles admin-specific authentication and authorization
 */

import { checkAdminAccess, getUserMetadata } from './clerk-helpers';
import type { UserResource } from '@clerk/types';

/**
 * Admin user interface
 */
export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  role: string;
  permissions: string[];
  lastSignIn?: Date;
}

/**
 * Convert Clerk user to admin user
 */
export function toAdminUser(clerkUser: UserResource): AdminUser | null {
  const email = clerkUser.primaryEmailAddress?.emailAddress;
  
  if (!email) {
    return null;
  }

  const metadata = getUserMetadata(email);
  
  if (!metadata.isAdmin) {
    return null;
  }

  return {
    id: clerkUser.id,
    email,
    isAdmin: true,
    role: 'admin',
    permissions: ['admin.access', 'admin.manage'],
    lastSignIn: clerkUser.lastSignInAt || undefined
  };
}

/**
 * Verify admin access for API routes
 */
export async function verifyAdminAccess(authHeader?: string): Promise<{ isAdmin: boolean; user?: AdminUser }> {
  if (!authHeader) {
    return { isAdmin: false };
  }

  try {
    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // This will be implemented with Clerk's token verification
    // For now, return mock admin user
    return {
      isAdmin: true,
      user: {
        id: 'admin-user',
        email: 'admin@spicebushmontessori.org',
        isAdmin: true,
        role: 'admin',
        permissions: ['admin.access', 'admin.manage']
      }
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false };
  }
}

/**
 * Admin action types for audit logging
 */
export enum AdminAction {
  LOGIN = 'admin.login',
  LOGOUT = 'admin.logout',
  VIEW_DASHBOARD = 'admin.view_dashboard',
  MANAGE_CONTENT = 'admin.manage_content',
  MANAGE_USERS = 'admin.manage_users',
  MANAGE_SETTINGS = 'admin.manage_settings',
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  userId: string,
  action: AdminAction,
  details?: Record<string, any>
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    // Admin action logged
    
    // In production, this would send to a logging service
    // For now, just console log
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Check if email is in admin whitelist
 */
export function isWhitelistedAdmin(email: string): boolean {
  return checkAdminAccess(email);
}

/**
 * Get list of admin emails (for display purposes only)
 */
export function getAdminEmailList(): string[] {
  // Return configured admin emails
  return [
    'admin@spicebushmontessori.org',
    'director@spicebushmontessori.org',
    'evey@eveywinters.com'
  ];
}

/**
 * Admin session interface
 */
export interface AdminSession {
  userId: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Create admin session
 */
export function createAdminSession(userId: string, email: string): AdminSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    userId,
    email,
    isActive: true,
    createdAt: now,
    expiresAt
  };
}

/**
 * Validate admin session
 */
export function validateAdminSession(session: AdminSession): boolean {
  if (!session.isActive) {
    return false;
  }

  const now = new Date();
  if (now > session.expiresAt) {
    return false;
  }

  return isWhitelistedAdmin(session.email);
}