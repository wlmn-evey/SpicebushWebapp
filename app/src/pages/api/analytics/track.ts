import type { APIRoute } from 'astro';
import { recordAnalyticsEvent } from '@lib/db/analytics';
import { resolveRequestIp } from '@lib/form-security';

const EVENT_NAME_PATTERN = /^[a-z0-9][a-z0-9:_-]{1,79}$/i;

// In-memory IP-based rate limiter (resets on cold start — acceptable for serverless)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // max events per IP per window

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const requestIp = resolveRequestIp(request, locals as Record<string, unknown>) || clientAddress || 'unknown';

  if (isRateLimited(requestIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
    });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Expected JSON body' }), {
      status: 415,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = asRecord(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const eventName = asString(payload.eventName);
  if (!eventName || !EVENT_NAME_PATTERN.test(eventName)) {
    return new Response(JSON.stringify({ error: 'Invalid eventName' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ipAddress = requestIp !== 'unknown' ? requestIp : null;
  const userAgent = asString(request.headers.get('user-agent'));

  await recordAnalyticsEvent({
    eventName,
    eventCategory: asString(payload.eventCategory),
    pagePath: asString(payload.pagePath),
    pageUrl: asString(payload.pageUrl),
    referrerUrl: asString(payload.referrerUrl),
    sessionId: asString(payload.sessionId),
    clientId: asString(payload.clientId),
    eventValue: asOptionalNumber(payload.eventValue),
    properties: asRecord(payload.properties),
    ipAddress,
    userAgent
  });

  return new Response(null, { status: 204 });
};

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
