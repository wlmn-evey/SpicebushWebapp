/**
 * Unit tests for form enhancement functionality
 * Tests progressive validation, error display, and accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enhanceForm } from '../../lib/form-enhance';
import { validators } from '../../lib/form-validation';

describe('Form Enhancement', () => {
  let form: HTMLFormElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a container for our test DOM
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create a test form
    container.innerHTML = `
      <form id="test-form">
        <input type="text" name="name" id="name" />
        <span id="name-error" style="display: none;"></span>
        
        <input type="email" name="email" id="email" />
        <span id="email-error" style="display: none;"></span>
        
        <input type="tel" name="phone" id="phone" />
        <span id="phone-error" style="display: none;"></span>
        
        <textarea name="message" id="message"></textarea>
        <span id="message-error" style="display: none;"></span>
        
        <select name="subject" id="subject">
          <option value="">Select</option>
          <option value="general">General</option>
        </select>
        <span id="subject-error" style="display: none;"></span>
        
        <input type="submit" value="Submit" />
      </form>
    `;

    form = container.querySelector('#test-form')!;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Basic Enhancement', () => {
    it('should enhance form without errors', () => {
      expect(() => enhanceForm(form)).not.toThrow();
    });

    it('should work with empty options', () => {
      expect(() => enhanceForm(form, {})).not.toThrow();
    });

    it('should handle forms without fields gracefully', () => {
      const emptyForm = document.createElement('form');
      expect(() => enhanceForm(emptyForm)).not.toThrow();
    });
  });

  describe('Blur Validation', () => {
    it('should validate on blur by default', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required],
          email: [validators.required, validators.email]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      // Trigger blur without value
      nameInput.dispatchEvent(new Event('blur'));

      expect(nameError.textContent).toBe('This field is required');
      expect(nameError.style.display).toBe('block');
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toBe('name-error');
    });

    it('should not validate fields not in schema', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        }
      });

      const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement;
      const phoneError = container.querySelector('#phone-error') as HTMLElement;

      phoneInput.dispatchEvent(new Event('blur'));

      expect(phoneError.textContent).toBe('');
      expect(phoneError.style.display).toBe('none');
      expect(phoneInput.getAttribute('aria-invalid')).toBeNull();
    });

    it('should clear error on valid input', () => {
      enhanceForm(form, {
        validationSchema: {
          email: [validators.required, validators.email]
        }
      });

      const emailInput = form.querySelector('[name="email"]') as HTMLInputElement;
      const emailError = container.querySelector('#email-error') as HTMLElement;

      // First create an error
      emailInput.value = 'invalid';
      emailInput.dispatchEvent(new Event('blur'));
      expect(emailError.textContent).toBe('Please enter a valid email address');

      // Then fix it
      emailInput.value = 'test@example.com';
      emailInput.dispatchEvent(new Event('blur'));
      expect(emailError.textContent).toBe('');
      expect(emailError.style.display).toBe('none');
      expect(emailInput.getAttribute('aria-invalid')).toBeNull();
    });

    it('should disable blur validation when validateOnBlur is false', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        },
        validateOnBlur: false
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      nameInput.dispatchEvent(new Event('blur'));

      expect(nameError.textContent).toBe('');
      expect(nameError.style.display).toBe('none');
    });
  });

  describe('Input Event Handling', () => {
    it('should clear error on input if field was invalid', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      // Create error first
      nameInput.dispatchEvent(new Event('blur'));
      expect(nameError.textContent).toBe('This field is required');
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');

      // Start typing
      nameInput.value = 'J';
      nameInput.dispatchEvent(new Event('input'));

      expect(nameError.textContent).toBe('');
      expect(nameError.style.display).toBe('none');
      expect(nameInput.getAttribute('aria-invalid')).toBeNull();
    });

    it('should not validate on input if field was not invalid', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required, validators.minLength(5)]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      // Type without creating error first
      nameInput.value = 'Jo';
      nameInput.dispatchEvent(new Event('input'));

      expect(nameError.textContent).toBe('');
      expect(nameInput.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with errors', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required],
          email: [validators.required, validators.email],
          message: [validators.required, validators.minLength(10)]
        }
      });

      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      expect(submitEvent.defaultPrevented).toBe(true);
    });

    it('should allow submission without errors', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required],
          email: [validators.required, validators.email]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const emailInput = form.querySelector('[name="email"]') as HTMLInputElement;

      nameInput.value = 'John Doe';
      emailInput.value = 'john@example.com';

      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      expect(submitEvent.defaultPrevented).toBe(false);
    });

    it('should focus first error field on submit', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required],
          email: [validators.required],
          message: [validators.required]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const focusSpy = vi.spyOn(nameInput, 'focus');

      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should validate all fields on submit', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required],
          email: [validators.required],
          phone: [validators.phone]
        }
      });

      const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement;
      phoneInput.value = '123'; // Invalid phone

      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      const nameError = container.querySelector('#name-error') as HTMLElement;
      const emailError = container.querySelector('#email-error') as HTMLElement;
      const phoneError = container.querySelector('#phone-error') as HTMLElement;

      expect(nameError.textContent).toBe('This field is required');
      expect(emailError.textContent).toBe('This field is required');
      expect(phoneError.textContent).toBe('Please enter a 10-digit phone number');
    });
  });

  describe('Custom Error Display', () => {
    it('should use custom displayError function', () => {
      const customErrors: Record<string, string | null> = {};
      
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        },
        displayError: (fieldName, error) => {
          customErrors[fieldName] = error;
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      nameInput.dispatchEvent(new Event('blur'));

      expect(customErrors.name).toBe('This field is required');

      nameInput.value = 'John';
      nameInput.dispatchEvent(new Event('blur'));

      expect(customErrors.name).toBeNull();
    });
  });

  describe('Field State Management', () => {
    it('should add/remove border classes based on validation', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        }
      });

      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;

      // Should have default border
      expect(nameInput.classList.contains('border-gray-300')).toBe(false);

      // Create error
      nameInput.dispatchEvent(new Event('blur'));
      expect(nameInput.classList.contains('border-red-300')).toBe(true);
      expect(nameInput.classList.contains('border-gray-300')).toBe(false);

      // Fix error
      nameInput.value = 'John';
      nameInput.dispatchEvent(new Event('blur'));
      expect(nameInput.classList.contains('border-red-300')).toBe(false);
      expect(nameInput.classList.contains('border-gray-300')).toBe(true);
    });
  });

  describe('Field Type Support', () => {
    it('should work with input fields', () => {
      enhanceForm(form, {
        validationSchema: {
          name: [validators.required]
        }
      });

      const input = form.querySelector('input[name="name"]') as HTMLInputElement;
      input.dispatchEvent(new Event('blur'));

      const error = container.querySelector('#name-error') as HTMLElement;
      expect(error.textContent).toBe('This field is required');
    });

    it('should work with textarea fields', () => {
      enhanceForm(form, {
        validationSchema: {
          message: [validators.required]
        }
      });

      const textarea = form.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
      textarea.dispatchEvent(new Event('blur'));

      const error = container.querySelector('#message-error') as HTMLElement;
      expect(error.textContent).toBe('This field is required');
    });

    it('should work with select fields', () => {
      enhanceForm(form, {
        validationSchema: {
          subject: [validators.required]
        }
      });

      const select = form.querySelector('select[name="subject"]') as HTMLSelectElement;
      select.dispatchEvent(new Event('blur'));

      const error = container.querySelector('#subject-error') as HTMLElement;
      expect(error.textContent).toBe('This field is required');
    });

    it('should ignore submit and button inputs', () => {
      const formWithButtons = document.createElement('form');
      formWithButtons.innerHTML = `
        <input type="text" name="field" />
        <input type="submit" name="submit" value="Submit" />
        <input type="button" name="button" value="Button" />
      `;

      expect(() => enhanceForm(formWithButtons)).not.toThrow();

      // Check that only the text input is enhanced
      const fields = formWithButtons.querySelectorAll('[aria-invalid], [aria-describedby]');
      expect(fields.length).toBe(0); // No fields validated yet
    });
  });

  describe('Error Element Creation', () => {
    it('should handle missing error elements gracefully', () => {
      // Form without error spans
      const formNoErrors = document.createElement('form');
      formNoErrors.innerHTML = `
        <input type="text" name="field" />
      `;

      enhanceForm(formNoErrors, {
        validationSchema: {
          field: [validators.required]
        }
      });

      const input = formNoErrors.querySelector('[name="field"]') as HTMLInputElement;
      
      // Should not throw when trying to display error
      expect(() => input.dispatchEvent(new Event('blur'))).not.toThrow();
    });
  });
});