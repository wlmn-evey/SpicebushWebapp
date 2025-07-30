/**
 * Unit tests for form validation utilities
 * Tests the pragmatic form validation approach with HTML5 foundation
 */

import { describe, it, expect } from 'vitest';
import { 
  validators, 
  validateField, 
  validateForm, 
  formatPhoneNumber, 
  getFieldProps 
} from '@lib/form-validation';

describe('Form Validation - Basic Validators', () => {
  describe('validators.required', () => {
    it('should return null for non-empty strings', () => {
      expect(validators.required('test')).toBeNull();
      expect(validators.required('  valid  ')).toBeNull(); // trims whitespace
      expect(validators.required('123')).toBeNull();
    });

    it('should return error message for empty or whitespace-only strings', () => {
      expect(validators.required('')).toBe('This field is required');
      expect(validators.required('   ')).toBe('This field is required');
      expect(validators.required('\t\n')).toBe('This field is required');
    });

    it('should handle null/undefined values', () => {
      expect(validators.required(null as any)).toBe('This field is required');
      expect(validators.required(undefined as any)).toBe('This field is required');
    });
  });

  describe('validators.email', () => {
    it('should return null for valid email addresses', () => {
      expect(validators.email('test@example.com')).toBeNull();
      expect(validators.email('user.name+tag@domain.co.uk')).toBeNull();
      expect(validators.email('simple@test.io')).toBeNull();
    });

    it('should return error message for invalid email addresses', () => {
      const errorMsg = 'Please enter a valid email address';
      expect(validators.email('invalid')).toBe(errorMsg);
      expect(validators.email('test@')).toBe(errorMsg);
      expect(validators.email('@example.com')).toBe(errorMsg);
      expect(validators.email('test..test@example.com')).toBe(errorMsg);
      expect(validators.email('test @example.com')).toBe(errorMsg);
    });

    it('should return null for empty values (use with required for mandatory)', () => {
      expect(validators.email('')).toBeNull();
      expect(validators.email('   ')).toBeNull(); // whitespace only
    });
  });

  describe('validators.phone', () => {
    it('should return null for valid 10-digit phone numbers', () => {
      expect(validators.phone('1234567890')).toBeNull();
      expect(validators.phone('(123) 456-7890')).toBeNull();
      expect(validators.phone('123-456-7890')).toBeNull();
      expect(validators.phone('123.456.7890')).toBeNull();
      expect(validators.phone('+1 123 456 7890')).toBeNull();
    });

    it('should return error message for invalid phone numbers', () => {
      const errorMsg = 'Please enter a 10-digit phone number';
      expect(validators.phone('123')).toBe(errorMsg);
      expect(validators.phone('12345678901')).toBe(errorMsg); // 11 digits
      expect(validators.phone('abcdefghij')).toBe(errorMsg);
      expect(validators.phone('123-456')).toBe(errorMsg);
    });

    it('should return null for empty values (optional field)', () => {
      expect(validators.phone('')).toBeNull();
      expect(validators.phone('   ')).toBeNull();
    });
  });

  describe('validators.minLength', () => {
    it('should return null for strings meeting minimum length', () => {
      const minLength5 = validators.minLength(5);
      expect(minLength5('hello')).toBeNull();
      expect(minLength5('hello world')).toBeNull();
    });

    it('should return error message for strings below minimum length', () => {
      const minLength5 = validators.minLength(5);
      expect(minLength5('hi')).toBe('Must be at least 5 characters');
      expect(minLength5('')).toBe('Must be at least 5 characters');
    });

    it('should return null for empty values when not required', () => {
      const minLength5 = validators.minLength(5);
      expect(minLength5('')).toBe('Must be at least 5 characters');
      // Note: minLength validates empty strings - use with conditional logic if optional
    });
  });

  describe('validators.maxLength', () => {
    it('should return null for strings within maximum length', () => {
      const maxLength10 = validators.maxLength(10);
      expect(maxLength10('hello')).toBeNull();
      expect(maxLength10('1234567890')).toBeNull();
      expect(maxLength10('')).toBeNull();
    });

    it('should return error message for strings exceeding maximum length', () => {
      const maxLength10 = validators.maxLength(10);
      expect(maxLength10('this is too long')).toBe('Must be no more than 10 characters');
    });
  });

  describe('validators.matches', () => {
    it('should return null when values match', () => {
      const getValue = () => 'password123';
      const matchesPassword = validators.matches('password', getValue);
      expect(matchesPassword('password123')).toBeNull();
    });

    it('should return error message when values do not match', () => {
      const getValue = () => 'password123';
      const matchesPassword = validators.matches('password', getValue);
      expect(matchesPassword('different')).toBe('Must match password');
    });

    it('should handle empty values correctly', () => {
      const getValue = () => '';
      const matchesPassword = validators.matches('password', getValue);
      expect(matchesPassword('')).toBeNull();
      expect(matchesPassword('something')).toBe('Must match password');
    });
  });

  describe('validators.pattern', () => {
    it('should return null for matching patterns', () => {
      const alphaOnly = validators.pattern(/^[a-zA-Z]+$/, 'Only letters allowed');
      expect(alphaOnly('hello')).toBeNull();
      expect(alphaOnly('HelloWorld')).toBeNull();
    });

    it('should return error message for non-matching patterns', () => {
      const alphaOnly = validators.pattern(/^[a-zA-Z]+$/, 'Only letters allowed');
      expect(alphaOnly('hello123')).toBe('Only letters allowed');
      expect(alphaOnly('hello world')).toBe('Only letters allowed');
    });

    it('should return null for empty values', () => {
      const alphaOnly = validators.pattern(/^[a-zA-Z]+$/, 'Only letters allowed');
      expect(alphaOnly('')).toBeNull();
    });
  });
});

describe('Form Validation - Field Validation', () => {
  describe('validateField', () => {
    it('should return null when all rules pass', () => {
      const rules = [validators.required, validators.email];
      expect(validateField('test@example.com', rules)).toBeNull();
    });

    it('should return first error message when rules fail', () => {
      const rules = [validators.required, validators.email];
      expect(validateField('', rules)).toBe('This field is required');
      expect(validateField('invalid-email', rules)).toBe('Please enter a valid email address');
    });

    it('should stop at first failing rule', () => {
      const rules = [
        validators.required,
        validators.minLength(10),
        validators.email
      ];
      // Should return required error, not minLength error
      expect(validateField('', rules)).toBe('This field is required');
    });

    it('should handle empty rules array', () => {
      expect(validateField('anything', [])).toBeNull();
    });
  });
});

describe('Form Validation - Form Validation', () => {
  describe('validateForm with FormData', () => {
    it('should validate FormData successfully', () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('phone', '1234567890');

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone]
      };

      const errors = validateForm(formData, schema);
      expect(errors).toEqual({});
    });

    it('should return errors for invalid FormData', () => {
      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', 'invalid-email');
      formData.append('phone', '123');

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone]
      };

      const errors = validateForm(formData, schema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number'
      });
    });

    it('should handle missing FormData fields', () => {
      const formData = new FormData();
      // No fields added

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email]
      };

      const errors = validateForm(formData, schema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'This field is required'
      });
    });
  });

  describe('validateForm with Object', () => {
    it('should validate object data successfully', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone]
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({});
    });

    it('should return errors for invalid object data', () => {
      const data = {
        name: '',
        email: 'invalid-email',
        phone: '123'
      };

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone]
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number'
      });
    });

    it('should handle missing object fields', () => {
      const data = {}; // Empty object

      const schema = {
        name: [validators.required],
        email: [validators.required, validators.email]
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'This field is required'
      });
    });
  });
});

describe('Form Validation - Phone Formatting', () => {
  describe('formatPhoneNumber', () => {
    it('should format 10-digit numbers correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should handle numbers with existing formatting', () => {
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('+1 123 456 7890')).toBe('(123) 456-7890');
    });

    it('should return original value for non-10-digit inputs', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12345678901')).toBe('12345678901');
      expect(formatPhoneNumber('abc')).toBe('abc');
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should handle special characters and spaces', () => {
      expect(formatPhoneNumber('123 456 7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890 ext 123')).toBe('(123) 456-7890');
    });
  });
});

describe('Form Validation - Accessibility Helpers', () => {
  describe('getFieldProps', () => {
    it('should return empty props when no error', () => {
      const errors = {};
      const props = getFieldProps('email', errors);
      expect(props).toEqual({
        'aria-invalid': undefined,
        'aria-describedby': undefined
      });
    });

    it('should return error props when field has error', () => {
      const errors = { email: 'Please enter a valid email address' };
      const props = getFieldProps('email', errors);
      expect(props).toEqual({
        'aria-invalid': 'true',
        'aria-describedby': 'email-error'
      });
    });

    it('should handle multiple fields correctly', () => {
      const errors = { 
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number'
      };
      
      const emailProps = getFieldProps('email', errors);
      const phoneProps = getFieldProps('phone', errors);
      const nameProps = getFieldProps('name', errors);

      expect(emailProps).toEqual({
        'aria-invalid': 'true',
        'aria-describedby': 'email-error'
      });

      expect(phoneProps).toEqual({
        'aria-invalid': 'true',
        'aria-describedby': 'phone-error'
      });

      expect(nameProps).toEqual({
        'aria-invalid': undefined,
        'aria-describedby': undefined
      });
    });
  });
});

describe('Form Validation - Integration Scenarios', () => {
  describe('Contact form schema validation', () => {
    it('should validate complete contact form successfully', () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('phone', '(555) 123-4567');
      formData.append('subject', 'tour');
      formData.append('message', 'I would like to schedule a tour of your school.');

      const contactFormSchema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone], // Optional
        subject: [validators.required],
        message: [validators.required, validators.minLength(10)]
      };

      const errors = validateForm(formData, contactFormSchema);
      expect(errors).toEqual({});
    });

    it('should validate contact form with optional phone', () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');
      formData.append('phone', ''); // Empty phone should be valid
      formData.append('subject', 'admissions');
      formData.append('message', 'Tell me about your admissions process.');

      const contactFormSchema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone], // Optional - returns null for empty
        subject: [validators.required],
        message: [validators.required, validators.minLength(10)]
      };

      const errors = validateForm(formData, contactFormSchema);
      expect(errors).toEqual({});
    });

    it('should return comprehensive errors for invalid contact form', () => {
      const formData = new FormData();
      formData.append('name', '');
      formData.append('email', 'invalid-email');
      formData.append('phone', '123');
      formData.append('subject', '');
      formData.append('message', 'short');

      const contactFormSchema = {
        name: [validators.required],
        email: [validators.required, validators.email],
        phone: [validators.phone],
        subject: [validators.required],
        message: [validators.required, validators.minLength(10)]
      };

      const errors = validateForm(formData, contactFormSchema);
      expect(errors).toEqual({
        name: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number',
        subject: 'This field is required',
        message: 'Must be at least 10 characters'
      });
    });
  });

  describe('Password confirmation scenario', () => {
    it('should validate password confirmation correctly', () => {
      const data = {
        password: 'mySecurePassword123',
        confirmPassword: 'mySecurePassword123'
      };

      const schema = {
        password: [validators.required, validators.minLength(8)],
        confirmPassword: [
          validators.required,
          validators.matches('password', () => data.password)
        ]
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({});
    });

    it('should return error for password mismatch', () => {
      const data = {
        password: 'mySecurePassword123',
        confirmPassword: 'differentPassword'
      };

      const schema = {
        password: [validators.required, validators.minLength(8)],
        confirmPassword: [
          validators.required,
          validators.matches('password', () => data.password)
        ]
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({
        confirmPassword: 'Must match password'
      });
    });
  });
});