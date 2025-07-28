import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAdminConfig, isAdminEmail } from '../../lib/admin-config';

describe('Admin Configuration Module', () => {
  // Reset environment variables before each test
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_DOMAINS;
    delete process.env.NODE_ENV;
  });

  describe('getAdminConfig', () => {
    it('should return default configuration when no environment variables are set', () => {
      const config = getAdminConfig();
      
      expect(config.adminEmails).toEqual([
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
      ]);
      expect(config.adminDomains).toEqual(['@spicebushmontessori.org']);
    });

    it('should parse ADMIN_EMAILS from environment variables', () => {
      process.env.ADMIN_EMAILS = 'test1@example.com,test2@example.com, test3@example.com ';
      
      const config = getAdminConfig();
      
      expect(config.adminEmails).toEqual([
        'test1@example.com',
        'test2@example.com',
        'test3@example.com'
      ]);
    });

    it('should parse ADMIN_DOMAINS from environment variables', () => {
      process.env.ADMIN_DOMAINS = '@example.com, @test.org ,@admin.net';
      
      const config = getAdminConfig();
      
      expect(config.adminDomains).toEqual([
        '@example.com',
        '@test.org',
        '@admin.net'
      ]);
    });

    it('should handle empty environment variable strings', () => {
      process.env.ADMIN_EMAILS = '';
      process.env.ADMIN_DOMAINS = '';
      
      const config = getAdminConfig();
      
      // Should fall back to defaults when env vars are empty
      expect(config.adminEmails).toEqual([
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
      ]);
      expect(config.adminDomains).toEqual(['@spicebushmontessori.org']);
    });
  });

  describe('isAdminEmail', () => {
    describe('null/undefined handling', () => {
      it('should return false for null email', () => {
        expect(isAdminEmail(null)).toBe(false);
      });

      it('should return false for undefined email', () => {
        expect(isAdminEmail(undefined)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isAdminEmail('')).toBe(false);
      });
    });

    describe('specific admin email matching', () => {
      it('should return true for exact admin email matches', () => {
        expect(isAdminEmail('admin@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('director@spicebushmontessori.org')).toBe(true);
      });

      it('should be case insensitive for email matching', () => {
        expect(isAdminEmail('ADMIN@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('Director@SpicebushMontessori.org')).toBe(true);
      });

      it('should trim whitespace from emails', () => {
        expect(isAdminEmail('  admin@spicebushmontessori.org  ')).toBe(true);
        expect(isAdminEmail('\tdirector@spicebushmontessori.org\n')).toBe(true);
      });

      it('should return false for non-admin emails', () => {
        expect(isAdminEmail('user@example.com')).toBe(false);
        expect(isAdminEmail('teacher@spicebushmontessori.com')).toBe(false);
      });
    });

    describe('admin domain matching', () => {
      it('should return true for emails from admin domains', () => {
        expect(isAdminEmail('anyone@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('teacher@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('staff.member@spicebushmontessori.org')).toBe(true);
      });

      it('should be case insensitive for domain matching', () => {
        expect(isAdminEmail('test@SPICEBUSHMONTESSORI.ORG')).toBe(true);
        expect(isAdminEmail('test@SpicebushMontessori.Org')).toBe(true);
      });

      it('should not match partial domain names', () => {
        expect(isAdminEmail('admin@notspicebushmontessori.org')).toBe(false);
        expect(isAdminEmail('admin@spicebushmontessori.org.fake')).toBe(false);
      });

      it('should handle subdomains correctly', () => {
        // Should not match subdomains unless explicitly configured
        expect(isAdminEmail('admin@mail.spicebushmontessori.org')).toBe(false);
      });
    });

    describe('development mode behavior', () => {
      it('should allow test admin account in development mode', () => {
        process.env.NODE_ENV = 'development';
        
        expect(isAdminEmail('admin@spicebushmontessori.test')).toBe(true);
      });

      it('should allow any email starting with admin@ in development mode', () => {
        process.env.NODE_ENV = 'development';
        
        expect(isAdminEmail('admin@example.com')).toBe(true);
        expect(isAdminEmail('admin@test.local')).toBe(true);
        expect(isAdminEmail('admin123@gmail.com')).toBe(false); // Not starting with exactly 'admin@'
      });

      it('should not allow test accounts in production mode', () => {
        process.env.NODE_ENV = 'production';
        
        expect(isAdminEmail('admin@spicebushmontessori.test')).toBe(false);
        expect(isAdminEmail('admin@example.com')).toBe(false);
      });
    });

    describe('custom environment configuration', () => {
      it('should respect custom admin emails from environment', () => {
        process.env.ADMIN_EMAILS = 'custom@example.com,special@test.org';
        
        expect(isAdminEmail('custom@example.com')).toBe(true);
        expect(isAdminEmail('special@test.org')).toBe(true);
        expect(isAdminEmail('admin@spicebushmontessori.org')).toBe(false); // Default should be overridden
      });

      it('should respect custom admin domains from environment', () => {
        process.env.ADMIN_DOMAINS = '@custom.org,@special.com';
        
        expect(isAdminEmail('anyone@custom.org')).toBe(true);
        expect(isAdminEmail('someone@special.com')).toBe(true);
        expect(isAdminEmail('test@spicebushmontessori.org')).toBe(false); // Default should be overridden
      });
    });

    describe('security edge cases', () => {
      it('should not be vulnerable to regex injection', () => {
        const maliciousEmails = [
          'admin@spicebushmontessori.org.attacker.com',
          'admin@spicebushmontessori_org',
          'admin@spicebushmontessori%2Eorg',
          'admin@[spicebushmontessori.org]',
        ];

        maliciousEmails.forEach(email => {
          expect(isAdminEmail(email)).toBe(false);
        });
      });

      it('should handle very long email addresses', () => {
        const longEmail = 'a'.repeat(1000) + '@spicebushmontessori.org';
        expect(isAdminEmail(longEmail)).toBe(true); // Should still work with long local parts
      });

      it('should handle emails with special characters', () => {
        expect(isAdminEmail('admin+test@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('admin.test@spicebushmontessori.org')).toBe(true);
        expect(isAdminEmail('admin_test@spicebushmontessori.org')).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should correctly identify all configured admins', () => {
      // Test default configuration
      const adminEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'teacher@spicebushmontessori.org',
        'staff@spicebushmontessori.org',
      ];

      const nonAdminEmails = [
        'parent@gmail.com',
        'user@example.com',
        'admin@fakespicebushmontessori.org',
      ];

      adminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(true);
      });

      nonAdminEmails.forEach(email => {
        expect(isAdminEmail(email)).toBe(false);
      });
    });

    it('should handle configuration changes correctly', () => {
      // Initial check with defaults
      expect(isAdminEmail('admin@spicebushmontessori.org')).toBe(true);
      expect(isAdminEmail('custom@newdomain.com')).toBe(false);

      // Change configuration
      process.env.ADMIN_EMAILS = 'custom@newdomain.com';
      process.env.ADMIN_DOMAINS = '@newdomain.com';

      // Check new configuration
      expect(isAdminEmail('custom@newdomain.com')).toBe(true);
      expect(isAdminEmail('anyone@newdomain.com')).toBe(true);
      expect(isAdminEmail('admin@spicebushmontessori.org')).toBe(false);
    });
  });
});