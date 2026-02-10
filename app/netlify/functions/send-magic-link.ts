/**
 * Netlify Function: Send Admin Magic Link
 * Mirrors /api/auth/request-link behavior for legacy clients.
 */

import type { Handler } from '@netlify/functions';
import { requestAdminMagicLink } from '../../src/lib/auth/admin-session';
import { isAllowedAdminLoginEmail } from '../../src/lib/admin-config';

const getRequestUrl = (event: Parameters<Handler>[0]): string | undefined => {
  if (event.rawUrl) return event.rawUrl;

  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  if (!host) return undefined;

  return `${proto}://${host}`;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}') as { email?: string };

    if (typeof email !== 'string' || !email.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    if (!isAllowedAdminLoginEmail(email)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Email domain not authorized'
        })
      };
    }

    await requestAdminMagicLink({
      email,
      requestUrl: getRequestUrl(event),
      requestedIp: event.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
      userAgent: event.headers['user-agent'] || null
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'If your email is authorized, a sign-in link has been sent.'
      })
    };
  } catch (error) {
    console.error('Magic link error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to send magic link'
      })
    };
  }
};
