---
id: 011
title: "Form Accessibility Issues"
severity: high
status: open
category: accessibility
affected_pages: ["/contact", "/admissions/schedule-tour", "all forms"]
related_bugs: [006, 007]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 011: Form Accessibility Issues

## Description
Forms throughout the site have multiple accessibility violations including missing labels, lack of ARIA attributes, poor error handling, and no keyboard navigation support. This makes forms unusable for users relying on assistive technologies.

## Steps to Reproduce
1. Use screen reader on any form
2. Navigate forms using only keyboard
3. Submit form with errors
4. Run accessibility audit on form pages

## Expected Behavior
- All inputs have associated labels
- Error messages are announced
- Forms are fully keyboard navigable
- Clear focus indicators
- Proper ARIA attributes
- Logical tab order

## Actual Behavior
- Labels missing or not associated
- Errors not announced to screen readers
- Some fields not keyboard accessible
- No focus indicators
- Screen readers cannot understand form purpose
- Tab order is illogical

## Accessibility Violations
```
Form Audit Results:
1. Contact Form
   - Missing labels: 3 inputs
   - No error announcements
   - Submit button unclear purpose
   - No form landmark

2. Tour Scheduling Form
   - Date picker not keyboard accessible
   - Time slots not properly labeled
   - No instructions for screen readers
   - Error messages not associated

3. Newsletter Signup
   - Placeholder text used instead of label
   - No success confirmation for screen readers
   - Submit button just says "Submit"

Common Issues:
- input elements without labels: 45%
- Missing required field indicators: 80%
- No fieldset/legend for groups: 100%
- Color-only error indicators: 60%
- No skip links to form: 100%
```

## Affected Files
- `/src/components/forms/*.astro` - All form components
- `/src/components/AuthForm.astro` - Authentication forms
- `/src/pages/contact.astro` - Contact form
- Form validation JavaScript files
- Global form styles

## Potential Causes
1. **Development Practices**
   - Accessibility not considered during development
   - Visual design prioritized over semantic HTML
   - No accessibility testing process

2. **Component Architecture**
   - Form components don't enforce accessibility
   - Missing accessibility props
   - No validation for required attributes

3. **Knowledge Gap**
   - Developers unaware of requirements
   - No accessibility guidelines
   - Complex ARIA patterns not understood

## Suggested Fixes

### Option 1: Accessible Form Component
```astro
---
// AccessibleForm.astro
export interface Props {
  action: string;
  method?: 'GET' | 'POST';
  ariaLabel: string;
  onSubmit?: string;
}

const { action, method = 'POST', ariaLabel, onSubmit } = Astro.props;
---

<form
  action={action}
  method={method}
  aria-label={ariaLabel}
  novalidate
  data-form={onSubmit}
>
  <div class="sr-only" aria-live="polite" aria-atomic="true" data-form-status>
    <!-- Status messages announced to screen readers -->
  </div>
  
  <slot />
  
  <div class="form-actions">
    <button type="submit" class="btn btn-primary">
      <slot name="submit-text">Submit Form</slot>
    </button>
  </div>
</form>

<script>
  document.querySelectorAll('[data-form]').forEach(form => {
    const statusRegion = form.querySelector('[data-form-status]');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      form.querySelectorAll('[aria-invalid="true"]').forEach(el => {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      });
      
      // Validate form
      const errors = validateForm(form);
      
      if (errors.length > 0) {
        // Announce errors
        statusRegion.textContent = `Form has ${errors.length} errors. Please review and correct.`;
        
        // Mark invalid fields
        errors.forEach(error => {
          const field = form.querySelector(`[name="${error.field}"]`);
          const errorId = `${error.field}-error`;
          
          field.setAttribute('aria-invalid', 'true');
          field.setAttribute('aria-describedby', errorId);
          
          // Create error message
          const errorEl = document.createElement('span');
          errorEl.id = errorId;
          errorEl.className = 'field-error';
          errorEl.textContent = error.message;
          field.parentElement.appendChild(errorEl);
        });
        
        // Focus first error
        errors[0].element.focus();
      } else {
        // Submit form
        statusRegion.textContent = 'Submitting form...';
        // ... submission logic
      }
    });
  });
</script>
```

### Option 2: Accessible Input Component
```astro
---
// AccessibleInput.astro
export interface Props {
  type?: string;
  name: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  autocomplete?: string;
}

const { 
  type = 'text', 
  name, 
  label, 
  required = false, 
  helpText, 
  error,
  autocomplete 
} = Astro.props;

const inputId = `input-${name}`;
const helpId = helpText ? `${inputId}-help` : undefined;
const errorId = error ? `${inputId}-error` : undefined;
const describedBy = [helpId, errorId].filter(Boolean).join(' ');
---

<div class="form-field">
  <label for={inputId} class="form-label">
    {label}
    {required && <span class="required" aria-label="required">*</span>}
  </label>
  
  {helpText && (
    <span id={helpId} class="help-text">
      {helpText}
    </span>
  )}
  
  <input
    type={type}
    id={inputId}
    name={name}
    class="form-input"
    required={required}
    aria-required={required}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy || undefined}
    autocomplete={autocomplete}
  />
  
  {error && (
    <span id={errorId} class="error-message" role="alert">
      <svg class="error-icon" aria-hidden="true">
        <!-- Error icon -->
      </svg>
      {error}
    </span>
  )}
</div>

<style>
  .form-field {
    margin-bottom: 20px;
  }
  
  .form-label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-color);
  }
  
  .required {
    color: var(--error-color);
    margin-left: 4px;
  }
  
  .form-input {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    transition: border-color 0.2s;
  }
  
  .form-input:focus {
    outline: 3px solid var(--focus-color);
    outline-offset: 2px;
    border-color: var(--primary-color);
  }
  
  .form-input[aria-invalid="true"] {
    border-color: var(--error-color);
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--error-color);
    font-size: 14px;
    margin-top: 6px;
  }
  
  .help-text {
    display: block;
    font-size: 14px;
    color: var(--muted-text);
    margin-bottom: 6px;
  }
</style>
```

### Option 3: Form Validation with Announcements
```javascript
// form-validation.js
export class AccessibleFormValidator {
  constructor(form) {
    this.form = form;
    this.liveRegion = this.createLiveRegion();
    this.setupValidation();
  }
  
  createLiveRegion() {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    this.form.prepend(region);
    return region;
  }
  
  setupValidation() {
    // Real-time validation
    this.form.addEventListener('blur', (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.validateField(e.target);
      }
    }, true);
    
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.validateForm();
    });
  }
  
  validateField(field) {
    const errors = [];
    
    // Required validation
    if (field.required && !field.value.trim()) {
      errors.push(`${this.getFieldLabel(field)} is required`);
    }
    
    // Type-specific validation
    if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        errors.push(`Please enter a valid email address`);
      }
    }
    
    // Update field state
    this.updateFieldState(field, errors);
    
    return errors;
  }
  
  updateFieldState(field, errors) {
    const errorId = `${field.id}-error`;
    let errorElement = document.getElementById(errorId);
    
    if (errors.length > 0) {
      // Mark as invalid
      field.setAttribute('aria-invalid', 'true');
      
      // Create or update error message
      if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.id = errorId;
        errorElement.className = 'field-error';
        errorElement.setAttribute('role', 'alert');
        field.parentElement.appendChild(errorElement);
      }
      
      errorElement.textContent = errors[0];
      field.setAttribute('aria-describedby', errorId);
      
    } else {
      // Mark as valid
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      
      // Remove error message
      if (errorElement) {
        errorElement.remove();
      }
    }
  }
  
  getFieldLabel(field) {
    const label = this.form.querySelector(`label[for="${field.id}"]`);
    return label ? label.textContent.replace('*', '').trim() : field.name;
  }
}
```

## Testing Requirements
1. Test with multiple screen readers (NVDA, JAWS, VoiceOver)
2. Complete forms using only keyboard
3. Verify all errors are announced
4. Check focus management
5. Test with browser zoom at 200%
6. Validate against WCAG 2.1 Level AA
7. Test with voice control software

## Related Issues
- Bug #006: Missing alt text (overall accessibility)
- Bug #007: Touch targets (form inputs on mobile)

## Additional Notes
- Form accessibility is legally required (ADA/Section 508)
- Poor form accessibility = lost conversions
- Consider adding autocomplete attributes
- Implement progressive enhancement
- Add form analytics to track abandonment
- Create accessibility checklist for developers