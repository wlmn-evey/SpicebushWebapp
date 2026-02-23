import { describe, expect, it } from 'vitest';
import {
  formatPhoneNumber,
  getFieldProps,
  validateField,
  validateForm,
  validators
} from './form-validation';

describe('form-validation helpers', () => {
  it('validates required, email, and phone fields', () => {
    expect(validators.required('')).toBe('This field is required');
    expect(validators.required('  value  ')).toBeNull();

    expect(validators.email('')).toBeNull();
    expect(validators.email('person@example.com')).toBeNull();
    expect(validators.email('invalid-email')).toBe('Please enter a valid email address');

    expect(validators.phone('')).toBeNull();
    expect(validators.phone('(555) 111-2222')).toBeNull();
    expect(validators.phone('555-111')).toBe('Please enter a 10-digit phone number');
  });

  it('supports min/max length, pattern, matches, and min value', () => {
    expect(validators.minLength(3)('ab')).toBe('Must be at least 3 characters');
    expect(validators.minLength(3)('abc')).toBeNull();

    expect(validators.maxLength(5)('abcdef')).toBe('Must be no more than 5 characters');
    expect(validators.maxLength(5)('abc')).toBeNull();

    expect(validators.pattern(/^abc$/, 'Bad format')('abd')).toBe('Bad format');
    expect(validators.pattern(/^abc$/, 'Bad format')('abc')).toBeNull();

    expect(validators.minValue(10)('9')).toBe('Must be at least 10');
    expect(validators.minValue(10)('10')).toBeNull();
    expect(validators.minValue(10)('')).toBeNull();

    const getPassword = () => 'secret';
    expect(validators.matches('password', getPassword)('other')).toBe('Must match password');
    expect(validators.matches('password', getPassword)('secret')).toBeNull();
  });

  it('returns first field error and validates schema with record input', () => {
    const firstError = validateField('abc', [validators.minLength(5), validators.maxLength(10)]);
    expect(firstError).toBe('Must be at least 5 characters');

    const noError = validateField('abcdef', [validators.minLength(5), validators.maxLength(10)]);
    expect(noError).toBeNull();

    const errors = validateForm(
      {
        name: '  ',
        email: 'bad-email',
        message: 'hello world'
      },
      {
        name: [validators.required],
        email: [validators.required, validators.email],
        message: [validators.required, validators.minLength(10)]
      }
    );

    expect(errors).toEqual({
      name: 'This field is required',
      email: 'Please enter a valid email address'
    });
  });

  it('validates schema with FormData input', () => {
    const formData = new FormData();
    formData.set('name', 'Ada');
    formData.set('email', 'ada@example.com');
    formData.set('message', 'Short');

    const errors = validateForm(formData, {
      name: [validators.required],
      email: [validators.required, validators.email],
      message: [validators.minLength(10)]
    });

    expect(errors).toEqual({
      message: 'Must be at least 10 characters'
    });
  });

  it('formats phone numbers and field props for accessibility', () => {
    expect(formatPhoneNumber('5551112222')).toBe('(555) 111-2222');
    expect(formatPhoneNumber('5551112')).toBe('5551112');

    expect(getFieldProps('email', { email: 'Invalid email' })).toEqual({
      'aria-invalid': 'true',
      'aria-describedby': 'email-error'
    });

    expect(getFieldProps('email', {})).toEqual({
      'aria-invalid': undefined,
      'aria-describedby': undefined
    });
  });
});
