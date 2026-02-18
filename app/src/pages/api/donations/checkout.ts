import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { logServerError } from '@lib/server-logger';

type DonationFrequency = 'one-time' | 'monthly';

type CheckoutRequestBody = {
  amount?: unknown;
  frequency?: unknown;
};

type StripeErrorPayload = {
  error?: {
    message?: string;
    type?: string;
  };
};

type StripeCheckoutSessionPayload = {
  url?: string;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const ALLOWED_FREQUENCIES = new Set<DonationFrequency>(['one-time', 'monthly']);
const MIN_DONATION_AMOUNT = 1;
const MAX_DONATION_AMOUNT = 100000;

const jsonResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });

const parseAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeFrequency = (value: unknown): DonationFrequency | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_FREQUENCIES.has(normalized as DonationFrequency) ? (normalized as DonationFrequency) : null;
};

const normalizeDonationLink = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
};

const resolveSiteOrigin = (request: Request): string => {
  const configured = process.env.PUBLIC_SITE_URL || process.env.URL;
  if (configured?.startsWith('http://') || configured?.startsWith('https://')) {
    return configured.replace(/\/$/, '');
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://spicebushmontessori.org';
  }
};

const buildStripeCheckoutBody = (params: {
  amountCents: number;
  frequency: DonationFrequency;
  successUrl: string;
  cancelUrl: string;
}): URLSearchParams => {
  const { amountCents, frequency, successUrl, cancelUrl } = params;
  const requestBody = new URLSearchParams();

  requestBody.set('mode', frequency === 'monthly' ? 'subscription' : 'payment');
  requestBody.set('submit_type', 'donate');
  requestBody.set('success_url', successUrl);
  requestBody.set('cancel_url', cancelUrl);
  requestBody.set('billing_address_collection', 'auto');
  requestBody.set('line_items[0][quantity]', '1');
  requestBody.set('line_items[0][price_data][currency]', 'usd');
  requestBody.set('line_items[0][price_data][unit_amount]', String(amountCents));
  requestBody.set('line_items[0][price_data][product_data][name]', 'Donation to Spicebush Montessori School');
  requestBody.set(
    'line_items[0][price_data][product_data][description]',
    'Support accessible Montessori education through our nonprofit school community.'
  );
  requestBody.set('metadata[source]', 'spicebush-web-donate-page');
  requestBody.set('metadata[donation_frequency]', frequency);
  requestBody.set('metadata[amount_cents]', String(amountCents));

  if (frequency === 'monthly') {
    requestBody.set('line_items[0][price_data][recurring][interval]', 'month');
  }

  return requestBody;
};

const getFallbackDonationUrl = async (): Promise<string | null> => {
  try {
    return normalizeDonationLink(await db.content.getSetting('donation_external_link'));
  } catch (error) {
    logServerError('Failed loading donation fallback link for checkout API', error, {
      route: '/api/donations/checkout'
    });
    return null;
  }
};

export const POST: APIRoute = async ({ request }) => {
  let payload: CheckoutRequestBody;

  try {
    const parsed = await request.json();
    if (!isObjectRecord(parsed)) {
      return jsonResponse({ error: 'Invalid request payload.' }, 400);
    }
    payload = parsed as CheckoutRequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid request payload.' }, 400);
  }

  const amount = parseAmount(payload.amount);
  const frequency = normalizeFrequency(payload.frequency);

  if (amount === null || amount < MIN_DONATION_AMOUNT || amount > MAX_DONATION_AMOUNT) {
    return jsonResponse({ error: 'Please enter a valid donation amount.' }, 400);
  }

  if (!frequency) {
    return jsonResponse({ error: 'Please select a valid donation frequency.' }, 400);
  }

  const amountCents = Math.round(amount * 100);
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    return jsonResponse({ error: 'Please enter a valid donation amount.' }, 400);
  }

  const stripeApiKey = process.env.STRIPE_RESTRICTED_KEY?.trim() || process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeApiKey) {
    const fallbackUrl = await getFallbackDonationUrl();
    if (fallbackUrl) {
      return jsonResponse({ url: fallbackUrl, provider: 'fallback' });
    }

    return jsonResponse(
      { error: 'Donations are temporarily unavailable online. Please contact the school for assistance.' },
      503
    );
  }

  const origin = resolveSiteOrigin(request);
  const successUrl = `${origin}/donate/thank-you?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/donate?canceled=1`;
  const stripeRequestBody = buildStripeCheckoutBody({
    amountCents,
    frequency,
    successUrl,
    cancelUrl
  });

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: stripeRequestBody.toString()
    });

    const responsePayload = (await stripeResponse.json().catch(() => ({}))) as
      | StripeCheckoutSessionPayload
      | StripeErrorPayload;

    if (!stripeResponse.ok) {
      const fallbackUrl = await getFallbackDonationUrl();
      if (fallbackUrl) {
        return jsonResponse({ url: fallbackUrl, provider: 'fallback' });
      }

      return jsonResponse(
        {
          error:
            (responsePayload as StripeErrorPayload).error?.message
            || 'Unable to start secure checkout. Please try again.'
        },
        502
      );
    }

    const checkoutUrl = (responsePayload as StripeCheckoutSessionPayload).url;
    if (!checkoutUrl) {
      return jsonResponse({ error: 'Unable to start secure checkout. Please try again.' }, 502);
    }

    return jsonResponse({ url: checkoutUrl });
  } catch (error) {
    logServerError('Stripe checkout session request failed', error, {
      route: '/api/donations/checkout'
    });

    const fallbackUrl = await getFallbackDonationUrl();
    if (fallbackUrl) {
      return jsonResponse({ url: fallbackUrl, provider: 'fallback' });
    }

    return jsonResponse({ error: 'Unable to start secure checkout. Please try again.' }, 502);
  }
};
