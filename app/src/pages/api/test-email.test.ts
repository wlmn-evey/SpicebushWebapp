import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: { content: { getAllSettings: vi.fn().mockResolvedValue({}) } }
}));

vi.mock('@lib/email-service', () => ({
  emailService: {
    send: vi.fn(),
    getStatus: vi.fn().mockReturnValue({}),
    getPreferredProvider: vi.fn().mockReturnValue(null)
  }
}));

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn()
}));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { emailService } from '@lib/email-service';
import { logServerError } from '@lib/server-logger';
import { GET, POST } from './test-email';

const makeContext = (request: Request) =>
  ({ request, locals: {} }) as unknown as Parameters<typeof POST>[0];

const postJson = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

describe('/api/test-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      session: null as never,
      user: { email: 'admin@spicebushmontessori.org' } as never
    });
    vi.mocked(emailService.send).mockResolvedValue({ success: true } as never);
  });

  it('refuses GET without sending mail', async () => {
    const response = await GET(
      makeContext(new Request('http://localhost/api/test-email?email=victim@example.com'))
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('sends to the requested address on POST', async () => {
    const response = await POST(makeContext(postJson({ email: 'qa@example.com' })));
    expect(response.status).toBe(200);
    expect(vi.mocked(emailService.send).mock.calls[0][0].to).toBe('qa@example.com');
  });

  it('requires admin auth on POST', async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: false,
      isAdmin: false,
      session: null as never,
      user: null
    });
    const response = await POST(makeContext(postJson({})));
    expect(response.status).toBe(403);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('returns a generic error and logs the detail when sending throws', async () => {
    vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP password rejected'));
    const response = await POST(makeContext(postJson({})));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to send test email');
    expect(JSON.stringify(body)).not.toContain('SMTP');
    expect(logServerError).toHaveBeenCalled();
  });
});
