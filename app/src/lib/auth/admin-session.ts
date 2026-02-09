import { createHash, randomBytes } from 'node:crypto';
import { isAdminEmail } from '@lib/admin-config';
import { emailService } from '@lib/email-service';
import { query, queryFirst, withTransaction } from '@lib/db/client';

const MAGIC_LINK_TTL_MINUTES = 15;
const MAGIC_LINK_RATE_LIMIT_WINDOW_MINUTES = 5;
const MAGIC_LINK_RATE_LIMIT_MAX = 5;
const SESSION_TTL_HOURS = 12;
const SESSION_TOUCH_INTERVAL_MINUTES = 15;

export const ADMIN_SESSION_COOKIE_NAME = 'sbms-admin-session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_HOURS * 60 * 60;

type SessionRow = {
  id: number;
  email: string;
  last_seen_at: Date | string;
};

type RateLimitRow = {
  request_count: number;
};

export interface AdminSessionIdentity {
  sessionId: string;
  email: string;
}

export interface RequestMagicLinkParams {
  email: string;
  requestUrl?: string;
  requestedIp?: string | null;
  userAgent?: string | null;
}

export interface ConsumeMagicLinkParams {
  token: string;
  requestedIp?: string | null;
  userAgent?: string | null;
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const hashToken = (value: string): string => createHash('sha256').update(value).digest('hex');

const createRawToken = (): string => randomBytes(32).toString('hex');

const parseTime = (value: Date | string): number => {
  if (value instanceof Date) return value.getTime();
  return Date.parse(value);
};

const shouldTouchSession = (lastSeen: Date | string): boolean => {
  const timestamp = parseTime(lastSeen);
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp > SESSION_TOUCH_INTERVAL_MINUTES * 60_000;
};

const getSiteOrigin = (requestUrl?: string): string => {
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // Fall through to environment values.
    }
  }

  const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const configured = runtimeEnv?.PUBLIC_SITE_URL || runtimeEnv?.URL;

  if (configured && typeof configured === 'string') {
    return configured.replace(/\/$/, '');
  }

  return 'https://spicebushmontessori.org';
};

const sendMagicLinkEmail = async (email: string, loginUrl: string): Promise<void> => {
  const subject = 'Your Spicebush Montessori admin login link';
  const text = `Use this secure link to access the admin dashboard:\n\n${loginUrl}\n\nThis link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`;
  const html = `
    <p>Use this secure link to access the Spicebush Montessori admin dashboard.</p>
    <p><a href="${loginUrl}" style="color:#1f684d;font-weight:600;">Sign in now</a></p>
    <p>This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.</p>
    <p>If you did not request this login link, you can ignore this email.</p>
  `;

  const result = await emailService.send({ to: email, subject, text, html });
  if (!result.success) {
    throw new Error(result.error || 'Failed to deliver admin login email');
  }
};

const isRateLimited = async (email: string): Promise<boolean> => {
  const row = await queryFirst<RateLimitRow>(
    `
      SELECT COUNT(*)::int AS request_count
      FROM admin_login_tokens
      WHERE email = $1
        AND created_at > now() - $2::interval
    `,
    [email, `${MAGIC_LINK_RATE_LIMIT_WINDOW_MINUTES} minutes`]
  );

  const count = Number(row?.request_count ?? 0);
  return count >= MAGIC_LINK_RATE_LIMIT_MAX;
};

export async function requestAdminMagicLink({
  email,
  requestUrl,
  requestedIp = null,
  userAgent = null
}: RequestMagicLinkParams): Promise<{ accepted: boolean; delivered: boolean }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { accepted: false, delivered: false };
  }

  if (!isAdminEmail(normalizedEmail)) {
    return { accepted: false, delivered: false };
  }

  if (await isRateLimited(normalizedEmail)) {
    return { accepted: true, delivered: false };
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);

  await query(
    `
      INSERT INTO admin_login_tokens (email, token_hash, requested_ip, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, now() + $5::interval)
    `,
    [normalizedEmail, tokenHash, requestedIp, userAgent, `${MAGIC_LINK_TTL_MINUTES} minutes`]
  );

  const loginUrl = `${getSiteOrigin(requestUrl)}/auth/login?token=${encodeURIComponent(rawToken)}`;
  await sendMagicLinkEmail(normalizedEmail, loginUrl);

  return { accepted: true, delivered: true };
}

export async function consumeAdminMagicLink({
  token,
  requestedIp = null,
  userAgent = null
}: ConsumeMagicLinkParams): Promise<{ sessionToken: string; email: string } | null> {
  if (!token || token.length < 32) {
    return null;
  }

  const tokenHash = hashToken(token);

  return withTransaction(async (client) => {
    const consumed = await client.query<{ email: string }>(
      `
        UPDATE admin_login_tokens
        SET used_at = now()
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > now()
        RETURNING email
      `,
      [tokenHash]
    );

    const email = consumed.rows[0]?.email;
    if (!email || !isAdminEmail(email)) {
      return null;
    }

    const sessionToken = createRawToken();
    const sessionHash = hashToken(sessionToken);

    await client.query(
      `
        INSERT INTO admin_auth_sessions (session_hash, email, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, now() + $5::interval)
      `,
      [sessionHash, email, requestedIp, userAgent, `${SESSION_TTL_HOURS} hours`]
    );

    return { sessionToken, email };
  });
}

export async function validateAdminSession(token: string | null | undefined): Promise<AdminSessionIdentity | null> {
  if (!token) {
    return null;
  }

  const sessionHash = hashToken(token);
  const row = await queryFirst<SessionRow>(
    `
      SELECT id, email, last_seen_at
      FROM admin_auth_sessions
      WHERE session_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `,
    [sessionHash]
  );

  if (!row) {
    return null;
  }

  if (!isAdminEmail(row.email)) {
    await query(
      `
        UPDATE admin_auth_sessions
        SET revoked_at = now()
        WHERE id = $1
      `,
      [row.id]
    );
    return null;
  }

  if (shouldTouchSession(row.last_seen_at)) {
    await query(
      `
        UPDATE admin_auth_sessions
        SET last_seen_at = now()
        WHERE id = $1
      `,
      [row.id]
    );
  }

  return {
    sessionId: String(row.id),
    email: row.email
  };
}

export async function revokeAdminSession(token: string | null | undefined): Promise<void> {
  if (!token) {
    return;
  }

  await query(
    `
      UPDATE admin_auth_sessions
      SET revoked_at = now()
      WHERE session_hash = $1
        AND revoked_at IS NULL
    `,
    [hashToken(token)]
  );
}
