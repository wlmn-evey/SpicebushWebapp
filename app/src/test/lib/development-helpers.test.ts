import { describe, it, expect } from 'vitest';
import { isTestEmail, isValidTestDomain } from '@lib/development-helpers';

describe('Development Helpers', () => {
  describe('isTestEmail', () => {
    it('should return true for test domain emails', () => {
      expect(isTestEmail('test@example.com')).toBe(true);
      expect(isTestEmail('user@test.com')).toBe(true);
      expect(isTestEmail('admin@localhost')).toBe(true);
    });

    it('should return false for production emails', () => {
      expect(isTestEmail('user@gmail.com')).toBe(false);
      expect(isTestEmail('admin@spicebushmontessori.org')).toBe(false);
    });

    it('should handle invalid email formats', () => {
      expect(isTestEmail('invalid-email')).toBe(false);
      expect(isTestEmail('')).toBe(false);
      expect(isTestEmail(null as any)).toBe(false);
    });
  });

  describe('isValidTestDomain', () => {
    it('should return true for valid test domains', () => {
      expect(isValidTestDomain('example.com')).toBe(true);
      expect(isValidTestDomain('test.com')).toBe(true);
      expect(isValidTestDomain('localhost')).toBe(true);
    });

    it('should return false for production domains', () => {
      expect(isValidTestDomain('gmail.com')).toBe(false);
      expect(isValidTestDomain('spicebushmontessori.org')).toBe(false);
    });

    it('should handle invalid domain formats', () => {
      expect(isValidTestDomain('')).toBe(false);
      expect(isValidTestDomain(null as any)).toBe(false);
    });
  });
});