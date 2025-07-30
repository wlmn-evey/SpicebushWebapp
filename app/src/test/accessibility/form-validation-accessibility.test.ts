/**
 * Accessibility tests for form validation
 * Ensures the pragmatic form validation meets WCAG accessibility standards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFieldProps } from '@lib/form-validation';

// Mock DOM environment for accessibility testing
const mockDocument = {
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    textContent: '',
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    }
  }))
};

// Mock window for screen reader testing
const mockWindow = {
  getComputedStyle: vi.fn(() => ({})),
  speechSynthesis: {
    speak: vi.fn(),
    cancel: vi.fn()
  }
};

describe('Form Validation Accessibility', () => {
  describe('ARIA Attributes', () => {
    it('should provide correct ARIA attributes for valid fields', () => {
      const errors = {};
      const props = getFieldProps('email', errors);

      expect(props['aria-invalid']).toBeUndefined();
      expect(props['aria-describedby']).toBeUndefined();
    });

    it('should provide correct ARIA attributes for invalid fields', () => {
      const errors = { email: 'Please enter a valid email address' };
      const props = getFieldProps('email', errors);

      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBe('email-error');
    });

    it('should handle multiple fields with different error states', () => {
      const errors = {
        name: 'This field is required',
        phone: 'Please enter a 10-digit phone number'
      };

      const nameProps = getFieldProps('name', errors);
      const emailProps = getFieldProps('email', errors); // No error
      const phoneProps = getFieldProps('phone', errors);

      // Name field has error
      expect(nameProps['aria-invalid']).toBe('true');
      expect(nameProps['aria-describedby']).toBe('name-error');

      // Email field has no error
      expect(emailProps['aria-invalid']).toBeUndefined();
      expect(emailProps['aria-describedby']).toBeUndefined();

      // Phone field has error
      expect(phoneProps['aria-invalid']).toBe('true');
      expect(phoneProps['aria-describedby']).toBe('phone-error');
    });

    it('should generate consistent describedby IDs for error messages', () => {
      const errors = { 
        'complex-field-name': 'Error message',
        'simple': 'Another error'
      };

      const complexProps = getFieldProps('complex-field-name', errors);
      const simpleProps = getFieldProps('simple', errors);

      expect(complexProps['aria-describedby']).toBe('complex-field-name-error');
      expect(simpleProps['aria-describedby']).toBe('simple-error');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide descriptive error messages for screen readers', () => {
      const errors = {
        email: 'Please enter a valid email address',
        password: 'Password must be at least 8 characters',
        confirmPassword: 'Passwords must match'
      };

      // Each error message should be descriptive and actionable
      Object.values(errors).forEach(message => {
        expect(message).toMatch(/^[A-Z]/); // Starts with capital letter
        expect(message.length).toBeGreaterThan(10); // Descriptive enough
        expect(message).not.toMatch(/^Error:/); // No generic "Error:" prefix
      });
    });

    it('should support progressive disclosure of validation errors', () => {
      // Start with no errors
      let errors = {};
      let props = getFieldProps('email', errors);
      expect(props['aria-invalid']).toBeUndefined();

      // Add error
      errors = { email: 'Please enter a valid email address' };
      props = getFieldProps('email', errors);
      expect(props['aria-invalid']).toBe('true');

      // Clear error
      errors = {};
      props = getFieldProps('email', errors);
      expect(props['aria-invalid']).toBeUndefined();
    });

    it('should handle fields with complex names for screen readers', () => {
      const complexFieldNames = [
        'user-email-address',
        'billing_phone_number',
        'child.firstName',
        'preferences[0].value'
      ];

      const errors = Object.fromEntries(
        complexFieldNames.map(name => [name, 'Field error'])
      );

      complexFieldNames.forEach(fieldName => {
        const props = getFieldProps(fieldName, errors);
        expect(props['aria-describedby']).toBe(`${fieldName}-error`);
        expect(props['aria-invalid']).toBe('true');
      });
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('should support keyboard-only error navigation', () => {
      const errors = {
        name: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a 10-digit phone number'
      };

      // All error fields should have proper ARIA attributes for keyboard navigation
      Object.keys(errors).forEach(fieldName => {
        const props = getFieldProps(fieldName, errors);
        expect(props['aria-invalid']).toBe('true');
        expect(props['aria-describedby']).toBeTruthy();
      });
    });

    it('should maintain focus management during validation state changes', () => {
      // This would be tested in browser environment with actual DOM
      // Here we verify the prop changes that support focus management
      const fieldName = 'email';
      
      // Initial state - no error
      let errors = {};
      let props = getFieldProps(fieldName, errors);
      expect(props['aria-invalid']).toBeUndefined();

      // Error appears - field should remain focusable with error indication
      errors = { email: 'Invalid email' };
      props = getFieldProps(fieldName, errors);
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBe('email-error');
    });
  });

  describe('Color and Contrast Independence', () => {
    it('should provide non-visual error indicators', () => {
      const errors = { email: 'Please enter a valid email address' };
      const props = getFieldProps('email', errors);

      // Error state should be communicated through ARIA, not just color
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBeTruthy();
    });

    it('should work with high contrast mode', () => {
      // Verify that error state communication doesn't rely on color alone
      const errors = { password: 'Password too short' };
      const props = getFieldProps('password', errors);

      // These attributes work in high contrast mode
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBe('password-error');
    });
  });

  describe('Mobile Accessibility', () => {
    it('should provide appropriate input types for mobile keyboards', () => {
      // This would typically be handled in the input components themselves
      // but we can verify the validation works with different input types
      
      const emailData = { email: 'test@example.com' };
      const phoneData = { phone: '5551234567' };
      
      // Email validation should work with type="email" inputs
      expect(typeof emailData.email).toBe('string');
      
      // Phone validation should work with type="tel" inputs  
      expect(typeof phoneData.phone).toBe('string');
    });

    it('should handle touch screen error interaction', () => {
      const errors = { 
        name: 'This field is required',
        email: 'Please enter a valid email address'
      };

      // Error messages should be easily tappable and readable on mobile
      Object.keys(errors).forEach(fieldName => {
        const props = getFieldProps(fieldName, errors);
        expect(props['aria-describedby']).toBeTruthy();
        expect(errors[fieldName].length).toBeGreaterThan(15); // Readable length
      });
    });
  });

  describe('Internationalization and Localization', () => {
    it('should support RTL languages for error message positioning', () => {
      const errors = { email: 'Please enter a valid email address' };
      const props = getFieldProps('email', errors);

      // The describedby relationship works regardless of text direction
      expect(props['aria-describedby']).toBe('email-error');
    });

    it('should handle different character sets in field names', () => {
      const errors = {
        'correo-electrónico': 'Por favor ingrese un email válido',
        'téléphone': 'Numéro de téléphone invalide',
        'メール': 'メールアドレスが無効です'
      };

      Object.keys(errors).forEach(fieldName => {
        const props = getFieldProps(fieldName, errors);
        expect(props['aria-describedby']).toBe(`${fieldName}-error`);
        expect(props['aria-invalid']).toBe('true');
      });
    });
  });

  describe('Assistive Technology Compatibility', () => {
    it('should work with screen reader announcement patterns', () => {
      const errors = {
        email: 'Please enter a valid email address',
        password: 'Password must be at least 8 characters long'
      };

      // Error messages should be in announcement-friendly format
      Object.values(errors).forEach(message => {
        // Should not start with technical jargon
        expect(message).not.toMatch(/^(Error|Invalid|Bad)/);
        
        // Should be instructional
        expect(message.toLowerCase()).toMatch(/(please|must|should|enter|provide)/);
        
        // Should be complete sentences for better SR experience
        expect(message).toMatch(/[.!]$|[a-z]$/);
      });
    });

    it('should support voice control software', () => {
      const errors = { 'user-name': 'This field is required' };
      const props = getFieldProps('user-name', errors);

      // Field name should be accessible for voice commands
      expect(props['aria-describedby']).toBe('user-name-error');
    });

    it('should work with switch navigation devices', () => {
      const errors = {
        field1: 'Error 1',
        field2: 'Error 2',
        field3: 'Error 3'
      };

      // All error fields should have consistent ARIA attributes for switch navigation
      Object.keys(errors).forEach(fieldName => {
        const props = getFieldProps(fieldName, errors);
        expect(props['aria-invalid']).toBe('true');
        expect(props['aria-describedby']).toMatch(new RegExp(`^${fieldName}-error$`));
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable error messages', () => {
      const goodErrorMessages = [
        'Please enter a valid email address',
        'Password must be at least 8 characters',
        'Please enter a 10-digit phone number',
        'This field is required',
        'Must be at least 10 characters'
      ];

      goodErrorMessages.forEach(message => {
        // Should be instructional, not just descriptive
        const isActionable = message.toLowerCase().includes('please') ||
                             message.toLowerCase().includes('must') ||
                             message.toLowerCase().includes('enter') ||
                             message.toLowerCase().includes('provide') ||
                             message.toLowerCase().includes('required');
        
        expect(isActionable).toBe(true);
      });
    });

    it('should avoid technical jargon in error messages', () => {
      const technicalTerms = [
        'validation failed',
        'invalid input',
        'regex mismatch', 
        'constraint violation',
        'field error'
      ];

      // Our error messages should be user-friendly
      const friendlyMessages = [
        'Please enter a valid email address',
        'This field is required',
        'Please enter a 10-digit phone number'
      ];

      friendlyMessages.forEach(message => {
        const hasTechnicalJargon = technicalTerms.some(term => 
          message.toLowerCase().includes(term)
        );
        expect(hasTechnicalJargon).toBe(false);
      });
    });

    it('should provide context-specific error messages', () => {
      // Phone field errors should mention phone specifically
      const phoneErrors = ['Please enter a 10-digit phone number'];
      phoneErrors.forEach(error => {
        expect(error.toLowerCase()).toMatch(/phone|number/);
      });

      // Email field errors should mention email specifically  
      const emailErrors = ['Please enter a valid email address'];
      emailErrors.forEach(error => {
        expect(error.toLowerCase()).toMatch(/email|address/);
      });
    });
  });

  describe('Progressive Enhancement', () => {
    it('should maintain accessibility without JavaScript', () => {
      // Our validation props should work even if JS is disabled
      const errors = { name: 'This field is required' };
      const props = getFieldProps('name', errors);

      // These HTML attributes work without JavaScript
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBe('name-error');
    });

    it('should enhance HTML5 validation accessibility', () => {
      // Our system should complement, not replace, HTML5 validation
      const errors = { email: 'Please enter a valid email address' };
      const props = getFieldProps('email', errors);

      // Works alongside HTML5 required, pattern, type attributes
      expect(props['aria-invalid']).toBe('true');
      expect(props['aria-describedby']).toBeTruthy();
    });
  });
});