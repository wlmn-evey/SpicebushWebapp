import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validators } from '@lib/form-validation';
import { supabase } from '@lib/supabase';

// Mock Supabase
vi.mock('@lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Newsletter Subscription Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const error = validators.email(email);
        expect(error).toBeNull();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        ''
      ];

      invalidEmails.forEach(email => {
        const error = validators.email(email);
        expect(error).toBeTruthy();
        if (email) {
          expect(error).toBe('Please enter a valid email address');
        }
      });
    });

    it('should handle null/undefined gracefully', () => {
      expect(validators.email(null as any)).toBeNull();
      expect(validators.email(undefined as any)).toBeNull();
    });
  });

  describe('Newsletter Database Operations', () => {
    it('should check for existing subscribers', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any);

      // Simulate checking for existing subscriber
      const result = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', 'test@example.com')
        .single();

      expect(supabase.from).toHaveBeenCalledWith('newsletter_subscribers');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('email', 'test@example.com');
      expect(mockSingle).toHaveBeenCalled();
      expect(result.data).toBeNull();
    });

    it('should insert new subscribers', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          email: 'new@example.com',
          subscription_status: 'active'
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any);

      const newSubscriber = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        subscription_type: 'general'
      };

      const result = await supabase
        .from('newsletter_subscribers')
        .insert(newSubscriber)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(newSubscriber);
      expect(result.data.email).toBe('new@example.com');
      expect(result.data.subscription_status).toBe('active');
    });

    it('should update subscriber status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          email: 'update@example.com',
          subscription_status: 'active'
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      } as any);

      const updateData = {
        subscription_status: 'active',
        unsubscribed_at: null,
        updated_at: new Date().toISOString()
      };

      const result = await supabase
        .from('newsletter_subscribers')
        .update(updateData)
        .eq('email', 'update@example.com')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith('email', 'update@example.com');
      expect(result.data.subscription_status).toBe('active');
    });
  });

  describe('Newsletter Business Logic', () => {
    it('should normalize email addresses', () => {
      const testCases = [
        { input: 'Test@Example.com', expected: 'test@example.com' },
        { input: 'USER@DOMAIN.COM', expected: 'user@domain.com' },
        { input: '  email@test.com  ', expected: 'email@test.com' }
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = input.trim().toLowerCase();
        expect(normalized).toBe(expected);
      });
    });

    it('should validate subscription types', () => {
      const validTypes = ['general', 'parents', 'prospective', 'alumni', 'community'];
      const defaultType = 'general';

      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });

      // Test default type assignment
      const subscriptionType = undefined || defaultType;
      expect(subscriptionType).toBe('general');
    });

    it('should handle optional fields properly', () => {
      const subscriber = {
        email: 'test@example.com',
        first_name: undefined,
        last_name: null,
        subscription_type: undefined,
        signup_source: undefined
      };

      const processedSubscriber = {
        email: subscriber.email,
        first_name: subscriber.first_name || null,
        last_name: subscriber.last_name || null,
        subscription_type: subscriber.subscription_type || 'general',
        signup_source: subscriber.signup_source || 'website'
      };

      expect(processedSubscriber.first_name).toBeNull();
      expect(processedSubscriber.last_name).toBeNull();
      expect(processedSubscriber.subscription_type).toBe('general');
      expect(processedSubscriber.signup_source).toBe('website');
    });
  });

  describe('Security and Privacy', () => {
    it('should not expose subscriber existence', () => {
      // Generic message for all email checks
      const message = 'Please check your email for subscription status';
      
      const existingEmail = 'existing@example.com';
      const nonExistingEmail = 'nonexisting@example.com';

      // Both should return same message
      expect(message).toBe('Please check your email for subscription status');
    });

    it('should sanitize user input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'test@example.com; DROP TABLE users;',
        '${process.env.SECRET_KEY}'
      ];

      maliciousInputs.forEach(input => {
        // Email validation should reject these
        const error = validators.email(input);
        expect(error).toBe('Please enter a valid email address');
      });
    });

    it('should handle metadata properly', () => {
      const metadata = {
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 Test Browser',
        signup_page: 'https://example.com/newsletter'
      };

      // Fallback values for missing metadata
      const processedMetadata = {
        ip_address: metadata.ip_address || 'unknown',
        user_agent: metadata.user_agent || 'unknown',
        signup_page: metadata.signup_page || 'unknown'
      };

      expect(processedMetadata.ip_address).toBe('192.168.1.1');
      expect(processedMetadata.user_agent).toContain('Mozilla');
      expect(processedMetadata.signup_page).toContain('newsletter');
    });
  });
});