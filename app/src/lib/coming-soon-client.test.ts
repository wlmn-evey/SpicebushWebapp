import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initComingSoonPage } from './coming-soon-client';

let scrollIntoViewMock: ReturnType<typeof vi.fn>;

const createFormDom = (): HTMLFormElement => {
  document.body.innerHTML = `
    <form id="contact-form" action="/api/contact/submit">
      <input type="hidden" id="coming-soon-submission-started-at" name="submission-started-at" value="" />
      <input type="text" name="name" value="Ada Lovelace" />
      <input type="email" name="email" value="ada@example.com" />
      <button class="submit-button" type="submit">
        <span class="button-text">Send</span>
        <span class="loading" style="display:none">Loading</span>
      </button>
    </form>
    <div id="success-message" style="display:none">success</div>
    <div id="error-message" style="display:none">error</div>
    <a id="jump-link" href="#target">Jump</a>
    <div id="target">Target</div>
  `;

  return document.getElementById('contact-form') as HTMLFormElement;
};

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('coming-soon-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewMock
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('submits form successfully, resets turnstile, and hides success message later', async () => {
    const form = createFormDom();
    const fetchMock = vi.mocked(global.fetch);
    const turnstileReset = vi.fn();
    (window as Window & { turnstile?: { reset: () => void } }).turnstile = {
      reset: turnstileReset
    };

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    initComingSoonPage();

    const startedAt = document.getElementById('coming-soon-submission-started-at') as HTMLInputElement;
    expect(startedAt.value).not.toBe('');

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [action, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(action).toBe('/api/contact/submit');
    expect(options.method).toBe('POST');
    expect(String(options.body)).toContain('name=Ada+Lovelace');

    const successMessage = document.getElementById('success-message') as HTMLElement;
    const errorMessage = document.getElementById('error-message') as HTMLElement;
    await vi.waitFor(() => {
      expect(successMessage.style.display).toBe('block');
    });
    expect(errorMessage.style.display).toBe('none');
    expect(turnstileReset).toHaveBeenCalledTimes(1);

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
    const hideCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 10000);
    const hideCallback = hideCall?.[0];
    expect(hideCall).toBeTruthy();
    if (typeof hideCallback === 'function') {
      hideCallback();
    }
    expect(successMessage.style.display).toBe('none');

    const submitButton = form.querySelector('.submit-button') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });

  it('shows error state when submission fails', async () => {
    const form = createFormDom();
    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server failure' })
    } as Response);

    initComingSoonPage();

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    const successMessage = document.getElementById('success-message') as HTMLElement;
    const errorMessage = document.getElementById('error-message') as HTMLElement;

    expect(successMessage.style.display).toBe('none');
    await vi.waitFor(() => {
      expect(errorMessage.style.display).toBe('block');
    });
  });

  it('only initializes form and anchor listeners once across repeated init calls', async () => {
    const form = createFormDom();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    initComingSoonPage();
    initComingSoonPage();

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    const link = document.getElementById('jump-link') as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    expect(link.dataset.comingSoonSmoothScrollInitialized).toBe('true');
  });

  it('handles missing contact form without throwing', () => {
    document.body.innerHTML = '<div id="target"></div>';
    expect(() => initComingSoonPage()).not.toThrow();
  });
});
