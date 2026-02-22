import type { APIRoute } from 'astro';
import { query } from '@lib/db/client';
import { recordAnalyticsEvent } from '@lib/db/analytics';
import { sendContactSubmissionEmails } from '@lib/contact-email';
import {
  checkContactSubmissionRateLimit,
  isSubmissionTooFast,
  resolveRequestIp,
  verifyTurnstileToken
} from '@lib/form-security';
import { logServerError, logServerWarn } from '@lib/server-logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toJson = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const parentName = parseString(data?.parentName);
    const email = parseString(data?.email);
    const phone = parseString(data?.phone);
    const childAge = parseString(data?.childAge);
    const preferredTimes = parseString(data?.preferredTimes);
    const questions = parseString(data?.questions);
    const honeypot = parseString(data?.botField);
    const submissionStartedAt = parseString(data?.submissionStartedAt);
    const turnstileToken =
      parseString(data?.turnstileToken) ||
      parseString(data?.cfTurnstileResponse) ||
      parseString(data?.['cf-turnstile-response']);
    const requestIp = resolveRequestIp(request, (locals as Record<string, unknown>) ?? {});

    if (honeypot || isSubmissionTooFast(submissionStartedAt)) {
      return toJson({ success: true, message: 'Tour request submitted successfully' });
    }

    if (!parentName || !email || !phone || !childAge) {
      return toJson({ error: 'Missing required fields' }, 400);
    }

    if (!EMAIL_REGEX.test(email)) {
      return toJson({ error: 'Invalid email address' }, 400);
    }

    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      remoteIp: requestIp
    });
    if (!turnstileResult.success) {
      logServerWarn('Turnstile verification failed for tour request', {
        route: '/api/schedule-tour',
        ipAddress: requestIp,
        reason: turnstileResult.reason || 'unknown'
      });
      return toJson({ error: 'Please complete the security check and try again.' }, 400);
    }

    const rateLimit = await checkContactSubmissionRateLimit({
      ipAddress: requestIp,
      email
    });
    if (rateLimit.blocked) {
      logServerWarn('Tour request rate-limited', {
        route: '/api/schedule-tour',
        ipAddress: requestIp,
        email,
        reason: rateLimit.reason,
        ipCount: rateLimit.ipCount,
        emailCount: rateLimit.emailCount
      });
      return toJson(
        {
          error: 'You have submitted several requests recently. Please wait a few minutes and try again.'
        },
        429
      );
    }

    const subject = `Tour Request: ${parentName}`;
    const messageLines = [
      `Parent/Guardian Name: ${parentName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Child Age: ${childAge}`
    ];

    if (preferredTimes) {
      messageLines.push(`Preferred Times: ${preferredTimes}`);
    }
    if (questions) {
      messageLines.push(`Questions: ${questions}`);
    }

    const message = messageLines.join('\n');

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
          referrer_url,
          ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
      `,
      [
        parentName,
        email,
        phone,
        subject,
        message,
        childAge,
        true,
        JSON.stringify({}),
        null,
        null,
        null,
        null,
        requestIp
      ]
    );

    await recordAnalyticsEvent({
      eventName: 'tour_request_submit',
      eventCategory: 'lead',
      pagePath: null,
      pageUrl: null,
      referrerUrl: parseString(request.headers.get('referer')) || null,
      sessionId: null,
      clientId: null,
      properties: {
        source: 'tour',
        subject,
        tourInterest: true,
        hasPhone: true,
        hasChildAge: Boolean(childAge),
        preferredTimes
      }
    });

    const emailResult = await sendContactSubmissionEmails({
      source: 'tour',
      name: parentName,
      email,
      phone,
      subject,
      message,
      childAge,
      tourInterest: true
    });

    if (emailResult.errors.length > 0) {
      logServerWarn('Tour request email delivery had partial failures', {
        route: '/api/schedule-tour',
        notifiedRecipients: emailResult.notifiedRecipients,
        errors: emailResult.errors
      });
    }

    if (!emailResult.notificationSent) {
      return toJson({ error: 'Failed to send tour request. Please try again later.' }, 500);
    }

    return toJson({
      success: true,
      message: 'Tour request submitted successfully',
      notificationSent: emailResult.notificationSent,
      confirmationSent: emailResult.confirmationSent
    });
  } catch (error) {
    logServerError('Error processing tour request', error, { route: '/api/schedule-tour' });

    return toJson({ error: 'Failed to process tour request' }, 500);
  }
};
