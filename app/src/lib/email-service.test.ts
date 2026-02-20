import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './email-service';

const ORIGINAL_ENV = { ...process.env };

const setBaseEnv = () => {
  process.env = {
    ...ORIGINAL_ENV,
    EMAIL_FROM: 'noreply@spicebushmontessori.org',
    EMAIL_FROM_NAME: 'Spicebush Montessori'
  };

  delete process.env.SENDGRID_API_KEY;
  delete process.env.SENDGRID_API_BASE_URL;
  delete process.env.SENDGRID_TIMEOUT_MS;
  delete process.env.UNIONE_API_KEY;
  delete process.env.UNIONE_REGION;
  delete process.env.EMAIL_SERVICE;
};

describe('EmailService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setBaseEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses SendGrid first by default when configured', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 202,
        headers: { 'x-message-id': 'sg-msg-123' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const service = new EmailService();
    const result = await service.send({
      to: 'family@example.com',
      subject: 'Welcome',
      text: 'Thanks for reaching out.'
    });

    expect(result).toEqual({
      success: true,
      provider: 'SendGrid',
      messageId: 'sg-msg-123'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(String((request.headers as Record<string, string>).Authorization)).toContain('SG.test-key');
  });

  it('falls back to Unione when SendGrid fails', async () => {
    process.env.EMAIL_SERVICE = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.test-key';
    process.env.UNIONE_API_KEY = 'unione-key';
    process.env.UNIONE_REGION = 'eu';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: [{ message: 'SendGrid rejected request' }] }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ job_id: 'unione-job-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const service = new EmailService();
    const result = await service.send({
      to: 'family@example.com',
      subject: 'Tour request',
      text: 'Thanks for contacting us.'
    });

    expect(result).toEqual({
      success: true,
      provider: 'Unione',
      messageId: 'unione-job-1'
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [secondUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(firstUrl).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(secondUrl).toBe('https://eu1.unione.io/en/transactional/api/v1/email/send.json');
  });

  it('returns a clear error when sender is missing', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key';
    delete process.env.EMAIL_FROM;

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const service = new EmailService();
    const result = await service.send({
      to: 'family@example.com',
      subject: 'Missing sender test',
      text: 'Body'
    });

    expect(result.success).toBe(false);
    expect(result.provider).toBe('SendGrid');
    expect(result.error).toContain('Sender email is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes preferred provider aliases', () => {
    process.env.EMAIL_SERVICE = 'send-grid';
    process.env.SENDGRID_API_KEY = 'SG.test-key';

    const service = new EmailService();
    expect(service.getPreferredProvider()).toBe('sendgrid');
  });
});
