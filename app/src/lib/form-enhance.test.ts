import { describe, expect, it, vi } from 'vitest';
import { enhanceForm } from './form-enhance';
import { validators } from './form-validation';

const createFormFixture = (): {
  form: HTMLFormElement;
  email: HTMLInputElement;
  name: HTMLInputElement;
  message: HTMLTextAreaElement;
  emailError: HTMLElement;
  nameError: HTMLElement;
} => {
  document.body.innerHTML = `
    <form id="contact-form">
      <input type="text" name="name" id="name" />
      <input type="email" name="email" id="email" />
      <textarea name="message" id="message"></textarea>
      <button type="submit">Submit</button>
    </form>
    <p id="name-error" style="display:none"></p>
    <p id="email-error" style="display:none"></p>
    <p id="message-error" style="display:none"></p>
  `;

  return {
    form: document.getElementById('contact-form') as HTMLFormElement,
    email: document.getElementById('email') as HTMLInputElement,
    name: document.getElementById('name') as HTMLInputElement,
    message: document.getElementById('message') as HTMLTextAreaElement,
    emailError: document.getElementById('email-error') as HTMLElement,
    nameError: document.getElementById('name-error') as HTMLElement
  };
};

describe('form-enhance', () => {
  it('initializes accessibility attributes for fields in schema', () => {
    const { form, email, name } = createFormFixture();

    enhanceForm(form, {
      validationSchema: {
        email: [validators.required, validators.email]
      }
    });

    expect(email.getAttribute('aria-describedby')).toBe('email-error');
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(name.getAttribute('aria-describedby')).toBeNull();
  });

  it('validates on blur and clears errors on input', () => {
    const { form, email, emailError } = createFormFixture();

    enhanceForm(form, {
      validationSchema: {
        email: [validators.required, validators.email]
      }
    });

    email.value = 'bad-email';
    email.dispatchEvent(new Event('blur', { bubbles: true }));

    expect(emailError.textContent).toBe('Please enter a valid email address');
    expect(emailError.style.display).toBe('block');
    expect(emailError.getAttribute('role')).toBe('alert');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.classList.contains('border-red-500')).toBe(true);

    email.value = 'person@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));

    expect(emailError.textContent).toBe('');
    expect(emailError.style.display).toBe('none');
    expect(email.getAttribute('aria-invalid')).toBe('false');
    expect(email.classList.contains('border-gray-300')).toBe(true);
  });

  it('prevents submit and focuses first invalid field', () => {
    const { form, name, email } = createFormFixture();
    const focusSpy = vi.spyOn(name, 'focus');

    enhanceForm(form, {
      validationSchema: {
        name: [validators.required],
        email: [validators.required, validators.email]
      }
    });

    name.value = '';
    email.value = 'invalid-email';

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const dispatchResult = form.dispatchEvent(submitEvent);

    expect(dispatchResult).toBe(false);
    expect(submitEvent.defaultPrevented).toBe(true);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-invalid')).toBe('true');
  });

  it('allows valid form submit without preventing default', () => {
    const { form, name, email } = createFormFixture();

    enhanceForm(form, {
      validationSchema: {
        name: [validators.required],
        email: [validators.required, validators.email]
      }
    });

    name.value = 'Ada';
    email.value = 'ada@example.com';

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const dispatchResult = form.dispatchEvent(submitEvent);

    expect(dispatchResult).toBe(true);
    expect(submitEvent.defaultPrevented).toBe(false);
  });

  it('supports custom displayError and optional blur validation', () => {
    const { form, email } = createFormFixture();
    const displayError = vi.fn();

    enhanceForm(form, {
      validationSchema: {
        email: [validators.required, validators.email]
      },
      validateOnBlur: false,
      displayError
    });

    email.value = 'invalid-email';
    email.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(displayError).not.toHaveBeenCalled();

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(displayError).toHaveBeenCalledWith('email', 'Please enter a valid email address');
    expect(submitEvent.defaultPrevented).toBe(true);
  });
});
