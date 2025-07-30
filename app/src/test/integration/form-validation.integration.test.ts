/**
 * Integration tests for form validation
 * Tests the complete form validation flow including HTML5 integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateForm, validators, formatPhoneNumber, getFieldProps } from '@lib/form-validation';

describe('Form Validation Integration', () => {
  describe('Contact Form End-to-End Validation', () => {
    const contactFormSchema = {
      name: [validators.required],
      email: [validators.required, validators.email],
      phone: [validators.phone], // Optional
      subject: [validators.required],
      message: [validators.required, validators.minLength(10)]
    };

    it('should handle complete form submission successfully', () => {
      // Simulate FormData from a real form submission
      const formData = new FormData();
      formData.append('name', 'Sarah Johnson');
      formData.append('email', 'sarah.johnson@parent.com');
      formData.append('phone', '(555) 123-4567');
      formData.append('subject', 'tour');
      formData.append('message', 'Hi! I would love to schedule a tour of your Montessori school. My daughter is 4 years old and we are looking for a nurturing educational environment.');

      const errors = validateForm(formData, contactFormSchema);
      expect(Object.keys(errors)).toHaveLength(0);
      expect(errors).toEqual({});
    });

    it('should handle partial form submission with optional fields', () => {
      const formData = new FormData();
      formData.append('name', 'Michael Chen');
      formData.append('email', 'mchen@email.com');
      formData.append('phone', ''); // Empty phone (optional)
      formData.append('subject', 'admissions');
      formData.append('message', 'Can you tell me more about your admissions process and requirements?');

      const errors = validateForm(formData, contactFormSchema);
      expect(errors).toEqual({});
    });

    it('should return comprehensive validation errors', () => {
      const formData = new FormData();
      formData.append('name', '   '); // Whitespace only
      formData.append('email', 'not-an-email');
      formData.append('phone', '555-1234'); // Too few digits
      formData.append('subject', '');
      formData.append('message', 'Hi'); // Too short

      const errors = validateForm(formData, contactFormSchema);
      
      expect(Object.keys(errors)).toHaveLength(5);
      expect(errors.name).toBe('This field is required');
      expect(errors.email).toBe('Please enter a valid email address');
      expect(errors.phone).toBe('Please enter a 10-digit phone number');
      expect(errors.subject).toBe('This field is required');
      expect(errors.message).toBe('Must be at least 10 characters');
    });

    it('should handle form with extra/unexpected fields gracefully', () => {
      const formData = new FormData();
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('phone', '5551234567');
      formData.append('subject', 'general');
      formData.append('message', 'This is a test message that is long enough.');
      // Extra fields that aren't in schema
      formData.append('honeypot', '');
      formData.append('csrf_token', 'abc123');
      formData.append('form-name', 'contact');

      const errors = validateForm(formData, contactFormSchema);
      expect(errors).toEqual({});
    });
  });

  describe('Multi-step Form Validation', () => {
    it('should validate step-by-step form progression', () => {
      // Step 1: Basic info
      const step1Schema = {
        name: [validators.required],
        email: [validators.required, validators.email]
      };

      const step1Data = { name: 'John Doe', email: 'john@example.com' };
      const step1Errors = validateForm(step1Data, step1Schema);
      expect(step1Errors).toEqual({});

      // Step 2: Contact details
      const step2Schema = {
        phone: [validators.phone],
        address: [validators.required, validators.minLength(10)]
      };

      const step2Data = { phone: '5551234567', address: '123 Main St, City, State' };
      const step2Errors = validateForm(step2Data, step2Schema);
      expect(step2Errors).toEqual({});

      // Step 3: Final submission - combine all data
      const finalSchema = { ...step1Schema, ...step2Schema };
      const finalData = { ...step1Data, ...step2Data };
      const finalErrors = validateForm(finalData, finalSchema);
      expect(finalErrors).toEqual({});
    });
  });

  describe('Dynamic Field Validation', () => {
    it('should validate conditionally required fields', () => {
      // Simulate a form where phone is required if contact method is "phone"
      const data = {
        contactMethod: 'phone',
        email: 'test@example.com',
        phone: '' // Should be required when contactMethod is phone
      };

      // Dynamic schema based on contact method
      const schema = {
        contactMethod: [validators.required],
        email: [validators.required, validators.email],
        phone: data.contactMethod === 'phone' 
          ? [validators.required, validators.phone]
          : [validators.phone] // Optional otherwise
      };

      const errors = validateForm(data, schema);
      expect(errors.phone).toBe('This field is required');
    });

    it('should handle optional fields when not required', () => {
      const data = {
        contactMethod: 'email',
        email: 'test@example.com',
        phone: '' // Should be optional when contactMethod is email
      };

      const schema = {
        contactMethod: [validators.required],
        email: [validators.required, validators.email],
        phone: data.contactMethod === 'phone' 
          ? [validators.required, validators.phone]
          : [validators.phone] // Optional
      };

      const errors = validateForm(data, schema);
      expect(errors).toEqual({});
    });
  });

  describe('Real-time Validation Scenarios', () => {
    it('should support field-by-field validation for real-time feedback', () => {
      const schema = {
        email: [validators.required, validators.email],
        password: [validators.required, validators.minLength(8)],
        confirmPassword: []
      };

      // Test progressive typing in email field
      expect(validateForm({ email: '' }, { email: schema.email }))
        .toEqual({ email: 'This field is required' });
      
      expect(validateForm({ email: 'a' }, { email: schema.email }))
        .toEqual({ email: 'Please enter a valid email address' });
      
      expect(validateForm({ email: 'a@' }, { email: schema.email }))
        .toEqual({ email: 'Please enter a valid email address' });
      
      expect(validateForm({ email: 'a@b.com' }, { email: schema.email }))
        .toEqual({});

      // Test progressive typing in password field
      expect(validateForm({ password: 'short' }, { password: schema.password }))
        .toEqual({ password: 'Must be at least 8 characters' });
      
      expect(validateForm({ password: 'longenough' }, { password: schema.password }))
        .toEqual({});
    });
  });

  describe('Phone Number Formatting Integration', () => {
    it('should format phone numbers during user input', () => {
      // Simulate user typing a phone number
      const typingSequence = [
        '5', '55', '555', '5551', '55512', '555123', '5551234', 
        '55512345', '555123456', '5551234567'
      ];

      const formattedSequence = typingSequence.map(input => formatPhoneNumber(input));
      
      // Only the complete 10-digit number should be formatted
      expect(formattedSequence.slice(0, -1)).toEqual(typingSequence.slice(0, -1));
      expect(formattedSequence[formattedSequence.length - 1]).toBe('(555) 123-4567');
    });

    it('should maintain formatting during form validation', () => {
      const formData = new FormData();
      formData.append('phone', '(555) 123-4567'); // Pre-formatted

      const schema = { phone: [validators.phone] };
      const errors = validateForm(formData, schema);
      
      expect(errors).toEqual({});
    });

    it('should handle copy-paste of various phone formats', () => {
      const phoneFormats = [
        '5551234567',
        '555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '+1 555 123 4567',
        '1-555-123-4567'
      ];

      phoneFormats.forEach(phone => {
        const formData = new FormData();
        formData.append('phone', phone);
        
        const schema = { phone: [validators.phone] };
        const errors = validateForm(formData, schema);
        
        expect(errors).toEqual({});
        expect(formatPhoneNumber(phone)).toBe('(555) 123-4567');
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide proper ARIA attributes for form fields', () => {
      const errors = {
        name: 'This field is required',
        email: 'Please enter a valid email address'
      };

      // Test field with error
      const nameProps = getFieldProps('name', errors);
      expect(nameProps['aria-invalid']).toBe('true');
      expect(nameProps['aria-describedby']).toBe('name-error');

      // Test field with error
      const emailProps = getFieldProps('email', errors);
      expect(emailProps['aria-invalid']).toBe('true');
      expect(emailProps['aria-describedby']).toBe('email-error');

      // Test field without error
      const phoneProps = getFieldProps('phone', errors);
      expect(phoneProps['aria-invalid']).toBeUndefined();
      expect(phoneProps['aria-describedby']).toBeUndefined();
    });

    it('should support screen reader announcements for validation changes', () => {
      const initialErrors = {};
      const updatedErrors = { email: 'Please enter a valid email address' };

      // Initially no errors
      const initialProps = getFieldProps('email', initialErrors);
      expect(initialProps['aria-invalid']).toBeUndefined();

      // After validation error appears
      const updatedProps = getFieldProps('email', updatedErrors);
      expect(updatedProps['aria-invalid']).toBe('true');
      expect(updatedProps['aria-describedby']).toBe('email-error');
    });
  });

  describe('Cross-Browser Validation Compatibility', () => {
    it('should handle FormData consistently across environments', () => {
      // Test FormData behavior that might vary across browsers
      const formData = new FormData();
      
      // Test multiple values for same field (checkbox behavior)
      formData.append('interests', 'art');
      formData.append('interests', 'music');
      
      // Our validation should handle the first value
      const schema = { interests: [validators.required] };
      const errors = validateForm(formData, schema);
      expect(errors).toEqual({});
    });

    it('should handle null and undefined values consistently', () => {
      const testCases = [
        { value: null, expected: 'This field is required' },
        { value: undefined, expected: 'This field is required' },
        { value: '', expected: 'This field is required' },
        { value: '   ', expected: 'This field is required' }
      ];

      testCases.forEach(({ value, expected }) => {
        const data = { field: value };
        const schema = { field: [validators.required] };
        const errors = validateForm(data, schema);
        expect(errors.field).toBe(expected);
      });
    });
  });

  describe('Performance Validation', () => {
    it('should validate large forms efficiently', () => {
      // Create a form with many fields
      const data: Record<string, string> = {};
      const schema: Record<string, any[]> = {};

      for (let i = 0; i < 100; i++) {
        data[`field${i}`] = i % 2 === 0 ? 'valid@example.com' : 'invalid-email';
        schema[`field${i}`] = [validators.required, validators.email];
      }

      const startTime = performance.now();
      const errors = validateForm(data, schema);
      const endTime = performance.now();

      // Should complete validation quickly (under 100ms for 100 fields)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should have errors for odd-numbered fields (invalid emails)
      expect(Object.keys(errors)).toHaveLength(50);
    });

    it('should handle complex validation rules efficiently', () => {
      const data = {
        email: 'test@example.com',
        password: 'mySecurePassword123',
        confirmPassword: 'mySecurePassword123'
      };

      const schema = {
        email: [validators.required, validators.email],
        password: [
          validators.required, 
          validators.minLength(8),
          validators.pattern(/(?=.*[a-z])/, 'Must contain lowercase letter'),
          validators.pattern(/(?=.*[A-Z])/, 'Must contain uppercase letter'),
          validators.pattern(/(?=.*\d)/, 'Must contain number')
        ],
        confirmPassword: [
          validators.required,
          validators.matches('password', () => data.password)
        ]
      };

      const startTime = performance.now();
      const errors = validateForm(data, schema);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(errors).toEqual({});
    });
  });
});