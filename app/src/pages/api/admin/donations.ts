import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import {
  cancelDonationEmailJob,
  getDonationAdminData,
  processDueDonationEmailJobs,
  saveDefaultDonationReminderForEvent,
  saveDonationTemplate,
  saveDonationThankYouSettings,
  scheduleDonationEmailReminder,
  sendDonationThankYouNow
} from '@lib/donation-thank-you';

const TEMPLATE_KEYS = new Set(['one-time', 'recurring-start', 'recurring-renewal']);
const JOB_KINDS = new Set(['reminder', 'manual-resend']);

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const asString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const parseBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
      return json as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }
    return payload;
  } catch {
    return null;
  }
};

const buildRedirect = (
  redirectTo: string | null,
  key: 'saved' | 'error',
  value: string
): Response | null => {
  if (!redirectTo) return null;
  const glue = redirectTo.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 303,
    headers: { Location: `${redirectTo}${glue}${key}=${encodeURIComponent(value)}` }
  });
};

const parseTemplateKey = (value: unknown): string | null => {
  const normalized = asString(value).toLowerCase();
  return TEMPLATE_KEYS.has(normalized) ? normalized : null;
};

const parseJobKind = (value: unknown): 'reminder' | 'manual-resend' => {
  const normalized = asString(value).toLowerCase();
  return JOB_KINDS.has(normalized) ? (normalized as 'reminder' | 'manual-resend') : 'reminder';
};

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const data = await getDonationAdminData();
  return jsonResponse(data);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin, user } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const body = await parseBody(request);
  if (!body) return jsonResponse({ error: 'Invalid request body' }, 400);

  const action = asString(body.action);
  const redirectTo = parseRedirectPath(body.redirectTo);
  if (!action) {
    const redirect = buildRedirect(redirectTo, 'error', 'donation_action_missing');
    if (redirect) return redirect;
    return jsonResponse({ error: 'Missing action' }, 400);
  }

  if (action === 'save-donation-thank-you-settings') {
    try {
      await saveDonationThankYouSettings({
        enabled: asBoolean(body.enabled, true),
        sendRecurringRenewals: asBoolean(body.sendRecurringRenewals, false),
        defaultReminderHours: body.defaultReminderHours,
        sendInternalNotifications: asBoolean(body.sendInternalNotifications, true),
        internalNotificationRecipients: body.internalNotificationRecipients,
        internalNotificationSubjectTemplate: body.internalNotificationSubjectTemplate
      });
      const redirect = buildRedirect(redirectTo, 'saved', 'donation_thank_you_settings_updated');
      if (redirect) return redirect;
      return jsonResponse({ success: true });
    } catch {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_thank_you_settings_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to save donation thank-you settings' }, 500);
    }
  }

  if (action === 'save-donation-template') {
    const key = parseTemplateKey(body.templateKey);
    if (!key) {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_template_key_invalid');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Invalid donation template key' }, 400);
    }

    try {
      await saveDonationTemplate({
        key,
        subjectTemplate: body.subjectTemplate,
        contentTemplate: body.contentTemplate,
        updatedBy: user?.email ?? null
      });
      const redirect = buildRedirect(redirectTo, 'saved', 'donation_template_updated');
      if (redirect) return redirect;
      return jsonResponse({ success: true, key });
    } catch {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_template_save_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to save donation template' }, 500);
    }
  }

  if (action === 'send-donation-thank-you-now') {
    const result = await sendDonationThankYouNow({
      eventId: asString(body.eventId),
      templateSelection: body.templateSelection,
      createdBy: user?.email ?? null
    });

    if (!result.success) {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_thank_you_send_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: result.error || 'Failed to send donation thank-you email' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'donation_thank_you_sent');
    if (redirect) return redirect;
    return jsonResponse({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      templateKey: result.templateKey
    });
  }

  if (action === 'schedule-donation-email-reminder') {
    const scheduled = await scheduleDonationEmailReminder({
      eventId: asString(body.eventId),
      scheduledFor: asString(body.scheduledFor),
      templateSelection: body.templateSelection,
      createdBy: user?.email ?? null,
      jobKind: parseJobKind(body.jobKind)
    });

    if (!scheduled.id) {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_reminder_schedule_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: scheduled.error || 'Failed to schedule donation reminder' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'donation_reminder_scheduled');
    if (redirect) return redirect;
    return jsonResponse({ success: true, id: scheduled.id });
  }

  if (action === 'schedule-donation-default-reminder') {
    const scheduled = await saveDefaultDonationReminderForEvent({
      eventId: asString(body.eventId),
      createdBy: user?.email ?? null
    });

    if (!scheduled.id) {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_default_reminder_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: scheduled.error || 'Failed to schedule default reminder' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'donation_default_reminder_scheduled');
    if (redirect) return redirect;
    return jsonResponse({ success: true, id: scheduled.id });
  }

  if (action === 'run-donation-email-jobs') {
    const summary = await processDueDonationEmailJobs(40);
    const redirect = buildRedirect(redirectTo, 'saved', 'donation_email_jobs_processed');
    if (redirect) return redirect;
    return jsonResponse({ success: true, summary });
  }

  if (action === 'cancel-donation-email-job') {
    const cancelled = await cancelDonationEmailJob(asString(body.jobId));
    if (!cancelled) {
      const redirect = buildRedirect(redirectTo, 'error', 'donation_email_job_cancel_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to cancel donation email job' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'donation_email_job_cancelled');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  const redirect = buildRedirect(redirectTo, 'error', 'donation_action_invalid');
  if (redirect) return redirect;
  return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
};
