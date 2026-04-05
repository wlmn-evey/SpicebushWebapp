import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/db/analytics', () => ({
  recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@lib/db/contact-submissions', () => ({
  insertContactSubmission: vi.fn().mockResolvedValue('submission-1')
}));

vi.mock('@lib/contact-email', () => ({
  sendContactSubmissionEmails: vi.fn().mockResolvedValue({
    notificationSent: true,
    confirmationSent: true,
    notifiedRecipients: ['admin@test.com'],
    errors: []
  })
}));

vi.mock('@lib/form-security', () => ({
  checkContactSubmissionRateLimit: vi
    .fn()
    .mockResolvedValue({ blocked: false, ipCount: 0, emailCount: 0 }),
  isSubmissionTooFast: vi.fn().mockReturnValue(false),
  resolveRequestIp: vi.fn().mockReturnValue('127.0.0.1'),
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn(),
  logServerWarn: vi.fn()
}));

import { checkContactSubmissionRateLimit, verifyTurnstileToken } from '@lib/form-security';
import { POST } from './submit';

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
};

const makeRequest = (formData: FormData) =>
  new Request('http://localhost/api/contact/submit', {
    method: 'POST',
    body: formData
  });

const makeContext = (request: Request) => {
  const redirectFn = (url: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: url }
    });

  return {
    request,
    redirect: redirectFn,
    locals: {}
  } as unknown as Parameters<typeof POST>[0];
};

const validContactFields = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Enrollment Question',
  message: 'I have a question about enrollment.',
  source: 'contact',
  'cf-turnstile-response': 'valid-token'
};

describe('POST /api/contact/submit — error code specificity (P2 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true });
    vi.mocked(checkContactSubmissionRateLimit).mockResolvedValue({
      blocked: false,
      ipCount: 0,
      emailCount: 0
    });
  });

  it('redirects to success page on valid contact submission', async () => {
    const fd = makeFormData(validContactFields);
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact-success');
  });

  it('redirects with error=missing-fields when required fields are absent', async () => {
    const fd = makeFormData({
      name: '',
      email: 'jane@example.com',
      message: 'Hi',
      source: 'contact',
      'cf-turnstile-response': 'valid-token'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact?error=missing-fields');
  });

  it('redirects with error=invalid-email for invalid email format', async () => {
    const fd = makeFormData({
      ...validContactFields,
      email: 'not-an-email'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact?error=invalid-email');
  });

  it('redirects with error=captcha-failed when turnstile verification fails', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
      reason: 'token-expired'
    });

    const fd = makeFormData(validContactFields);
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact?error=captcha-failed');
  });

  it('redirects with error=rate-limited when submission is rate-limited', async () => {
    vi.mocked(checkContactSubmissionRateLimit).mockResolvedValue({
      blocked: true,
      reason: 'ip',
      ipCount: 10,
      emailCount: 3
    });

    const fd = makeFormData(validContactFields);
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact?error=rate-limited');
  });

  it('uses source-specific error redirect for camp submissions', async () => {
    const fd = makeFormData({
      ...validContactFields,
      name: '',
      source: 'camp'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/camp?error=missing-fields');
  });

  it('uses source-specific error redirect for coming-soon submissions', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
      reason: 'missing'
    });

    const fd = makeFormData({
      'parent-name': 'Parent',
      email: 'parent@example.com',
      source: 'coming-soon',
      'cf-turnstile-response': ''
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/coming-soon?error=captcha-failed');
  });

  it('returns JSON error with 400 for missing fields in JSON mode', async () => {
    const fd = makeFormData({
      name: '',
      email: 'test@example.com',
      message: 'Hello',
      source: 'contact',
      response: 'json',
      'cf-turnstile-response': 'valid-token'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('name');
  });

  it('returns JSON error with 429 for rate limiting in JSON mode', async () => {
    vi.mocked(checkContactSubmissionRateLimit).mockResolvedValue({
      blocked: true,
      reason: 'email',
      ipCount: 2,
      emailCount: 15
    });

    const fd = makeFormData({
      ...validContactFields,
      response: 'json'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('wait');
  });

  it('returns generic server error in JSON mode when unexpected error occurs', async () => {
    vi.mocked(verifyTurnstileToken).mockRejectedValue(new Error('Network timeout'));

    const fd = makeFormData({
      ...validContactFields,
      response: 'json'
    });
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    // Should not leak internal error message
    expect(body.error).not.toContain('Network timeout');
  });

  it('redirects with error=server-error (default code) for unexpected errors', async () => {
    vi.mocked(verifyTurnstileToken).mockRejectedValue(new Error('DB down'));

    const fd = makeFormData(validContactFields);
    const response = await POST(makeContext(makeRequest(fd)));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/contact?error=server-error');
  });
});
