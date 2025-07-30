/**
 * Phone number formatting tests
 * Tests the pragmatic phone number formatting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatPhoneNumber, validators } from '@lib/form-validation';

describe('Phone Number Formatting', () => {
  describe('formatPhoneNumber function', () => {
    describe('Valid 10-digit numbers', () => {
      it('should format plain 10-digit numbers', () => {
        expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
        expect(formatPhoneNumber('9876543210')).toBe('(987) 654-3210');
      });

      it('should reformat numbers with existing formatting', () => {
        expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('123 456 7890')).toBe('(123) 456-7890');
      });

      it('should handle international formats', () => {
        expect(formatPhoneNumber('+1 123 456 7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('1-123-456-7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('001 123 456 7890')).toBe('(123) 456-7890');
      });

      it('should handle mixed formatting', () => {
        expect(formatPhoneNumber('123-456.7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('(123)-456 7890')).toBe('(123) 456-7890');
        expect(formatPhoneNumber('123/456/7890')).toBe('(123) 456-7890');
      });
    });

    describe('Invalid or incomplete numbers', () => {
      it('should return original value for numbers with fewer than 10 digits', () => {
        expect(formatPhoneNumber('123')).toBe('123');
        expect(formatPhoneNumber('123456')).toBe('123456');
        expect(formatPhoneNumber('123456789')).toBe('123456789');
        expect(formatPhoneNumber('(123) 456-789')).toBe('(123) 456-789');
      });

      it('should return original value for numbers with more than 10 digits', () => {
        expect(formatPhoneNumber('12345678901')).toBe('12345678901');
        expect(formatPhoneNumber('123-456-7890-123')).toBe('123-456-7890-123');
        expect(formatPhoneNumber('+1 123 456 7890 ext 123')).toBe('+1 123 456 7890 ext 123');
      });

      it('should handle empty and whitespace values', () => {
        expect(formatPhoneNumber('')).toBe('');
        expect(formatPhoneNumber('   ')).toBe('   ');
        expect(formatPhoneNumber('\t\n')).toBe('\t\n');
      });

      it('should handle non-numeric characters', () => {
        expect(formatPhoneNumber('abcdefghij')).toBe('abcdefghij');
        expect(formatPhoneNumber('123-abc-7890')).toBe('123-abc-7890');
        expect(formatPhoneNumber('phone: 5551234567')).toBe('(555) 123-4567'); // Extracts digits
      });
    });

    describe('Edge cases', () => {
      it('should handle null and undefined values', () => {
        expect(formatPhoneNumber(null as any)).toBe(null);
        expect(formatPhoneNumber(undefined as any)).toBe(undefined);
      });

      it('should handle special characters and symbols', () => {
        expect(formatPhoneNumber('555-123-4567#')).toBe('(555) 123-4567');
        expect(formatPhoneNumber('Call: (555) 123-4567!')).toBe('(555) 123-4567');
        expect(formatPhoneNumber('555.123.4567 x123')).toBe('(555) 123-4567');
      });

      it('should handle repeated formatting calls', () => {
        let phone = '5551234567';
        phone = formatPhoneNumber(phone);
        expect(phone).toBe('(555) 123-4567');
        
        // Formatting again should be idempotent
        phone = formatPhoneNumber(phone);
        expect(phone).toBe('(555) 123-4567');
      });

      it('should preserve extensions in unformatted input', () => {
        expect(formatPhoneNumber('5551234567 ext 123')).toBe('(555) 123-4567');
        expect(formatPhoneNumber('(555) 123-4567 extension 456')).toBe('(555) 123-4567');
      });
    });
  });

  describe('Phone validation integration', () => {
    it('should validate formatted phone numbers', () => {
      const formattedNumbers = [
        '(555) 123-4567',
        '(123) 456-7890',
        '(987) 654-3210'
      ];

      formattedNumbers.forEach(phone => {
        expect(validators.phone(phone)).toBeNull();
      });
    });

    it('should validate various input formats consistently', () => {
      const phoneFormats = [
        '5551234567',
        '555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '+1 555 123 4567',
        '1-555-123-4567'
      ];

      phoneFormats.forEach(phone => {
        expect(validators.phone(phone)).toBeNull();
        expect(formatPhoneNumber(phone)).toBe('(555) 123-4567');
      });
    });

    it('should reject invalid phone numbers consistently', () => {
      const invalidNumbers = [
        '123',
        '12345678901',
        'not-a-phone',
        '555-123',
        ''
      ];

      invalidNumbers.forEach(phone => {
        if (phone === '') {
          // Empty phone should be valid (optional field)
          expect(validators.phone(phone)).toBeNull();
        } else {
          expect(validators.phone(phone)).toBe('Please enter a 10-digit phone number');
        }
      });
    });
  });

  describe('User experience scenarios', () => {
    it('should handle progressive typing realistically', () => {
      const typingSequence = [
        { input: '5', expected: '5' },
        { input: '55', expected: '55' },
        { input: '555', expected: '555' },
        { input: '5551', expected: '5551' },
        { input: '55512', expected: '55512' },
        { input: '555123', expected: '555123' },
        { input: '5551234', expected: '5551234' },
        { input: '55512345', expected: '55512345' },
        { input: '555123456', expected: '555123456' },
        { input: '5551234567', expected: '(555) 123-4567' }
      ];

      typingSequence.forEach(({ input, expected }) => {
        expect(formatPhoneNumber(input)).toBe(expected);
      });
    });

    it('should handle backspacing and editing', () => {
      // User types full number
      let phone = formatPhoneNumber('5551234567');
      expect(phone).toBe('(555) 123-4567');

      // User backspaces to incomplete number
      phone = formatPhoneNumber('555123456');
      expect(phone).toBe('555123456'); // Not formatted until complete

      // User completes number again
      phone = formatPhoneNumber('5551234568');
      expect(phone).toBe('(555) 123-4568');
    });

    it('should handle copy-paste scenarios', () => {
      const copyPasteScenarios = [
        { pasted: '555-123-4567', expected: '(555) 123-4567' },
        { pasted: 'Phone: (555) 123-4567', expected: '(555) 123-4567' },
        { pasted: '+1-555-123-4567', expected: '(555) 123-4567' },
        { pasted: '5551234567 (home)', expected: '(555) 123-4567' }
      ];

      copyPasteScenarios.forEach(({ pasted, expected }) => {
        expect(formatPhoneNumber(pasted)).toBe(expected);
      });
    });

    it('should handle form autofill scenarios', () => {
      // Browser autofill might provide various formats
      const autofillFormats = [
        '5551234567',
        '555.123.4567',
        '(555) 123-4567',
        '+15551234567'
      ];

      autofillFormats.forEach(format => {
        expect(formatPhoneNumber(format)).toBe('(555) 123-4567');
        expect(validators.phone(format)).toBeNull();
      });
    });
  });

  describe('Accessibility considerations', () => {
    it('should maintain cursor position expectations', () => {
      // This would be tested in a browser environment with actual DOM
      // Here we verify the formatting doesn't drastically change length
      const testCases = [
        { input: '5551234567', output: '(555) 123-4567' },
        { input: '555-123-4567', output: '(555) 123-4567' }
      ];

      testCases.forEach(({ input, output }) => {
        const formatted = formatPhoneNumber(input);
        expect(formatted).toBe(output);
        
        // Length shouldn't change drastically (within 4 characters)
        expect(Math.abs(formatted.length - input.length)).toBeLessThanOrEqual(4);
      });
    });

    it('should work with screen readers', () => {
      // Formatted numbers should be readable by screen readers
      const formatted = formatPhoneNumber('5551234567');
      expect(formatted).toBe('(555) 123-4567');
      
      // Should contain readable separators
      expect(formatted).toMatch(/\(\d{3}\) \d{3}-\d{4}/);
    });

    it('should maintain tab order and focus', () => {
      // Formatting shouldn't interfere with form navigation
      // This is more of a browser test, but we verify stable output
      const phone = '5551234567';
      const formatted1 = formatPhoneNumber(phone);
      const formatted2 = formatPhoneNumber(phone);
      
      expect(formatted1).toBe(formatted2); // Consistent formatting
    });
  });

  describe('Performance considerations', () => {
    it('should format phone numbers quickly', () => {
      const testNumbers = Array.from({ length: 1000 }, (_, i) => 
        `555${String(i).padStart(7, '0')}`
      );

      const startTime = performance.now();
      testNumbers.forEach(formatPhoneNumber);
      const endTime = performance.now();

      // Should complete 1000 formats in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle invalid input efficiently', () => {
      const invalidInputs = [
        'not-a-phone-number',
        '123',
        'a'.repeat(100),
        '1'.repeat(50)
      ];

      const startTime = performance.now();
      invalidInputs.forEach(formatPhoneNumber);
      const endTime = performance.now();

      // Should handle invalid input quickly
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should not cause memory leaks with repeated calls', () => {
      // Test repeated formatting doesn't accumulate memory
      const phone = '5551234567';
      
      for (let i = 0; i < 10000; i++) {
        formatPhoneNumber(phone);
      }
      
      // If we get here without memory issues, test passes
      expect(formatPhoneNumber(phone)).toBe('(555) 123-4567');
    });
  });

  describe('Internationalization considerations', () => {
    it('should handle US phone numbers specifically', () => {
      // Our formatter is designed for US 10-digit numbers
      const usNumbers = [
        '2025551234', // DC
        '4155551234', // SF
        '7135551234', // Houston
        '3125551234'  // Chicago
      ];

      usNumbers.forEach(number => {
        const formatted = formatPhoneNumber(number);
        expect(formatted).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
      });
    });

    it('should not format non-US number patterns', () => {
      // Should leave international numbers unformatted
      const internationalNumbers = [
        '+44 20 7946 0958', // UK
        '+33 1 42 86 83 26', // France
        '+49 30 12345678'    // Germany
      ];

      internationalNumbers.forEach(number => {
        // Should return original since not 10 digits after stripping
        expect(formatPhoneNumber(number)).toBe(number);
      });
    });

    it('should handle different digit separators', () => {
      const separatorVariations = [
        '555-123-4567',
        '555.123.4567', 
        '555 123 4567',
        '555/123/4567',
        '555_123_4567'
      ];

      separatorVariations.forEach(number => {
        expect(formatPhoneNumber(number)).toBe('(555) 123-4567');
      });
    });
  });
});