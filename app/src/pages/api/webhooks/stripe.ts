import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { handleStripeDonationWebhook } from '@lib/donation-thank-you';
import { logServerError, logServerWarn } from '@lib/server-logger';

const SIGNATURE_TOLERANCE_SECONDS = 300;

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseStripeSignatureHeader = (headerValue: string): Record<string, string[]> => {
  const parsed: Record<string, string[]> = {};
  headerValue
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [key, value] = segment.split('=', 2);
      if (!key || !value) return;
      if (!parsed[key]) parsed[key] = [];
      parsed[key].push(value);
    });
  return parsed;
};

const safeHexEquals = (leftHex: string, rightHex: string): boolean => {
  try {
    const left = Buffer.from(leftHex, 'hex');
    const right = Buffer.from(rightHex, 'hex');
    if (left.length === 0 || right.length === 0) return false;
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const verifyStripeSignature = (input: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
}): { valid: boolean; reason?: string } => {
  const signature = parseStripeSignatureHeader(input.signatureHeader);
  const timestampRaw = signature.t?.[0];
  const candidates = signature.v1 ?? [];

  if (!timestampRaw || candidates.length === 0) {
    return { valid: false, reason: 'missing_signature_parts' };
  }

  const timestamp = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: 'invalid_signature_timestamp' };
  }

  const currentUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(currentUnix - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'signature_timestamp_out_of_range' };
  }

  const signedPayload = `${timestampRaw}.${input.rawBody}`;
  const expected = createHmac('sha256', input.secret).update(signedPayload, 'utf8').digest('hex');
  const matched = candidates.some((candidate) => safeHexEquals(candidate, expected));

  return matched ? { valid: true } : { valid: false, reason: 'signature_mismatch' };
};

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    logServerWarn('Stripe webhook called without STRIPE_WEBHOOK_SECRET configured', {
      route: '/api/webhooks/stripe'
    });
    return jsonResponse(503, { error: 'Webhook secret is not configured' });
  }

  const signatureHeader = request.headers.get('stripe-signature');
  if (!signatureHeader) {
    return jsonResponse(400, { error: 'Missing Stripe signature header' });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return jsonResponse(400, { error: 'Missing request body' });
  }

  const verification = verifyStripeSignature({
    rawBody,
    signatureHeader,
    secret: webhookSecret
  });
  if (!verification.valid) {
    logServerWarn('Stripe webhook signature verification failed', {
      route: '/api/webhooks/stripe',
      reason: verification.reason || 'unknown'
    });
    return jsonResponse(400, { error: 'Invalid Stripe signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logServerWarn('Stripe webhook JSON parsing failed', {
      route: '/api/webhooks/stripe',
      error: error instanceof Error ? error.message : String(error)
    });
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  try {
    const result = await handleStripeDonationWebhook(payload as Record<string, unknown>);
    return jsonResponse(200, {
      received: true,
      ...result
    });
  } catch (error) {
    logServerError('Stripe donation webhook processing failed', error, {
      route: '/api/webhooks/stripe'
    });
    return jsonResponse(500, {
      received: true,
      handled: false,
      error: 'Webhook processing failed'
    });
  }
};
