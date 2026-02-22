import { queryFirst } from '@lib/db/client';
import { logServerWarn } from '@lib/server-logger';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const resolveRequestIp = (
  request: Request,
  locals: Record<string, unknown> = {}
): string | null => {
  const netlify = locals.netlify as { context?: { ip?: string } } | undefined;
  if (netlify?.context?.ip) {
    return netlify.context.ip.trim();
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  const first = forwarded.split(',')[0]?.trim();
  return first || null;
};

const asInteger = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  return '';
};

const parseStartedAt = (value: unknown): number | null => {
  const parsed = asInteger(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export const isSubmissionTooFast = (
  startedAtValue: unknown,
  options?: { nowMs?: number; minimumMs?: number }
): boolean => {
  const startedAt = parseStartedAt(startedAtValue);
  if (!startedAt) return false;

  const nowMs = options?.nowMs ?? Date.now();
  const minimumMs = options?.minimumMs ?? 3_000;

  if (!Number.isFinite(nowMs) || nowMs <= 0) return false;
  return nowMs - startedAt < minimumMs;
};

type TurnstileResponse = {
  success?: boolean;
  'error-codes'?: unknown;
};

export const verifyTurnstileToken = async (input: {
  token: string;
  remoteIp?: string | null;
}): Promise<{ success: boolean; reason?: string }> => {
  const token = asString(input.token);
  if (!token) return { success: false, reason: 'missing_token' };

  const secret = asString(process.env.TURNSTILE_SECRET_KEY);
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, reason: 'bypassed_without_secret_non_production' };
    }
    return { success: false, reason: 'missing_secret' };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (input.remoteIp) {
      body.set('remoteip', input.remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) {
      return { success: false, reason: `http_${response.status}` };
    }

    const payload = (await response.json().catch(() => ({}))) as TurnstileResponse;
    if (payload.success === true) {
      return { success: true };
    }

    const errors = Array.isArray(payload['error-codes'])
      ? payload['error-codes'].map((entry) => asString(entry)).filter(Boolean)
      : [];
    if (errors.length > 0) {
      return { success: false, reason: errors.join(',') };
    }

    return { success: false, reason: 'verification_failed' };
  } catch (error) {
    logServerWarn('Turnstile verification request failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return { success: false, reason: 'verification_exception' };
  }
};

export const checkContactSubmissionRateLimit = async (input: {
  ipAddress: string | null;
  email: string;
  windowMinutes?: number;
  maxPerIp?: number;
  maxPerEmail?: number;
}): Promise<{
  blocked: boolean;
  reason?: 'ip' | 'email';
  ipCount: number;
  emailCount: number;
}> => {
  const windowMinutes = Math.max(1, Math.min(120, input.windowMinutes ?? 15));
  const maxPerIp = Math.max(1, Math.min(100, input.maxPerIp ?? 5));
  const maxPerEmail = Math.max(1, Math.min(100, input.maxPerEmail ?? 4));
  const email = asString(input.email).toLowerCase();
  const ipAddress = asString(input.ipAddress);

  const counts = await queryFirst<{ ip_count: number; email_count: number }>(
    `
      SELECT
        CASE
          WHEN $1::text = '' THEN 0
          ELSE (
            SELECT COUNT(*)::int
            FROM contact_form_submissions
            WHERE ip_address = $1
              AND submitted_at >= NOW() - ($3::int * INTERVAL '1 minute')
          )
        END AS ip_count,
        CASE
          WHEN $2::text = '' THEN 0
          ELSE (
            SELECT COUNT(*)::int
            FROM contact_form_submissions
            WHERE LOWER(email) = LOWER($2)
              AND submitted_at >= NOW() - ($3::int * INTERVAL '1 minute')
          )
        END AS email_count
    `,
    [ipAddress, email, windowMinutes]
  );

  const ipCount = asInteger(counts?.ip_count);
  const emailCount = asInteger(counts?.email_count);

  if (ipAddress && ipCount >= maxPerIp) {
    return {
      blocked: true,
      reason: 'ip',
      ipCount,
      emailCount
    };
  }

  if (email && emailCount >= maxPerEmail) {
    return {
      blocked: true,
      reason: 'email',
      ipCount,
      emailCount
    };
  }

  return {
    blocked: false,
    ipCount,
    emailCount
  };
};
