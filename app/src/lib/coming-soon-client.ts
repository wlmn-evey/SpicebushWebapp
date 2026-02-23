const FORM_INITIALIZED_FLAG = 'comingSoonInitialized';
const ANCHOR_INITIALIZED_FLAG = 'comingSoonSmoothScrollInitialized';

type TurnstileWindow = Window & {
  turnstile?: {
    reset?: () => void;
  };
};

const parsePayload = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    const parsed = (await response.json()) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const initializeContactForm = (): void => {
  const form = document.getElementById('contact-form');
  if (!(form instanceof HTMLFormElement)) return;

  if (form.dataset[FORM_INITIALIZED_FLAG] === 'true') return;
  form.dataset[FORM_INITIALIZED_FLAG] = 'true';

  const submissionStartedAt = document.getElementById('coming-soon-submission-started-at');
  if (submissionStartedAt instanceof HTMLInputElement) {
    submissionStartedAt.value = Date.now().toString();
  }

  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const submitButton = form.querySelector('.submit-button');
  const buttonText = submitButton?.querySelector('.button-text');
  const loadingSpinner = submitButton?.querySelector('.loading');

  if (
    !(successMessage instanceof HTMLElement) ||
    !(errorMessage instanceof HTMLElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(buttonText instanceof HTMLElement) ||
    !(loadingSpinner instanceof HTMLElement)
  ) {
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline-block';
    submitButton.disabled = true;

    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
      const formData = new FormData(form);
      const body = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          body.append(key, value);
        }
      }

      const action = form.getAttribute('action') || window.location.pathname;
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      const payload = await parsePayload(response);
      const wasSuccessful = response.ok && payload.success === true;
      if (!wasSuccessful) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : `Form submission failed with status: ${response.status}`
        );
      }

      successMessage.style.display = 'block';
      form.reset();
      if (submissionStartedAt instanceof HTMLInputElement) {
        submissionStartedAt.value = Date.now().toString();
      }

      const turnstileApi = (window as TurnstileWindow).turnstile;
      if (typeof turnstileApi?.reset === 'function') {
        turnstileApi.reset();
      }

      successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 10000);
    } catch {
      errorMessage.style.display = 'block';
      errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
      submitButton.disabled = false;
    }
  });
};

const initializeSmoothScrolling = (): void => {
  const anchorLinks = Array.from(document.querySelectorAll('a[href^="#"]'));

  for (const anchor of anchorLinks) {
    if (!(anchor instanceof HTMLAnchorElement)) continue;
    if (anchor.dataset[ANCHOR_INITIALIZED_FLAG] === 'true') continue;
    anchor.dataset[ANCHOR_INITIALIZED_FLAG] = 'true';

    anchor.addEventListener('click', event => {
      event.preventDefault();

      const href = anchor.getAttribute('href');
      if (!href) return;

      const target = document.querySelector(href);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }
};

export const initComingSoonPage = (): void => {
  initializeContactForm();
  initializeSmoothScrolling();
};
