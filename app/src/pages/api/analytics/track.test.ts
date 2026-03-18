import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/db/analytics', () => ({
  recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined)
}));

import { recordAnalyticsEvent } from '@lib/db/analytics';
import { GET, POST } from './track';

const makeRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });

const makeContext = (request: Request, clientAddress = '127.0.0.1') =>
  ({ request, clientAddress }) as Parameters<typeof POST>[0];

describe('POST /api/analytics/track', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid analytics events with 204', async () => {
    const request = makeRequest({ eventName: 'page_view' });
    const response = await POST(makeContext(request, '10.0.0.1'));
    expect(response.status).toBe(204);
    expect(recordAnalyticsEvent).toHaveBeenCalledOnce();
  });

  it('rejects non-JSON content type with 415', async () => {
    const request = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json'
    });
    const response = await POST(makeContext(request, '10.0.0.2'));
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.error).toBe('Expected JSON body');
  });

  it('rejects invalid JSON with 400', async () => {
    const request = new Request('http://localhost/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{broken'
    });
    const response = await POST(makeContext(request, '10.0.0.3'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('rejects missing eventName with 400', async () => {
    const request = makeRequest({});
    const response = await POST(makeContext(request, '10.0.0.4'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid eventName');
  });

  it('rejects eventName with invalid characters', async () => {
    const request = makeRequest({ eventName: '<script>alert(1)</script>' });
    const response = await POST(makeContext(request, '10.0.0.5'));
    expect(response.status).toBe(400);
  });

  it('rejects empty eventName', async () => {
    const request = makeRequest({ eventName: '' });
    const response = await POST(makeContext(request, '10.0.0.6'));
    expect(response.status).toBe(400);
  });

  it('rejects eventName with spaces', async () => {
    const request = makeRequest({ eventName: 'has spaces' });
    const response = await POST(makeContext(request, '10.0.0.7'));
    expect(response.status).toBe(400);
  });

  it('accepts valid eventName patterns (colons, hyphens, underscores)', async () => {
    const request = makeRequest({ eventName: 'page:view_count-total' });
    const response = await POST(makeContext(request, '10.0.0.8'));
    expect(response.status).toBe(204);
  });

  it('passes optional fields to recordAnalyticsEvent', async () => {
    const request = makeRequest({
      eventName: 'test_event',
      eventCategory: 'conversion',
      pagePath: '/about',
      pageUrl: 'https://example.com/about',
      referrerUrl: 'https://google.com',
      sessionId: 'sess-123',
      clientId: 'client-456',
      eventValue: 42,
      properties: { source: 'organic' }
    });
    const response = await POST(makeContext(request, '10.0.0.9'));
    expect(response.status).toBe(204);

    expect(recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'test_event',
        eventCategory: 'conversion',
        pagePath: '/about',
        eventValue: 42
      })
    );
  });

  describe('rate limiting (P1 security fix)', () => {
    it('returns 429 after exceeding 100 requests from the same IP', async () => {
      const testIp = '192.168.99.1';

      // Send 100 requests — all should succeed
      for (let i = 0; i < 100; i++) {
        const request = makeRequest({ eventName: 'rate_test' });
        const response = await POST(makeContext(request, testIp));
        expect(response.status).toBe(204);
      }

      // The 101st request should be rate-limited
      const blockedRequest = makeRequest({ eventName: 'rate_test' });
      const blockedResponse = await POST(makeContext(blockedRequest, testIp));
      expect(blockedResponse.status).toBe(429);

      const body = await blockedResponse.json();
      expect(body.error).toBe('Too many requests');
    });

    it('includes Retry-After header in 429 response', async () => {
      const testIp = '192.168.99.2';

      // Exhaust the limit
      for (let i = 0; i < 101; i++) {
        const request = makeRequest({ eventName: 'rate_test' });
        await POST(makeContext(request, testIp));
      }

      const blockedRequest = makeRequest({ eventName: 'rate_test' });
      const blockedResponse = await POST(makeContext(blockedRequest, testIp));
      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.headers.get('Retry-After')).toBe('60');
    });

    it('does not rate limit different IPs independently', async () => {
      const ipA = '10.1.1.1';
      const ipB = '10.1.1.2';

      // Send 100 from IP A
      for (let i = 0; i < 100; i++) {
        const request = makeRequest({ eventName: 'rate_test' });
        await POST(makeContext(request, ipA));
      }

      // IP B should still be allowed
      const requestB = makeRequest({ eventName: 'rate_test' });
      const responseB = await POST(makeContext(requestB, ipB));
      expect(responseB.status).toBe(204);
    });

    it('uses x-forwarded-for header for IP resolution', async () => {
      const forwardedIp = '203.0.113.50';

      // Exhaust the limit using x-forwarded-for
      for (let i = 0; i < 101; i++) {
        const request = makeRequest(
          { eventName: 'rate_test' },
          { 'x-forwarded-for': forwardedIp }
        );
        await POST(makeContext(request, '127.0.0.1'));
      }

      // Next request from same forwarded IP should be blocked
      const blockedRequest = makeRequest(
        { eventName: 'rate_test' },
        { 'x-forwarded-for': forwardedIp }
      );
      const blockedResponse = await POST(makeContext(blockedRequest, '127.0.0.1'));
      expect(blockedResponse.status).toBe(429);
    });

    it('does not call recordAnalyticsEvent when rate limited', async () => {
      const testIp = '192.168.99.3';
      vi.mocked(recordAnalyticsEvent).mockClear();

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        const request = makeRequest({ eventName: 'rate_test' });
        await POST(makeContext(request, testIp));
      }

      const callCountBeforeBlock = vi.mocked(recordAnalyticsEvent).mock.calls.length;

      // This should be blocked before reaching the DB
      const blockedRequest = makeRequest({ eventName: 'rate_test' });
      await POST(makeContext(blockedRequest, testIp));

      expect(vi.mocked(recordAnalyticsEvent).mock.calls.length).toBe(callCountBeforeBlock);
    });
  });
});

describe('GET /api/analytics/track', () => {
  it('returns 405 Method Not Allowed', async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toBe('Method not allowed');
  });
});
