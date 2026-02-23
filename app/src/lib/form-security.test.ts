import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/db/client', () => ({
  queryFirst: vi.fn()
}));

vi.mock('@lib/server-logger', () => ({
  logServerWarn: vi.fn()
}));

import { queryFirst } from '@lib/db/client';
import { logServerWarn } from '@lib/server-logger';
import {
  checkContactSubmissionRateLimit,
  isSubmissionTooFast,
  resolveRequestIp,
  verifyTurnstileToken
} from './form-security';

const queryFirstMock = vi.mocked(queryFirst);
const logServerWarnMock = vi.mocked(logServerWarn);

describe('form-security', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    vi.unstubAllGlobals();
    queryFirstMock.mockReset();
    logServerWarnMock.mockReset();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalTurnstileSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY;
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
    }
  });

  it('resolves request IP from Netlify context or forwarded header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.9' }
    });

    expect(resolveRequestIp(request, { netlify: { context: { ip: ' 203.0.113.5 ' } } })).toBe(
      '203.0.113.5'
    );
    expect(resolveRequestIp(request)).toBe('198.51.100.1');
    expect(resolveRequestIp(new Request('http://localhost'))).toBeNull();
  });

  it('flags too-fast submissions using configurable threshold', () => {
    expect(isSubmissionTooFast('1000', { nowMs: 3000, minimumMs: 3000 })).toBe(true);
    expect(isSubmissionTooFast('1000', { nowMs: 5001, minimumMs: 3000 })).toBe(false);
    expect(isSubmissionTooFast('not-a-number', { nowMs: 2000 })).toBe(false);
    expect(isSubmissionTooFast(1000, { nowMs: Number.NaN })).toBe(false);
  });

  it('verifies Turnstile token through bypass and API paths', async () => {
    expect(await verifyTurnstileToken({ token: '' })).toEqual({
      success: false,
      reason: 'missing_token'
    });

    process.env.NODE_ENV = 'development';
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(verifyTurnstileToken({ token: 'abc' })).resolves.toEqual({
      success: true,
      reason: 'bypassed_without_secret_non_production'
    });

    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(verifyTurnstileToken({ token: 'abc' })).resolves.toEqual({
      success: false,
      reason: 'missing_secret'
    });

    process.env.TURNSTILE_SECRET_KEY = 'secret-key';

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyTurnstileToken({ token: 'token-1', remoteIp: '203.0.113.9' })
    ).resolves.toEqual({ success: true });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(String(options.body)).toContain('secret=secret-key');
    expect(String(options.body)).toContain('response=token-1');
    expect(String(options.body)).toContain('remoteip=203.0.113.9');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'error-codes': ['timeout-or-duplicate', 'invalid-input-response'] })
    });

    await expect(verifyTurnstileToken({ token: 'token-2' })).resolves.toEqual({
      success: false,
      reason: 'timeout-or-duplicate,invalid-input-response'
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({})
    });

    await expect(verifyTurnstileToken({ token: 'token-3' })).resolves.toEqual({
      success: false,
      reason: 'http_503'
    });

    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(verifyTurnstileToken({ token: 'token-4' })).resolves.toEqual({
      success: false,
      reason: 'verification_exception'
    });

    expect(logServerWarnMock).toHaveBeenCalledWith('Turnstile verification request failed', {
      error: 'network down'
    });
  });

  it('applies contact submission rate limits by IP and email', async () => {
    queryFirstMock.mockResolvedValueOnce({ ip_count: 5, email_count: 1 });

    await expect(
      checkContactSubmissionRateLimit({
        ipAddress: '198.51.100.4',
        email: 'person@example.com',
        maxPerIp: 5,
        maxPerEmail: 10
      })
    ).resolves.toEqual({
      blocked: true,
      reason: 'ip',
      ipCount: 5,
      emailCount: 1
    });

    queryFirstMock.mockResolvedValueOnce({ ip_count: 0, email_count: 4 });

    await expect(
      checkContactSubmissionRateLimit({
        ipAddress: '198.51.100.4',
        email: 'person@example.com',
        maxPerIp: 10,
        maxPerEmail: 4
      })
    ).resolves.toEqual({
      blocked: true,
      reason: 'email',
      ipCount: 0,
      emailCount: 4
    });

    queryFirstMock.mockResolvedValueOnce({ ip_count: 2, email_count: 2 });

    await expect(
      checkContactSubmissionRateLimit({
        ipAddress: ' 198.51.100.8 ',
        email: ' USER@EXAMPLE.COM ',
        windowMinutes: 500,
        maxPerIp: 1000,
        maxPerEmail: 0
      })
    ).resolves.toEqual({
      blocked: true,
      reason: 'email',
      ipCount: 2,
      emailCount: 2
    });

    const [, params] = queryFirstMock.mock.calls[2] as [string, unknown[]];
    expect(params).toEqual(['198.51.100.8', 'user@example.com', 120]);

    queryFirstMock.mockResolvedValueOnce({ ip_count: 0, email_count: 0 });

    await expect(
      checkContactSubmissionRateLimit({
        ipAddress: null,
        email: '',
        windowMinutes: 0,
        maxPerIp: 0,
        maxPerEmail: 0
      })
    ).resolves.toEqual({
      blocked: false,
      ipCount: 0,
      emailCount: 0
    });

    const [, minimumParams] = queryFirstMock.mock.calls[3] as [string, unknown[]];
    expect(minimumParams).toEqual(['', '', 1]);
  });
});
