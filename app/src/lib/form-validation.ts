/**
 * Simple form validation utilities
 * Provides basic validation functions for common form fields
 */

// Basic validators - return error message or null
export const validators = {
  required: (value: string): string | null => 
    value?.trim() ? null : 'This field is required',
  
  email: (value: string): string | null => {
    if (!value) return null; // Use with required for mandatory emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Please enter a valid email address';
  },
  
  phone: (value: string): string | null => {
    if (!value) return null; // Use with required for mandatory phones
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.length === 10 ? null : 'Please enter a 10-digit phone number';
  },
  
  minLength: (min: number) => (value: string): string | null =>
    !value || value.length >= min ? null : `Must be at least ${min} characters`,
  
  maxLength: (max: number) => (value: string): string | null =>
    !value || value.length <= max ? null : `Must be no more than ${max} characters`,
  
  matches: (fieldName: string, getValue: () => string) => (value: string): string | null =>
    value === getValue() ? null : `Must match ${fieldName}`,
  
  pattern: (regex: RegExp, message: string) => (value: string): string | null =>
    !value || regex.test(value) ? null : message,
  
  minValue: (min: number) => (value: string): string | null => {
    if (!value) return null; // Use with required for mandatory fields
    const numValue = parseFloat(value);
    return isNaN(numValue) || numValue < min ? `Must be at least ${min}` : null;
  }
};

// Helper to validate a single field
export function validateField(value: string, rules: Array<(value: string) => string | null>): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

// Helper to validate entire form data
export function validateForm(
  formData: FormData | Record<string, string>,
  schema: Record<string, Array<(value: string) => string | null>>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = formData instanceof FormData 
      ? formData.get(field)?.toString() || ''
      : formData[field] || '';
    
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}

// Helper for phone formatting
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

// Helper for displaying field errors with proper accessibility
export function getFieldProps(fieldName: string, errors: Record<string, string>) {
  const error = errors[fieldName];
  return {
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${fieldName}-error` : undefined
  };
}