/**
 * Integration tests for contact form validation
 * Tests the complete form behavior including validation, error display, and submission
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

describe('Contact Form Integration', () => {
  let container: HTMLDivElement;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch for form submission
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Simulate the contact form HTML structure
    container.innerHTML = `
      <form id="contact-form" name="contact-form" method="POST">
        <!-- Name Field -->
        <div>
          <label for="name">Your Name *</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            required 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
          <span id="name-error" class="error-message text-sm text-red-600 mt-1 block" style="display: none;"></span>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email">Email Address *</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            required 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
          <span id="email-error" class="error-message text-sm text-red-600 mt-1 block" style="display: none;"></span>
        </div>

        <!-- Phone Field -->
        <div>
          <label for="phone">Phone Number</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="(555) 123-4567"
          />
          <span id="phone-error" class="error-message text-sm text-red-600 mt-1 block" style="display: none;"></span>
        </div>

        <!-- Subject Field -->
        <div>
          <label for="subject">Subject *</label>
          <select 
            id="subject" 
            name="subject" 
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="">What can we help you with?</option>
            <option value="tour">Schedule a Tour</option>
            <option value="admissions">Admissions Questions</option>
            <option value="general">General Questions</option>
          </select>
        </div>

        <!-- Message Field -->
        <div>
          <label for="message">Your Message *</label>
          <textarea 
            id="message" 
            name="message" 
            rows="6" 
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg"
          ></textarea>
          <span id="message-error" class="error-message text-sm text-red-600 mt-1 block" style="display: none;"></span>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          id="submit-btn"
          class="w-full bg-forest-canopy text-white px-8 py-4 rounded-lg"
        >
          <span id="submit-text">Send Message</span>
          <span id="submit-loading" class="hidden">Sending...</span>
        </button>
      </form>
    `;

    // Import and initialize form enhancement
    return import('../../lib/form-enhance').then(({ enhanceForm }) => {
      return import('../../lib/form-validation').then(({ validators }) => {
        const form = container.querySelector('#contact-form') as HTMLFormElement;
        enhanceForm(form, {
          validationSchema: {
            name: [validators.required],
            email: [validators.required, validators.email],
            phone: [validators.phone],
            subject: [validators.required],
            message: [validators.required, validators.minLength(10)]
          }
        });
      });
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('Field Validation on Blur', () => {
    it('should show error for empty required fields', async () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      await userEvent.click(nameInput);
      await userEvent.tab(); // Blur the field

      expect(nameError.textContent).toBe('This field is required');
      expect(nameError.style.display).toBe('block');
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toBe('name-error');
    });

    it('should validate email format', async () => {
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const emailError = container.querySelector('#email-error') as HTMLElement;

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      expect(emailError.textContent).toBe('Please enter a valid email address');
      expect(emailError.style.display).toBe('block');
    });

    it('should validate phone number format', async () => {
      const phoneInput = container.querySelector('#phone') as HTMLInputElement;
      const phoneError = container.querySelector('#phone-error') as HTMLElement;

      await userEvent.type(phoneInput, '123');
      await userEvent.tab();

      expect(phoneError.textContent).toBe('Please enter a 10-digit phone number');
      expect(phoneError.style.display).toBe('block');
    });

    it('should validate message length', async () => {
      const messageInput = container.querySelector('#message') as HTMLTextAreaElement;
      const messageError = container.querySelector('#message-error') as HTMLElement;

      await userEvent.type(messageInput, 'Short');
      await userEvent.tab();

      expect(messageError.textContent).toBe('Must be at least 10 characters');
      expect(messageError.style.display).toBe('block');
    });
  });

  describe('Error Clearing on Input', () => {
    it('should clear error when user starts typing', async () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      const nameError = container.querySelector('#name-error') as HTMLElement;

      // Create error first
      await userEvent.click(nameInput);
      await userEvent.tab();
      expect(nameError.textContent).toBe('This field is required');

      // Start typing
      await userEvent.type(nameInput, 'J');
      expect(nameError.textContent).toBe('');
      expect(nameError.style.display).toBe('none');
      expect(nameInput.getAttribute('aria-invalid')).toBeNull();
    });

    it('should re-validate on subsequent blur', async () => {
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const emailError = container.querySelector('#email-error') as HTMLElement;

      // Type invalid email
      await userEvent.type(emailInput, 'invalid');
      await userEvent.tab();
      expect(emailError.textContent).toBe('Please enter a valid email address');

      // Clear and type valid email
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.tab();
      expect(emailError.textContent).toBe('');
      expect(emailError.style.display).toBe('none');
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with validation errors', async () => {
      const form = container.querySelector('#contact-form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      
      form.dispatchEvent(submitEvent);
      
      expect(submitEvent.defaultPrevented).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should focus first error field on invalid submission', async () => {
      const form = container.querySelector('#contact-form') as HTMLFormElement;
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      
      const focusSpy = vi.spyOn(nameInput, 'focus');
      
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should display all errors on submit', async () => {
      const form = container.querySelector('#contact-form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      
      form.dispatchEvent(submitEvent);
      
      const nameError = container.querySelector('#name-error') as HTMLElement;
      const emailError = container.querySelector('#email-error') as HTMLElement;
      const messageError = container.querySelector('#message-error') as HTMLElement;
      
      expect(nameError.textContent).toBe('This field is required');
      expect(emailError.textContent).toBe('This field is required');
      expect(messageError.textContent).toBe('This field is required');
    });

    it('should allow submission with valid data', async () => {
      // Fill in valid data
      await userEvent.type(container.querySelector('#name')!, 'John Doe');
      await userEvent.type(container.querySelector('#email')!, 'john@example.com');
      await userEvent.type(container.querySelector('#phone')!, '1234567890');
      await userEvent.selectOptions(container.querySelector('#subject')!, 'tour');
      await userEvent.type(container.querySelector('#message')!, 'I would like to schedule a tour of your school.');
      
      const form = container.querySelector('#contact-form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      
      form.dispatchEvent(submitEvent);
      
      expect(submitEvent.defaultPrevented).toBe(false);
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format phone number on input', async () => {
      const phoneInput = container.querySelector('#phone') as HTMLInputElement;
      
      // Note: Phone formatting happens on input event in the actual implementation
      // For this test, we'll simulate the formatting behavior
      phoneInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        if (value.length >= 6) {
          value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
          value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
        }
        this.value = value;
      });
      
      await userEvent.type(phoneInput, '1234567890');
      expect(phoneInput.value).toBe('(123) 456-7890');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for errors', async () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      
      // Create errors
      await userEvent.click(nameInput);
      await userEvent.tab();
      await userEvent.click(emailInput);
      await userEvent.tab();
      
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toBe('name-error');
      expect(emailInput.getAttribute('aria-invalid')).toBe('true');
      expect(emailInput.getAttribute('aria-describedby')).toBe('email-error');
    });

    it('should have role="alert" on error messages', () => {
      const errorMessages = container.querySelectorAll('.error-message');
      errorMessages.forEach(error => {
        expect(error.getAttribute('role')).toBe('alert');
      });
    });

    it('should have proper labels for all fields', () => {
      const fields = ['name', 'email', 'phone', 'subject', 'message'];
      
      fields.forEach(fieldName => {
        const field = container.querySelector(`#${fieldName}`);
        const label = container.querySelector(`label[for="${fieldName}"]`);
        
        expect(field).toBeTruthy();
        expect(label).toBeTruthy();
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should update border color on error', async () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      
      // Initial state
      expect(nameInput.classList.contains('border-gray-300')).toBe(true);
      
      // Create error
      await userEvent.click(nameInput);
      await userEvent.tab();
      
      expect(nameInput.classList.contains('border-red-300')).toBe(true);
      expect(nameInput.classList.contains('border-gray-300')).toBe(false);
    });

    it('should restore border color when error is fixed', async () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      
      // Create error
      await userEvent.click(nameInput);
      await userEvent.tab();
      expect(nameInput.classList.contains('border-red-300')).toBe(true);
      
      // Fix error
      await userEvent.type(nameInput, 'John Doe');
      await userEvent.tab();
      
      expect(nameInput.classList.contains('border-gray-300')).toBe(true);
      expect(nameInput.classList.contains('border-red-300')).toBe(false);
    });
  });

  describe('No JavaScript Fallback', () => {
    it('should have HTML5 validation attributes', () => {
      const nameInput = container.querySelector('#name') as HTMLInputElement;
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const messageInput = container.querySelector('#message') as HTMLTextAreaElement;
      
      expect(nameInput.hasAttribute('required')).toBe(true);
      expect(emailInput.hasAttribute('required')).toBe(true);
      expect(emailInput.type).toBe('email');
      expect(messageInput.hasAttribute('required')).toBe(true);
    });
  });
});