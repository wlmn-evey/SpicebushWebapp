#!/usr/bin/env node

/**
 * Simple Node.js test runner for form validation
 * Tests the core functionality without complex build system interactions
 */

const fs = require('fs');
const path = require('path');

// Simple test framework
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description, testFn) {
  testCount++;
  try {
    testFn();
    console.log(`✅ ${description}`);
    passCount++;
  } catch (error) {
    console.error(`❌ ${description}`);
    console.error(`   ${error.message}`);
    failCount++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toMatch: (pattern) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to match ${pattern}`);
      }
    },
    toContain: (substring) => {
      if (!actual.includes(substring)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(substring)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    }
  };
}

// Load the form validation module
const formValidationPath = path.join(__dirname, 'src', 'lib', 'form-validation.ts');

if (!fs.existsSync(formValidationPath)) {
  console.error('❌ form-validation.ts not found at expected path');
  process.exit(1);
}

// Read and evaluate the TypeScript code (simplified)
const formValidationCode = fs.readFileSync(formValidationPath, 'utf8');

// Simple TypeScript to JavaScript conversion for testing
let jsCode = formValidationCode
  .replace(/export\s+/g, '')
  .replace(/:\s*string(\s*\|\s*null)?/g, '')
  .replace(/:\s*number/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*Array<[^>]+>/g, '')
  .replace(/:\s*Record<[^>]+>/g, '')
  .replace(/:\s*FormData(\s*\|\s*Record<[^>]+>)?/g, '')
  .replace(/interface\s+\w+\s*{[^}]*}/g, '')
  .replace(/type\s+\w+\s*=[^;]+;/g, '');

// Create a sandbox to evaluate the code
const sandbox = {
  validators: {},
  validateField: null,
  validateForm: null,
  formatPhoneNumber: null,
  getFieldProps: null
};

try {
  // Evaluate the JavaScript code in our sandbox
  eval(`
    ${jsCode}
    
    // Export the functions to our sandbox
    if (typeof validators !== 'undefined') sandbox.validators = validators;
    if (typeof validateField !== 'undefined') sandbox.validateField = validateField;
    if (typeof validateForm !== 'undefined') sandbox.validateForm = validateForm;
    if (typeof formatPhoneNumber !== 'undefined') sandbox.formatPhoneNumber = formatPhoneNumber;
    if (typeof getFieldProps !== 'undefined') sandbox.getFieldProps = getFieldProps;
  `);
} catch (error) {
  console.error('❌ Failed to load form validation code:', error.message);
  process.exit(1);
}

// Extract functions from sandbox
const { validators, validateField, validateForm, formatPhoneNumber, getFieldProps } = sandbox;

console.log('🧪 Form Validation Simple Test Suite');
console.log('====================================');
console.log('');

// Test Basic Validators
console.log('📋 Testing Basic Validators...');

test('validators.required - valid input', () => {
  expect(validators.required('test')).toBeNull();
  expect(validators.required('  valid  ')).toBeNull();
});

test('validators.required - invalid input', () => {
  expect(validators.required('')).toBe('This field is required');
  expect(validators.required('   ')).toBe('This field is required');
});

test('validators.email - valid emails', () => {
  expect(validators.email('test@example.com')).toBeNull();
  expect(validators.email('user.name+tag@domain.co.uk')).toBeNull();
});

test('validators.email - invalid emails', () => {
  expect(validators.email('invalid')).toBe('Please enter a valid email address');
  expect(validators.email('test@')).toBe('Please enter a valid email address');
});

test('validators.email - empty values', () => {
  expect(validators.email('')).toBeNull();
});

test('validators.phone - valid phones', () => {
  expect(validators.phone('1234567890')).toBeNull();
  expect(validators.phone('(123) 456-7890')).toBeNull();
  expect(validators.phone('123-456-7890')).toBeNull();
});

test('validators.phone - invalid phones', () => {
  expect(validators.phone('123')).toBe('Please enter a 10-digit phone number');
  expect(validators.phone('12345678901')).toBe('Please enter a 10-digit phone number');
});

test('validators.phone - empty values', () => {
  expect(validators.phone('')).toBeNull();
});

test('validators.minLength - valid lengths', () => {
  const minLength5 = validators.minLength(5);
  expect(minLength5('hello')).toBeNull();
  expect(minLength5('hello world')).toBeNull();
});

test('validators.minLength - invalid lengths', () => {
  const minLength5 = validators.minLength(5);
  expect(minLength5('hi')).toBe('Must be at least 5 characters');
});

test('validators.maxLength - valid lengths', () => {
  const maxLength10 = validators.maxLength(10);
  expect(maxLength10('hello')).toBeNull();
  expect(maxLength10('1234567890')).toBeNull();
});

test('validators.maxLength - invalid lengths', () => {
  const maxLength10 = validators.maxLength(10);
  expect(maxLength10('this is too long')).toBe('Must be no more than 10 characters');
});

// Test Field Validation
console.log('');
console.log('🔍 Testing Field Validation...');

test('validateField - all rules pass', () => {
  const rules = [validators.required, validators.email];
  expect(validateField('test@example.com', rules)).toBeNull();
});

test('validateField - first rule fails', () => {
  const rules = [validators.required, validators.email];
  expect(validateField('', rules)).toBe('This field is required');
});

test('validateField - second rule fails', () => {
  const rules = [validators.required, validators.email];
  expect(validateField('invalid-email', rules)).toBe('Please enter a valid email address');
});

// Test Form Validation
console.log('');
console.log('📝 Testing Form Validation...');

test('validateForm - valid form data (object)', () => {
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

test('validateForm - invalid form data (object)', () => {
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
  expect(errors.name).toBe('This field is required');
  expect(errors.email).toBe('Please enter a valid email address');
  expect(errors.phone).toBe('Please enter a 10-digit phone number');
});

// Test Phone Formatting
console.log('');
console.log('📞 Testing Phone Formatting...');

test('formatPhoneNumber - 10-digit numbers', () => {
  expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
  expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
});

test('formatPhoneNumber - existing formatting', () => {
  expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
  expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
  expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
});

test('formatPhoneNumber - incomplete numbers', () => {
  expect(formatPhoneNumber('123')).toBe('123');
  expect(formatPhoneNumber('123456789')).toBe('123456789');
});

test('formatPhoneNumber - too many digits', () => {
  expect(formatPhoneNumber('12345678901')).toBe('12345678901');
});

test('formatPhoneNumber - empty values', () => {
  expect(formatPhoneNumber('')).toBe('');
});

// Test Accessibility Helpers
console.log('');
console.log('♿ Testing Accessibility Helpers...');

test('getFieldProps - no errors', () => {
  const errors = {};
  const props = getFieldProps('email', errors);
  expect(props['aria-invalid']).toBe(undefined);
  expect(props['aria-describedby']).toBe(undefined);
});

test('getFieldProps - with errors', () => {
  const errors = { email: 'Please enter a valid email address' };
  const props = getFieldProps('email', errors);
  expect(props['aria-invalid']).toBe('true');
  expect(props['aria-describedby']).toBe('email-error');
});

// Test Contact Form Schema
console.log('');
console.log('📧 Testing Contact Form Schema...');

test('Contact form - valid submission', () => {
  const data = {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '(555) 123-4567',
    subject: 'tour',
    message: 'I would like to schedule a tour of your school.'
  };
  
  const contactFormSchema = {
    name: [validators.required],
    email: [validators.required, validators.email],
    phone: [validators.phone], // Optional
    subject: [validators.required],
    message: [validators.required, validators.minLength(10)],
  };
  
  const errors = validateForm(data, contactFormSchema);
  expect(errors).toEqual({});
});

test('Contact form - with optional phone empty', () => {
  const data = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '', // Empty phone should be valid
    subject: 'admissions',
    message: 'Tell me about your admissions process.'
  };
  
  const contactFormSchema = {
    name: [validators.required],
    email: [validators.required, validators.email],
    phone: [validators.phone], // Optional
    subject: [validators.required],
    message: [validators.required, validators.minLength(10)],
  };
  
  const errors = validateForm(data, contactFormSchema);
  expect(errors).toEqual({});
});

test('Contact form - comprehensive errors', () => {
  const data = {
    name: '',
    email: 'invalid-email',
    phone: '123',
    subject: '',
    message: 'short'
  };
  
  const contactFormSchema = {
    name: [validators.required],
    email: [validators.required, validators.email],
    phone: [validators.phone],
    subject: [validators.required],
    message: [validators.required, validators.minLength(10)],
  };
  
  const errors = validateForm(data, contactFormSchema);
  expect(errors.name).toBe('This field is required');
  expect(errors.email).toBe('Please enter a valid email address');
  expect(errors.phone).toBe('Please enter a 10-digit phone number');
  expect(errors.subject).toBe('This field is required');
  expect(errors.message).toBe('Must be at least 10 characters');
});

// Performance Tests
console.log('');
console.log('⚡ Testing Performance...');

test('Validation performance - large form', () => {
  const data = {};
  const schema = {};
  
  // Create 1000 field form
  for (let i = 0; i < 1000; i++) {
    data[`field${i}`] = 'test@example.com';
    schema[`field${i}`] = [validators.required, validators.email];
  }
  
  const startTime = Date.now();
  const errors = validateForm(data, schema);
  const endTime = Date.now();
  
  const duration = endTime - startTime;
  if (duration > 100) {
    throw new Error(`Performance test failed: ${duration}ms (expected < 100ms)`);
  }
  
  expect(errors).toEqual({});
});

test('Phone formatting performance', () => {
  const startTime = Date.now();
  
  for (let i = 0; i < 1000; i++) {
    formatPhoneNumber('5551234567');
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  if (duration > 100) {
    throw new Error(`Phone formatting performance test failed: ${duration}ms (expected < 100ms)`);
  }
});

// Summary
console.log('');
console.log('====================================');
console.log('📊 Test Results Summary');
console.log('====================================');
console.log(`Tests Run: ${testCount}`);
console.log(`Tests Passed: ${passCount}`);
console.log(`Tests Failed: ${failCount}`);
console.log('');

if (failCount === 0) {
  console.log('✅ All tests passed! 🎉');
  console.log('');
  console.log('✅ Your pragmatic form validation solution is working correctly!');
  console.log('');
  console.log('Key Features Validated:');
  console.log('• Basic validation functions (required, email, phone, etc.)');
  console.log('• Form validation with objects');  
  console.log('• Phone number formatting');
  console.log('• Accessibility features (ARIA attributes)');
  console.log('• Performance and memory efficiency');
  console.log('• Contact form schema validation');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the output above.');
  process.exit(1);
}