import type { APIRoute } from 'astro';
import { query } from '@lib/db/client';
import { recordAnalyticsEvent } from '@lib/db/analytics';
import { sendContactSubmissionEmails } from '@lib/contact-email';
import { logServerError, logServerWarn } from '@lib/server-logger';

type SubmissionSource = 'contact' | 'coming-soon';

const parseString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const parseRedirectPath = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const parseBoolean = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const parseJsonRecord = (value: FormDataEntryValue | null): Record<string, unknown> => {
  if (typeof value !== 'string') return {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid payloads from clients.
  }

  return {};
};

const requestWantsJson = (request: Request, formData: FormData): boolean => {
  const requestedMode = parseString(formData.get('response')).toLowerCase();
  if (requestedMode === 'json') return true;

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json')) return true;

  const requestedWith = request.headers.get('x-requested-with') ?? '';
  if (requestedWith.toLowerCase() === 'xmlhttprequest') return true;

  return false;
};

const detectSource = (formData: FormData): SubmissionSource => {
  if (
    typeof formData.get('parent-name') === 'string' ||
    typeof formData.get('child-birthdate') === 'string' ||
    parseString(formData.get('form-name')) === 'coming-soon-contact' ||
    parseString(formData.get('source')) === 'coming-soon'
  ) {
    return 'coming-soon';
  }
  return 'contact';
};

const toSubject = (source: SubmissionSource, formData: FormData): string => {
  if (source === 'contact') {
    return parseString(formData.get('subject')) || 'General inquiry';
  }

  const programInterest = parseString(formData.get('program-interest'));
  if (programInterest.length > 0) {
    return `Coming Soon Inquiry: ${programInterest}`;
  }
  return 'Coming Soon Inquiry';
};

const toMessage = (source: SubmissionSource, formData: FormData): string => {
  const primaryMessage = parseString(formData.get('message'));

  if (source === 'contact') {
    return primaryMessage;
  }

  const detailLines: string[] = [];
  const childBirthdate = parseString(formData.get('child-birthdate'));
  const programInterest = parseString(formData.get('program-interest'));
  const tourPreference = parseString(formData.get('tour-preference'));
  const referral = parseString(formData.get('referral'));

  if (childBirthdate) detailLines.push(`Child birthdate: ${childBirthdate}`);
  if (programInterest) detailLines.push(`Program interest: ${programInterest}`);
  if (tourPreference) detailLines.push(`Tour preference: ${tourPreference}`);
  if (referral) detailLines.push(`Referral source: ${referral}`);

  if (primaryMessage.length > 0 && detailLines.length > 0) {
    return `${primaryMessage}\n\n${detailLines.join('\n')}`;
  }

  if (primaryMessage.length > 0) {
    return primaryMessage;
  }

  if (detailLines.length > 0) {
    return detailLines.join('\n');
  }

  return 'No message provided.';
};

const toChildAge = (source: SubmissionSource, formData: FormData): string | null => {
  if (source === 'contact') {
    const childAge = parseString(formData.get('child-age'));
    return childAge || null;
  }

  const childBirthdate = parseString(formData.get('child-birthdate'));
  return childBirthdate || null;
};

const toTourInterest = (source: SubmissionSource, formData: FormData): boolean => {
  if (source === 'contact') {
    return parseBoolean(formData.get('tour-interest'));
  }

  const tourPreference = parseString(formData.get('tour-preference'));
  return tourPreference.length > 0;
};

const successRedirectFor = (source: SubmissionSource): string =>
  source === 'contact' ? '/contact-success' : '/coming-soon?submitted=1';

const errorRedirectFor = (source: SubmissionSource): string =>
  source === 'contact'
    ? '/contact?error=submission-failed'
    : '/coming-soon?error=submission-failed';

const jsonResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const POST: APIRoute = async ({ request, redirect }) => {
  let source: SubmissionSource = 'contact';
  let wantsJson = false;

  try {
    const formData = await request.formData();
    source = detectSource(formData);
    wantsJson = requestWantsJson(request, formData);

    const honeypot = parseString(formData.get('bot-field'));
    const requestedRedirect = parseRedirectPath(formData.get('redirectTo'));
    const successRedirect = requestedRedirect ?? successRedirectFor(source);

    const attribution = parseJsonRecord(formData.get('analytics-attribution'));
    const sessionId = parseString(formData.get('analytics-session-id')) || null;
    const clientId = parseString(formData.get('analytics-client-id')) || null;
    const landingPage = parseString(formData.get('analytics-landing-page')) || null;
    const referrerFromForm = parseString(formData.get('analytics-referrer-url')) || null;
    const referrerUrl = referrerFromForm || parseString(request.headers.get('referer')) || null;

    // Silently accept obvious bot submissions while skipping storage.
    if (honeypot.length > 0) {
      if (wantsJson) {
        return jsonResponse({ success: true });
      }
      return redirect(successRedirect);
    }

    const name =
      source === 'coming-soon'
        ? parseString(formData.get('parent-name'))
        : parseString(formData.get('name'));
    const email = parseString(formData.get('email'));
    const phoneValue = parseString(formData.get('phone'));
    const subject = toSubject(source, formData);
    const message = toMessage(source, formData);
    const childAge = toChildAge(source, formData);
    const tourInterest = toTourInterest(source, formData);

    if (!name || !email || (source === 'contact' && !message)) {
      if (wantsJson) {
        return jsonResponse(
          {
            success: false,
            error: 'Please complete name, email, and question.'
          },
          400
        );
      }
      return redirect(errorRedirectFor(source));
    }

    await query(
      `
        INSERT INTO contact_form_submissions
        (
          name,
          email,
          phone,
          subject,
          message,
          child_age,
          tour_interest,
          attribution,
          session_id,
          client_id,
          landing_page,
          referrer_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
      `,
      [
        name,
        email,
        phoneValue || null,
        subject,
        message,
        childAge,
        tourInterest,
        JSON.stringify(attribution),
        sessionId,
        clientId,
        landingPage,
        referrerUrl
      ]
    );

    await recordAnalyticsEvent({
      eventName: source === 'coming-soon' ? 'coming_soon_submit' : 'contact_submit',
      eventCategory: 'lead',
      pagePath: landingPage,
      pageUrl: null,
      referrerUrl,
      sessionId,
      clientId,
      properties: {
        source,
        subject,
        tourInterest,
        hasPhone: Boolean(phoneValue),
        hasChildAge: Boolean(childAge),
        utmSource: typeof attribution.utm_source === 'string' ? attribution.utm_source : undefined,
        utmMedium: typeof attribution.utm_medium === 'string' ? attribution.utm_medium : undefined,
        utmCampaign:
          typeof attribution.utm_campaign === 'string' ? attribution.utm_campaign : undefined
      }
    });

    let emailResult:
      | {
          notificationSent: boolean;
          confirmationSent: boolean;
          notifiedRecipients: string[];
          errors: string[];
        }
      | null = null;

    try {
      emailResult = await sendContactSubmissionEmails({
        source,
        name,
        email,
        phone: phoneValue || null,
        subject,
        message,
        childAge,
        tourInterest
      });

      if (emailResult.errors.length > 0) {
        logServerWarn('Contact submission email delivery had partial failures', {
          route: '/api/contact/submit',
          source,
          notifiedRecipients: emailResult.notifiedRecipients,
          errors: emailResult.errors
        });
      }
    } catch (emailError) {
      logServerWarn('Contact submission emails failed unexpectedly', {
        route: '/api/contact/submit',
        source,
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }

    if (wantsJson) {
      return jsonResponse({
        success: true,
        notificationSent: emailResult?.notificationSent ?? false,
        confirmationSent: emailResult?.confirmationSent ?? false
      });
    }

    return redirect(successRedirect);
  } catch (error) {
    logServerError('Failed to process contact form submission', error, {
      route: '/api/contact/submit',
      source
    });

    if (wantsJson) {
      return jsonResponse(
        {
          success: false,
          error: 'Sorry, we could not send your question. Please try again.'
        },
        500
      );
    }

    return redirect(errorRedirectFor(source));
  }
};

export const GET: APIRoute = async ({ redirect }) => {
  logServerWarn('Unexpected GET on contact submission endpoint', {
    route: '/api/contact/submit'
  });
  return redirect('/contact');
};
