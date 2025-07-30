/**
 * Unit tests for form validation utilities
 * Tests all validators and helper functions
 */

import { describe, it, expect } from 'vitest';
import { validators, validateField, validateForm, formatPhoneNumber, getFieldProps } from '../../lib/form-validation';

describe('Form Validation Utilities', () => {
  describe('validators.required', () => {
    it('should return error for empty string', () => {
      expect(validators.required('')).toBe('This field is required');
    });

    it('should return error for whitespace only', () => {
      expect(validators.required('   ')).toBe('This field is required');
    });

    it('should return null for valid value', () => {
      expect(validators.required('test')).toBeNull();
    });

    it('should handle null/undefined gracefully', () => {
      expect(validators.required(null as any)).toBe('This field is required');
      expect(validators.required(undefined as any)).toBe('This field is required');
    });
  });

  describe('validators.email', () => {
    it('should return null for empty value (optional)', () => {
      expect(validators.email('')).toBeNull();
    });

    it('should return error for invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid..email@test.com',
        'invalid email@test.com',
        'invalid@test',
      ];

      invalidEmails.forEach(email => {
        expect(validators.email(email)).toBe('Please enter a valid email address');
      });
    });

    it('should return null for valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validators.email(email)).toBeNull();
      });
    });
  });

  describe('validators.phone', () => {
    it('should return null for empty value (optional)', () => {
      expect(validators.phone('')).toBeNull();
    });

    it('should return error for invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '12345678901',
        'abc1234567',
        '123-456-789',
      ];

      invalidPhones.forEach(phone => {
        expect(validators.phone(phone)).toBe('Please enter a 10-digit phone number');
      });
    });

    it('should accept various 10-digit formats', () => {
      const validPhones = [
        '1234567890',
        '(123) 456-7890',
        '123-456-7890',
        '123.456.7890',
        '123 456 7890',
      ];

      validPhones.forEach(phone => {
        expect(validators.phone(phone)).toBeNull();
      });
    });
  });

  describe('validators.minLength', () => {
    const minLength5 = validators.minLength(5);

    it('should return null for empty value (optional)', () => {
      expect(minLength5('')).toBeNull();
    });

    it('should return error for too short values', () => {
      expect(minLength5('test')).toBe('Must be at least 5 characters');
      expect(minLength5('a')).toBe('Must be at least 5 characters');
    });

    it('should return null for valid lengths', () => {
      expect(minLength5('tests')).toBeNull();
      expect(minLength5('longer text')).toBeNull();
    });
  });

  describe('validators.maxLength', () => {
    const maxLength10 = validators.maxLength(10);

    it('should return null for empty value', () => {
      expect(maxLength10('')).toBeNull();
    });

    it('should return error for too long values', () => {
      expect(maxLength10('this is too long')).toBe('Must be no more than 10 characters');
    });

    it('should return null for valid lengths', () => {
      expect(maxLength10('short')).toBeNull();
      expect(maxLength10('exactly 10')).toBeNull();
    });
  });

  describe('validators.matches', () => {
    it('should validate matching fields', () => {
      const matchPassword = validators.matches('password', () => 'secret123');
      
      expect(matchPassword('secret123')).toBeNull();
      expect(matchPassword('different')).toBe('Must match password');
    });

    it('should work with dynamic getValue function', () => {
      let password = 'initial';
      const matchPassword = validators.matches('password', () => password);
      
      expect(matchPassword('initial')).toBeNull();
      
      password = 'changed';
      expect(matchPassword('initial')).toBe('Must match password');
      expect(matchPassword('changed')).toBeNull();
    });
  });

  describe('validators.pattern', () => {
    const alphaOnly = validators.pattern(/^[a-zA-Z]+$/, 'Letters only');

    it('should return null for empty value (optional)', () => {
      expect(alphaOnly('')).toBeNull();
    });

    it('should validate against regex pattern', () => {
      expect(alphaOnly('abc')).toBeNull();
      expect(alphaOnly('ABC')).toBeNull();
      expect(alphaOnly('abc123')).toBe('Letters only');
      expect(alphaOnly('abc def')).toBe('Letters only');
    });
  });

  describe('validators.minValue', () => {
    const minValue10 = validators.minValue(10);

    it('should return null for empty value (optional)', () => {
      expect(minValue10('')).toBeNull();
    });

    it('should validate numeric minimums', () => {
      expect(minValue10('5')).toBe('Must be at least 10');
      expect(minValue10('9.99')).toBe('Must be at least 10');
      expect(minValue10('10')).toBeNull();
      expect(minValue10('10.01')).toBeNull();
      expect(minValue10('100')).toBeNull();
    });

    it('should handle non-numeric values', () => {
      expect(minValue10('abc')).toBe('Must be at least 10');
      expect(minValue10('10abc')).toBe('Must be at least 10');
    });

    it('should handle negative values correctly', () => {
      const minValueNeg5 = validators.minValue(-5);
      expect(minValueNeg5('-10')).toBe('Must be at least -5');
      expect(minValueNeg5('-5')).toBeNull();
      expect(minValueNeg5('-3')).toBeNull();
    });
  });

  describe('validateField', () => {
    it('should run multiple validators in order', () => {
      const rules = [
        validators.required,
        validators.email
      ];

      expect(validateField('', rules)).toBe('This field is required');
      expect(validateField('invalid', rules)).toBe('Please enter a valid email address');
      expect(validateField('test@example.com', rules)).toBeNull();
    });

    it('should stop at first error', () => {
      const rules = [
        validators.required,
        validators.minLength(100) // This won't be reached if required fails
      ];

      expect(validateField('', rules)).toBe('This field is required');
    });
  });

  describe('validateForm', () => {
    const schema = {
      name: [validators.required, validators.minLength(2)],
      email: [validators.required, validators.email],
      phone: [validators.phone],
      message: [validators.required, validators.minLength(10)]
    };

    it('should validate FormData', () => {
      const formData = new FormData();
      formData.set('name', 'John');
      formData.set('email', 'john@example.com');
      formData.set('phone', '1234567890');
      formData.set('message', 'This is a test message');

      const errors = validateForm(formData, schema);
      expect(errors).toEqual({});
    });

    it('should validate plain object', () => {
      const data = {
        name: 'J',
        email: 'invalid-email',
        phone: '123',
        message: 'Short'
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({
        name: 'Must be at least 2 characters',
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number',
        message: 'Must be at least 10 characters'
      });
    });

    it('should handle missing fields', () => {
      const data = {
        name: '',
        email: ''
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'This field is required',
        message: 'This field is required'
      });
    });

    it('should skip validation for fields not in schema', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        message: 'Valid message here',
        extra: 'This field is not validated'
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({});
      expect(errors).not.toHaveProperty('extra');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should strip non-digits before formatting', () => {
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    });

    it('should return original value for non-10-digit inputs', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12345678901')).toBe('12345678901');
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('getFieldProps', () => {
    it('should return aria props for fields with errors', () => {
      const errors = { email: 'Invalid email', name: 'Required' };
      
      const emailProps = getFieldProps('email', errors);
      expect(emailProps).toEqual({
        'aria-invalid': 'true',
        'aria-describedby': 'email-error'
      });

      const nameProps = getFieldProps('name', errors);
      expect(nameProps).toEqual({
        'aria-invalid': 'true',
        'aria-describedby': 'name-error'
      });
    });

    it('should return undefined aria props for fields without errors', () => {
      const errors = { email: 'Invalid email' };
      
      const phoneProps = getFieldProps('phone', errors);
      expect(phoneProps).toEqual({
        'aria-invalid': undefined,
        'aria-describedby': undefined
      });
    });

    it('should handle empty errors object', () => {
      const props = getFieldProps('email', {});
      expect(props).toEqual({
        'aria-invalid': undefined,
        'aria-describedby': undefined
      });
    });
  });
});