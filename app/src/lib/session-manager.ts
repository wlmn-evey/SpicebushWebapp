import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  userEmail: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  sessionId: string;
  userEmail: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class SessionManager {
  private static SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds
  private static ACTIVITY_THRESHOLD = 60 * 15; // 15 minutes in seconds
  
  /**
   * Create a new session for authenticated user
   */
  static async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session | null> {
    try {
      // Generate secure session token
      const sessionToken = this.generateSecureToken();
      const hashedToken = this.hashToken(sessionToken);
      
      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.SESSION_DURATION);
      
      // Insert session
      const { data, error } = await supabase
        .from('admin_sessions')
        .insert({
          session_token: hashedToken,
          user_id: user.id,
          user_email: user.email!,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select()
        .single();
      
      if (error) {
        console.error('Session creation error:', error);
        return null;
      }
      
      // Return session with unhashed token for cookie
      return {
        ...data,
        sessionToken, // Original token for cookie
        createdAt: new Date(data.created_at),
        lastActivity: new Date(data.last_activity),
        expiresAt: new Date(data.expires_at),
        userId: data.user_id,
        userEmail: data.user_email,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }
  
  /**
   * Validate session token and return session data
   */
  static async validateSession(sessionToken: string): Promise<Session | null> {
    try {
      const hashedToken = this.hashToken(sessionToken);
      
      // Get active, non-expired session
      const { data, error } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('session_token', hashedToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) return null;
      
      // Update last activity if needed
      const lastActivity = new Date(data.last_activity);
      const now = new Date();
      const secondsSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000;
      
      if (secondsSinceActivity > this.ACTIVITY_THRESHOLD) {
        await supabase
          .from('admin_sessions')
          .update({ last_activity: now.toISOString() })
          .eq('id', data.id);
      }
      
      return {
        id: data.id,
        sessionToken, // Keep original token
        userId: data.user_id,
        userEmail: data.user_email,
        createdAt: new Date(data.created_at),
        lastActivity: new Date(data.last_activity),
        expiresAt: new Date(data.expires_at),
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('Failed to validate session:', error);
      return null;
    }
  }
  
  /**
   * Invalidate session
   */
  static async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const hashedToken = this.hashToken(sessionToken);
      
      const { error } = await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('session_token', hashedToken);
      
      return !error;
    } catch (error) {
      console.error('Failed to invalidate session:', error);
      return false;
    }
  }
  
  /**
   * Invalidate all sessions for a user
   */
  static async invalidateUserSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      return !error;
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error);
      return false;
    }
  }
  
  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
    }
  }
  
  /**
   * Log admin action
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          session_id: entry.sessionId,
          user_email: entry.userEmail,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          details: entry.details,
          ip_address: entry.ipAddress
        });
    } catch (error) {
      console.error('Failed to log action:', error);
      // Don't throw - audit logging shouldn't break functionality
    }
  }
  
  /**
   * Generate cryptographically secure token
   */
  private static generateSecureToken(): string {
    return nanoid(32);
  }
  
  /**
   * Hash token for storage
   */
  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}