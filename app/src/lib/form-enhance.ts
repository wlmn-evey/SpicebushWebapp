/**
 * Lightweight form enhancement for progressive validation
 * Builds upon HTML5 validation with better UX
 */

import { validateField } from './form-validation';

interface FormEnhanceOptions {
  // Map of field names to validation rules
  validationSchema?: Record<string, Array<(value: string) => string | null>>;
  // Whether to validate on blur (default: true)
  validateOnBlur?: boolean;
  // Custom error display function
  displayError?: (fieldName: string, error: string | null) => void;
}

/**
 * Enhance a form with progressive validation
 */
export function enhanceForm(form: HTMLFormElement, options: FormEnhanceOptions = {}) {
  const {
    validationSchema = {},
    validateOnBlur = true,
    displayError = defaultDisplayError
  } = options;

  // Get all form fields
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="submit"]):not([type="button"]), textarea, select'
  );

  // Initialize ARIA attributes for accessibility
  fields.forEach(field => {
    const fieldName = field.getAttribute('name');
    if (fieldName && validationSchema[fieldName]) {
      field.setAttribute('aria-describedby', `${fieldName}-error`);
      field.setAttribute('aria-invalid', 'false');
    }
  });

  // Add blur validation
  if (validateOnBlur) {
    fields.forEach(field => {
      field.addEventListener('blur', () => {
        if (validationSchema[field.name]) {
          const error = validateField(field.value, validationSchema[field.name]);
          displayError(field.name, error);
          updateFieldState(field, error);
        }
      });

      // Clear error on input
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          displayError(field.name, null);
          updateFieldState(field, null);
        }
      });
    });
  }

  // Enhance form submission
  form.addEventListener('submit', (e) => {
    let hasErrors = false;

    // Validate all fields
    fields.forEach(field => {
      if (validationSchema[field.name]) {
        const error = validateField(field.value, validationSchema[field.name]);
        if (error) {
          hasErrors = true;
          displayError(field.name, error);
          updateFieldState(field, error);
        }
      }
    });

    // Prevent submission if errors
    if (hasErrors) {
      e.preventDefault();
      // Focus first error field
      const firstError = form.querySelector('[aria-invalid="true"]') as HTMLElement;
      firstError?.focus();
    }
  });
}

/**
 * Update field state based on validation
 */
function updateFieldState(field: HTMLElement, error: string | null) {
  const fieldName = field.getAttribute('name');
  
  if (error) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${fieldName}-error`);
    field.classList.add('border-red-500');
    field.classList.remove('border-gray-300');
  } else {
    field.setAttribute('aria-invalid', 'false');
    // Keep aria-describedby for screen readers to know where error messages appear
    field.setAttribute('aria-describedby', `${fieldName}-error`);
    field.classList.remove('border-red-500');
    field.classList.add('border-gray-300');
  }
}

/**
 * Default error display function
 */
function defaultDisplayError(fieldName: string, error: string | null) {
  const errorElement = document.getElementById(`${fieldName}-error`);
  if (errorElement) {
    errorElement.textContent = error || '';
    errorElement.style.display = error ? 'block' : 'none';
    
    // Ensure proper ARIA attributes for screen reader announcements
    if (error) {
      errorElement.setAttribute('aria-live', 'assertive');
      errorElement.setAttribute('aria-atomic', 'true');
      errorElement.setAttribute('role', 'alert');
    }
  }
}
