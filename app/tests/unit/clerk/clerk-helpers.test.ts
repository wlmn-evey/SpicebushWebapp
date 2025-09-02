/**
 * Unit Tests for Clerk Helpers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAdminAccess,
  getUserMetadata,
  formatUserName,
  getUserInitials,
  shouldUseClerk,
  getAuthProvider,
} from '../../../src/lib/auth/clerk-helpers';

describe('Clerk Helpers', () => {
  describe('checkAdminAccess', () => {
    it('should return true for admin emails', () => {
      expect(checkAdminAccess('admin@spicebushmontessori.org')).toBe(true);
      expect(checkAdminAccess('director@spicebushmontessori.org')).toBe(true);
      expect(checkAdminAccess('evey@eveywinters.com')).toBe(true);
    });

    it('should return true for admin domains', () => {
      expect(checkAdminAccess('anyone@spicebushmontessori.org')).toBe(true);
      expect(checkAdminAccess('test@eveywinters.com')).toBe(true);
    });

    it('should return false for non-admin emails', () => {
      expect(checkAdminAccess('user@example.com')).toBe(false);
      expect(checkAdminAccess('test@gmail.com')).toBe(false);
    });

    it('should handle null/undefined emails', () => {
      expect(checkAdminAccess(null)).toBe(false);
      expect(checkAdminAccess(undefined)).toBe(false);
      expect(checkAdminAccess('')).toBe(false);
    });
  });

  describe('getUserMetadata', () => {
    it('should return admin metadata for admin users', () => {
      const metadata = getUserMetadata('admin@spicebushmontessori.org');
      expect(metadata).toEqual({
        email: 'admin@spicebushmontessori.org',
        isAdmin: true,
        role: 'admin',
        permissions: ['admin.access'],
      });
    });

    it('should return user metadata for non-admin users', () => {
      const metadata = getUserMetadata('user@example.com');
      expect(metadata).toEqual({
        email: 'user@example.com',
        isAdmin: false,
        role: 'user',
        permissions: [],
      });
    });
  });

  describe('formatUserName', () => {
    it('should format email to display name', () => {
      expect(formatUserName('john.doe@example.com')).toBe('John Doe');
      expect(formatUserName('jane_smith@example.com')).toBe('Jane Smith');
      expect(formatUserName('admin@spicebushmontessori.org')).toBe('Admin');
    });

    it('should handle complex email formats', () => {
      expect(formatUserName('mary.jane.doe@example.com')).toBe('Mary Jane Doe');
      expect(formatUserName('test-user@example.com')).toBe('Test User');
    });
  });

  describe('getUserInitials', () => {
    it('should get initials from email', () => {
      expect(getUserInitials('john.doe@example.com')).toBe('JD');
      expect(getUserInitials('jane@example.com')).toBe('JA');
      expect(getUserInitials('admin@spicebushmontessori.org')).toBe('AD');
    });

    it('should handle single word names', () => {
      expect(getUserInitials('user@example.com')).toBe('US');
      expect(getUserInitials('test@example.com')).toBe('TE');
    });
  });

  describe('Auth Provider Functions', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should detect auth provider from environment', () => {
      // Mock environment variable
      vi.stubEnv('USE_CLERK_AUTH', 'clerk');
      expect(getAuthProvider()).toBe('clerk');
      expect(shouldUseClerk()).toBe(true);

      vi.stubEnv('USE_CLERK_AUTH', 'supabase');
      expect(getAuthProvider()).toBe('supabase');
      expect(shouldUseClerk()).toBe(false);
    });

    it('should default to clerk if not specified', () => {
      vi.stubEnv('USE_CLERK_AUTH', '');
      expect(getAuthProvider()).toBe('clerk');
      expect(shouldUseClerk()).toBe(true);
    });
  });
});