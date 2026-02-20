import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import {
  cancelAnnouncementEmailJob,
  processDueAnnouncementEmailJobs,
  saveAnnouncementEmailRecipients,
  scheduleAnnouncementEmailReminder,
  sendAnnouncementEmailNow
} from '@lib/announcement-email';
import { db } from '@lib/db';

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

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const data = await db.announcements.getAnnouncementAdminData();
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
    const redirect = buildRedirect(redirectTo, 'error', 'announcement_action_missing');
    if (redirect) return redirect;
    return jsonResponse({ error: 'Missing action' }, 400);
  }

  if (action === 'save-announcement-email-settings') {
    try {
      const recipients = await saveAnnouncementEmailRecipients(body.announcementEmailRecipients);
      const redirect = buildRedirect(redirectTo, 'saved', 'announcement_email_settings_updated');
      if (redirect) return redirect;
      return jsonResponse({ success: true, recipients });
    } catch {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_email_settings_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to save announcement email settings' }, 500);
    }
  }

  if (action === 'send-announcement-email-now') {
    const result = await sendAnnouncementEmailNow({
      announcementId: asString(body.announcementId),
      requestedTemplateKey: asString(body.templateKey),
      createdBy: user?.email ?? null
    });

    if (!result.success) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_email_send_failed');
      if (redirect) return redirect;
      return jsonResponse(
        {
          error: result.error || 'Failed to send announcement email',
          recipients: result.recipients
        },
        400
      );
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_email_sent');
    if (redirect) return redirect;
    return jsonResponse({
      success: true,
      recipients: result.recipients,
      provider: result.provider,
      messageId: result.messageId,
      subject: result.subject
    });
  }

  if (action === 'schedule-announcement-email-reminder') {
    const scheduled = await scheduleAnnouncementEmailReminder({
      announcementId: asString(body.announcementId),
      scheduledFor: asString(body.scheduledFor),
      requestedTemplateKey: asString(body.templateKey),
      createdBy: user?.email ?? null,
      jobKind: 'reminder'
    });

    if (!scheduled.id) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_email_schedule_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: scheduled.error || 'Failed to schedule reminder email' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_email_reminder_scheduled');
    if (redirect) return redirect;
    return jsonResponse({ success: true, id: scheduled.id });
  }

  if (action === 'run-announcement-email-jobs') {
    const summary = await processDueAnnouncementEmailJobs({ limit: 40 });
    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_email_jobs_processed');
    if (redirect) return redirect;
    return jsonResponse({ success: true, summary });
  }

  if (action === 'cancel-announcement-email-job') {
    const cancelled = await cancelAnnouncementEmailJob(asString(body.jobId));
    if (!cancelled) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_email_cancel_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to cancel announcement email job' }, 400);
    }
    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_email_job_cancelled');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'create-announcement') {
    const id = await db.announcements.createSchoolAnnouncement({
      title: asString(body.title),
      message: asString(body.message),
      severity: asString(body.severity) as 'info' | 'reminder' | 'urgent' | 'closure' | undefined,
      placement: asString(body.placement) as
        | 'global'
        | 'homepage'
        | 'camp'
        | 'coming-soon'
        | undefined,
      audience: asString(body.audience),
      ctaLabel: asString(body.ctaLabel) || null,
      ctaUrl: asString(body.ctaUrl) || null,
      startsAt: asString(body.startsAt) || null,
      endsAt: asString(body.endsAt) || null,
      isPublished: asBoolean(body.isPublished, false),
      createdBy: user?.email ?? null
    });

    if (!id) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_create_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to create announcement' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_created');
    if (redirect) return redirect;
    return jsonResponse({ success: true, id });
  }

  if (action === 'save-announcement') {
    const id = asString(body.announcementId);
    const updated = await db.announcements.updateSchoolAnnouncement(id, {
      title: asString(body.title),
      message: asString(body.message),
      severity: asString(body.severity) as 'info' | 'reminder' | 'urgent' | 'closure' | undefined,
      placement: asString(body.placement) as
        | 'global'
        | 'homepage'
        | 'camp'
        | 'coming-soon'
        | undefined,
      audience: asString(body.audience),
      ctaLabel: asString(body.ctaLabel) || null,
      ctaUrl: asString(body.ctaUrl) || null,
      startsAt: asString(body.startsAt) || null,
      endsAt: asString(body.endsAt) || null,
      isPublished: asBoolean(body.isPublished, false)
    });

    if (!updated) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_update_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to update announcement' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_updated');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'delete-announcement') {
    const id = asString(body.announcementId);
    const deleted = await db.announcements.deleteSchoolAnnouncement(id);
    if (!deleted) {
      const redirect = buildRedirect(redirectTo, 'error', 'announcement_delete_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to delete announcement' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'announcement_deleted');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'create-exception') {
    const id = await db.announcements.createScheduleException({
      title: asString(body.title),
      reason: asString(body.reason) || null,
      startDate: asString(body.startDate),
      endDate: asString(body.endDate),
      exceptionType: asString(body.exceptionType) as 'closed' | 'modified_hours' | undefined,
      openTimeDecimal: asNumber(body.openTimeDecimal),
      closeTimeDecimal: asNumber(body.closeTimeDecimal),
      beforeCareOffset: asNumber(body.beforeCareOffset),
      afterCareOffset: asNumber(body.afterCareOffset),
      linkedAnnouncementId: asString(body.linkedAnnouncementId) || null,
      isPublished: asBoolean(body.isPublished, false),
      createdBy: user?.email ?? null
    });

    if (!id) {
      const redirect = buildRedirect(redirectTo, 'error', 'schedule_exception_create_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to create schedule exception' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'schedule_exception_created');
    if (redirect) return redirect;
    return jsonResponse({ success: true, id });
  }

  if (action === 'save-exception') {
    const id = asString(body.exceptionId);
    const updated = await db.announcements.updateScheduleException(id, {
      title: asString(body.title),
      reason: asString(body.reason) || null,
      startDate: asString(body.startDate),
      endDate: asString(body.endDate),
      exceptionType: asString(body.exceptionType) as 'closed' | 'modified_hours' | undefined,
      openTimeDecimal: asNumber(body.openTimeDecimal),
      closeTimeDecimal: asNumber(body.closeTimeDecimal),
      beforeCareOffset: asNumber(body.beforeCareOffset),
      afterCareOffset: asNumber(body.afterCareOffset),
      linkedAnnouncementId: asString(body.linkedAnnouncementId) || null,
      isPublished: asBoolean(body.isPublished, false)
    });

    if (!updated) {
      const redirect = buildRedirect(redirectTo, 'error', 'schedule_exception_update_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to update schedule exception' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'schedule_exception_updated');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  if (action === 'delete-exception') {
    const id = asString(body.exceptionId);
    const deleted = await db.announcements.deleteScheduleException(id);
    if (!deleted) {
      const redirect = buildRedirect(redirectTo, 'error', 'schedule_exception_delete_failed');
      if (redirect) return redirect;
      return jsonResponse({ error: 'Failed to delete schedule exception' }, 400);
    }

    const redirect = buildRedirect(redirectTo, 'saved', 'schedule_exception_deleted');
    if (redirect) return redirect;
    return jsonResponse({ success: true });
  }

  const redirect = buildRedirect(redirectTo, 'error', 'announcement_action_invalid');
  if (redirect) return redirect;
  return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
};
