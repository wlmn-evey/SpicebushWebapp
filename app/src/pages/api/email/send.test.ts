import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/email-service', () => ({
  emailService: {
    send: vi.fn(),
    getStatus: vi.fn().mockReturnValue({}),
    getConfiguredProviderNames: vi.fn().mockReturnValue([]),
    getPreferredProvider: vi.fn().mockReturnValue(null)
  }
}));

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn()
}));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { emailService } from '@lib/email-service';
import { POST, GET } from './send';

const makeJsonRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

const adminLocals = { isAdmin: true, userId: 'admin-1', userEmail: 'admin@test.com' };

const makeContext = (request: Request) =>
  ({ request, locals: adminLocals }) as unknown as Parameters<typeof POST>[0];

describe('POST /api/email/send — error sanitization (P1 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      session: { userId: 'admin-1', userEmail: 'admin@test.com' } as never,
      user: null
    });
  });

  it('returns 403 for unauthenticated requests', async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: false,
      isAdmin: false,
      session: null,
      user: null
    });
    const request = makeJsonRequest({ to: 'a@b.com', subject: 'Hi', text: 'Hello' });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Admin access required');
  });

  it('returns 400 for missing required fields', async () => {
    const request = makeJsonRequest({ to: 'a@b.com' });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('does not leak internal error details in catch block response', async () => {
    // Simulate the email service throwing an unexpected error with sensitive info
    vi.mocked(emailService.send).mockRejectedValue(
      new Error('SMTP connection failed: auth credentials invalid for smtp.provider.com:587')
    );

    const request = makeJsonRequest({
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello'
    });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(500);

    const body = await response.json();

    // The error response must NOT contain internal details
    expect(body.error).toBe('Internal server error');
    expect(body.details).toBe('Internal error');

    // Verify no sensitive info leaked
    const responseText = JSON.stringify(body);
    expect(responseText).not.toContain('SMTP');
    expect(responseText).not.toContain('credentials');
    expect(responseText).not.toContain('smtp.provider.com');
    expect(responseText).not.toContain('587');
  });

  it('does not leak stack traces in error responses', async () => {
    const errorWithStack = new Error('DB connection pool exhausted');
    errorWithStack.stack = 'Error: DB connection pool exhausted\n    at Pool.connect (/app/node_modules/pg/lib/pool.js:123:11)';

    vi.mocked(emailService.send).mockRejectedValue(errorWithStack);

    const request = makeJsonRequest({
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello'
    });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(500);

    const body = await response.json();
    const responseText = JSON.stringify(body);

    expect(responseText).not.toContain('pool.js');
    expect(responseText).not.toContain('node_modules');
    expect(responseText).not.toContain('Pool.connect');
  });

  it('returns success with messageId for valid email sends', async () => {
    vi.mocked(emailService.send).mockResolvedValue({
      success: true,
      messageId: 'msg-abc-123',
      provider: 'resend'
    });

    const request = makeJsonRequest({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Hello World'
    });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg-abc-123');
    expect(body.provider).toBe('resend');
  });

  it('does not leak provider name or raw error in non-exception failure path', async () => {
    vi.mocked(emailService.send).mockResolvedValue({
      success: false,
      error: 'SMTP relay rejected: invalid sender domain for sendgrid account sg-12345',
      provider: 'sendgrid'
    });

    const request = makeJsonRequest({
      to: 'bad@example.com',
      subject: 'Test',
      html: '<p>Hello</p>'
    });
    const response = await POST(makeContext(request));
    expect(response.status).toBe(500);

    const body = await response.json();
    const responseText = JSON.stringify(body);

    // Must return a generic error — no provider name, no SMTP details, no account IDs
    expect(body.error).toBe('Failed to send email');
    expect(responseText).not.toContain('sendgrid');
    expect(responseText).not.toContain('SMTP');
    expect(responseText).not.toContain('sg-12345');
    expect(body.provider).toBeUndefined();
  });
});

describe('GET /api/email/send — auth gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: false,
      session: null,
      user: null
    });

    const request = new Request('http://localhost/api/email/send');
    const response = await GET({ request, locals: {} } as unknown as Parameters<typeof GET>[0]);
    expect(response.status).toBe(403);
  });
});
