import { db } from '@lib/db';
import { query, queryFirst, queryRows } from '@lib/db/client';
import { emailService } from '@lib/email-service';
import {
  buildSchoolContactFooterHtml,
  buildSchoolContactFooterText,
  resolveSchoolEmailContactInfo,
  type SchoolEmailContactInfo
} from '@lib/email-template-footer';
import { logServerWarn } from '@lib/server-logger';
import type { AnnouncementPlacement, AnnouncementSeverity } from '@lib/db/announcements';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BRAND_NAME = 'Spicebush Montessori School';
const DEFAULT_TEMPLATE_KEY: AnnouncementEmailTemplateKey = 'info';
const DEFAULT_RECIPIENT = 'information@spicebushmontessori.org';

export type AnnouncementEmailTemplateKey = 'info' | 'reminder' | 'urgent' | 'closure';
export type AnnouncementEmailRequestedTemplateKey = 'auto' | AnnouncementEmailTemplateKey;
export type AnnouncementEmailJobStatus =
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled';
export type AnnouncementEmailJobKind = 'initial' | 'reminder';

const TEMPLATE_KEYS: AnnouncementEmailTemplateKey[] = ['info', 'reminder', 'urgent', 'closure'];
const REQUESTED_TEMPLATE_KEYS: AnnouncementEmailRequestedTemplateKey[] = [
  'auto',
  ...TEMPLATE_KEYS
];

const MESSAGE_TYPE_BY_KEY: Record<AnnouncementEmailTemplateKey, string> = {
  info: 'announcement_email_info',
  reminder: 'announcement_email_reminder',
  urgent: 'announcement_email_urgent',
  closure: 'announcement_email_closure'
};

export const ANNOUNCEMENT_TEMPLATE_OPTIONS: Array<{
  key: AnnouncementEmailRequestedTemplateKey;
  label: string;
}> = [
  { key: 'auto', label: 'Auto (use announcement severity)' },
  { key: 'info', label: 'Information Template' },
  { key: 'reminder', label: 'Reminder Template' },
  { key: 'urgent', label: 'Urgent Template' },
  { key: 'closure', label: 'Closure Template' }
];

type AnnouncementEmailTemplateRecord = {
  key: AnnouncementEmailTemplateKey;
  name: string;
  subjectTemplate: string;
  contentTemplate: string;
  source: 'database' | 'default';
};

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  placement: AnnouncementPlacement;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
};

type AnnouncementEmailJobRow = {
  id: string;
  announcement_id: string;
  announcement_title: string | null;
  job_kind: AnnouncementEmailJobKind;
  template_key: AnnouncementEmailRequestedTemplateKey;
  recipients: string[] | null;
  scheduled_for: string;
  status: AnnouncementEmailJobStatus;
  attempt_count: number;
  sent_count: number;
  sent_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export interface AnnouncementEmailSettings {
  recipients: string[];
  recipientsText: string;
  contactInfo: SchoolEmailContactInfo;
}

export interface AnnouncementEmailTemplateSummary {
  key: AnnouncementEmailTemplateKey;
  name: string;
  subjectTemplate: string;
  source: 'database' | 'default';
}

export interface AnnouncementEmailSendResult {
  success: boolean;
  recipients: string[];
  subject: string;
  templateKey: AnnouncementEmailTemplateKey;
  messageId?: string;
  provider?: string;
  error?: string;
}

export interface AnnouncementEmailJobSummary {
  id: string;
  announcementId: string;
  announcementTitle: string;
  jobKind: AnnouncementEmailJobKind;
  templateKey: AnnouncementEmailRequestedTemplateKey;
  recipients: string[];
  scheduledFor: string;
  status: AnnouncementEmailJobStatus;
  attemptCount: number;
  sentCount: number;
  sentAt: string | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessAnnouncementEmailJobsResult {
  claimed: number;
  processed: number;
  sent: number;
  failed: number;
}

const DEFAULT_TEMPLATES: Record<AnnouncementEmailTemplateKey, AnnouncementEmailTemplateRecord> = {
  info: {
    key: 'info',
    name: 'Announcement Email - Information',
    subjectTemplate: 'Spicebush Update: {{title}}',
    contentTemplate:
      'Hello families,\n\n{{message}}\n\n{{schedule_window}}\n\nThank you,\nSpicebush Montessori School',
    source: 'default'
  },
  reminder: {
    key: 'reminder',
    name: 'Announcement Email - Reminder',
    subjectTemplate: 'Reminder: {{title}}',
    contentTemplate:
      'Hello families,\n\nThis is a friendly reminder:\n{{message}}\n\n{{schedule_window}}\n\nWarmly,\nSpicebush Montessori School',
    source: 'default'
  },
  urgent: {
    key: 'urgent',
    name: 'Announcement Email - Urgent',
    subjectTemplate: 'Urgent: {{title}}',
    contentTemplate:
      'Hello families,\n\nPlease review this urgent school update:\n{{message}}\n\n{{schedule_window}}\n\nIf you have questions, please contact us right away.\n\nSpicebush Montessori School',
    source: 'default'
  },
  closure: {
    key: 'closure',
    name: 'Announcement Email - Closure',
    subjectTemplate: 'School Closure Notice: {{title}}',
    contentTemplate:
      'Hello families,\n\nPlease note this school closure update:\n{{message}}\n\n{{schedule_window}}\n\nWe appreciate your flexibility and understanding.\n\nSpicebush Montessori School',
    source: 'default'
  }
};

const severityLabels: Record<AnnouncementSeverity, string> = {
  info: 'Information',
  reminder: 'Reminder',
  urgent: 'Urgent Update',
  closure: 'School Closure'
};

const placementLabels: Record<AnnouncementPlacement, string> = {
  global: 'All site locations',
  homepage: 'Homepage',
  camp: 'Camp page',
  'coming-soon': 'Coming soon page'
};

const isTemplateKey = (value: string): value is AnnouncementEmailTemplateKey =>
  TEMPLATE_KEYS.includes(value as AnnouncementEmailTemplateKey);

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isUuidLike = (value: string): boolean => UUID_REGEX.test(value);

const isEmail = (value: string): boolean => EMAIL_REGEX.test(value);

const parseEmailList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => asString(entry))
      .filter((entry) => isEmail(entry));
  }

  const raw = asString(value);
  if (!raw) return [];

  return raw
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => isEmail(entry));
};

const normalizeRequestedTemplateKey = (
  value: unknown
): AnnouncementEmailRequestedTemplateKey => {
  const normalized = asString(value).toLowerCase();
  if (REQUESTED_TEMPLATE_KEYS.includes(normalized as AnnouncementEmailRequestedTemplateKey)) {
    return normalized as AnnouncementEmailRequestedTemplateKey;
  }
  return 'auto';
};

const parseDateTime = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
};

const severityToTemplateKey = (severity: AnnouncementSeverity): AnnouncementEmailTemplateKey => {
  if (isTemplateKey(severity)) return severity;
  return DEFAULT_TEMPLATE_KEY;
};

const resolveTemplateKey = (
  requested: AnnouncementEmailRequestedTemplateKey,
  severity: AnnouncementSeverity
): AnnouncementEmailTemplateKey => {
  if (requested === 'auto') return severityToTemplateKey(severity);
  return isTemplateKey(requested) ? requested : severityToTemplateKey(severity);
};

const formatTimestamp = (value: string | null): string => {
  if (!value) return 'Not specified';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Not specified';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date(parsed));
};

const normalizeRecipients = (recipients: string[]): string[] => {
  const deduped = new Set<string>();
  recipients.forEach((entry) => {
    const lowered = entry.trim().toLowerCase();
    if (isEmail(lowered)) deduped.add(lowered);
  });
  return Array.from(deduped);
};

const loadAnnouncementById = async (id: string): Promise<AnnouncementRow | null> => {
  if (!isUuidLike(id)) return null;

  return queryFirst<AnnouncementRow>(
    `
      SELECT
        id,
        title,
        message,
        severity,
        placement,
        cta_label,
        cta_url,
        starts_at,
        ends_at,
        is_published
      FROM school_announcements
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [id]
  );
};

const interpolateTemplate = (template: string, replacements: Record<string, string>): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => replacements[key] ?? '');

const loadTemplateMap = async (): Promise<Record<AnnouncementEmailTemplateKey, AnnouncementEmailTemplateRecord>> => {
  const templates = { ...DEFAULT_TEMPLATES };

  try {
    const rows = await queryRows<{
      message_type: string;
      name: string;
      subject_template: string;
      content_template: string;
    }>(
      `
        SELECT message_type, name, subject_template, content_template
        FROM communications_templates
        WHERE message_type = ANY($1::text[])
      `,
      [Object.values(MESSAGE_TYPE_BY_KEY)]
    );

    rows.forEach((row) => {
      const type = asString(row.message_type);
      const match = Object.entries(MESSAGE_TYPE_BY_KEY).find(([, messageType]) => messageType === type);
      if (!match) return;
      const [key] = match;
      templates[key as AnnouncementEmailTemplateKey] = {
        key: key as AnnouncementEmailTemplateKey,
        name: asString(row.name) || DEFAULT_TEMPLATES[key as AnnouncementEmailTemplateKey].name,
        subjectTemplate:
          asString(row.subject_template) ||
          DEFAULT_TEMPLATES[key as AnnouncementEmailTemplateKey].subjectTemplate,
        contentTemplate:
          asString(row.content_template) ||
          DEFAULT_TEMPLATES[key as AnnouncementEmailTemplateKey].contentTemplate,
        source: 'database'
      };
    });
  } catch (error) {
    logServerWarn('Failed loading announcement email templates from DB, using defaults', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return templates;
};

const buildScheduleWindowLabel = (announcement: AnnouncementRow): string => {
  const startsAt = formatTimestamp(announcement.starts_at);
  const endsAt = formatTimestamp(announcement.ends_at);
  if (announcement.starts_at || announcement.ends_at) {
    return `Effective window: ${startsAt} - ${endsAt}`;
  }
  return 'Effective window: Starts immediately until further notice.';
};

const buildAnnouncementEmailContent = (
  announcement: AnnouncementRow,
  template: AnnouncementEmailTemplateRecord,
  contactInfo: SchoolEmailContactInfo
): { subject: string; html: string; text: string } => {
  const scheduleWindow = buildScheduleWindowLabel(announcement);
  const replacements: Record<string, string> = {
    title: announcement.title,
    message: announcement.message,
    severity: announcement.severity,
    severity_label: severityLabels[announcement.severity] || severityLabels.info,
    placement: announcement.placement,
    placement_label: placementLabels[announcement.placement] || placementLabels.global,
    starts_at: formatTimestamp(announcement.starts_at),
    ends_at: formatTimestamp(announcement.ends_at),
    schedule_window: scheduleWindow,
    cta_label: announcement.cta_label || '',
    cta_url: announcement.cta_url || '',
    school_name: BRAND_NAME
  };

  const subject = interpolateTemplate(template.subjectTemplate, replacements).trim() || announcement.title;
  const contentText = interpolateTemplate(template.contentTemplate, replacements).trim();

  const ctaHtml =
    announcement.cta_label && announcement.cta_url
      ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(announcement.cta_url)}" style="display:inline-block;background:#2f6a4f;color:#ffffff;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none;">${escapeHtml(announcement.cta_label)}</a></p>`
      : '';

  const ctaText =
    announcement.cta_label && announcement.cta_url
      ? `\n\n${announcement.cta_label}: ${announcement.cta_url}`
      : '';

  const severityLabel = severityLabels[announcement.severity] || announcement.severity;
  const placementLabel = placementLabels[announcement.placement] || announcement.placement;
  const footerNote = `Announcement level: ${severityLabels[announcement.severity] || announcement.severity}.`;

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5ef;padding:24px 12px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2f3a34;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;border:1px solid #d9dfd6;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#2f6a4f,#5f8f76);padding:22px 26px;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;">${BRAND_NAME}</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">${escapeHtml(subject)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px 8px;">
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#5f6f67;"><strong>${escapeHtml(severityLabel)}</strong> • ${escapeHtml(placementLabel)}</p>
                <div style="margin:0;font-size:15px;line-height:1.65;color:#2f3a34;">${escapeHtml(contentText).replace(/\n/g, '<br/>')}</div>
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 26px 24px;color:#5f6f67;font-size:13px;line-height:1.5;">
                ${buildSchoolContactFooterHtml(contactInfo, { footerNote })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = `${contentText}${ctaText}\n\n${buildSchoolContactFooterText(contactInfo, {
    footerNote
  })}`;

  return { subject, html, text };
};

const toJobSummary = (row: AnnouncementEmailJobRow): AnnouncementEmailJobSummary => ({
  id: asString(row.id),
  announcementId: asString(row.announcement_id),
  announcementTitle: asString(row.announcement_title) || 'Deleted announcement',
  jobKind: row.job_kind,
  templateKey: normalizeRequestedTemplateKey(row.template_key),
  recipients: normalizeRecipients(Array.isArray(row.recipients) ? row.recipients : []),
  scheduledFor: asString(row.scheduled_for),
  status: row.status,
  attemptCount: Number(row.attempt_count || 0),
  sentCount: Number(row.sent_count || 0),
  sentAt: row.sent_at,
  lastError: row.last_error,
  createdBy: row.created_by,
  createdAt: asString(row.created_at),
  updatedAt: asString(row.updated_at)
});

const logAnnouncementEmailMessage = async (input: {
  subject: string;
  bodyText: string;
  scheduledFor: string | null;
  sentAt: string | null;
  status: 'scheduled' | 'sent' | 'failed';
  recipients: string[];
  createdBy: string | null;
  metadata: Record<string, unknown>;
}) => {
  try {
    await query(
      `
        INSERT INTO communications_messages (
          subject,
          message_content,
          message_type,
          recipient_type,
          recipient_count,
          scheduled_for,
          sent_at,
          status,
          delivery_stats,
          created_by
        )
        VALUES ($1, $2, 'announcement_email', 'custom_list', $3, $4::timestamptz, $5::timestamptz, $6, $7::jsonb, $8)
      `,
      [
        input.subject,
        input.bodyText,
        input.recipients.length,
        input.scheduledFor,
        input.sentAt,
        input.status,
        JSON.stringify({
          ...input.metadata,
          recipients: input.recipients
        }),
        input.createdBy
      ]
    );
  } catch (error) {
    logServerWarn('Failed to write communications_messages row for announcement email', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const sendRenderedAnnouncementEmail = async (input: {
  announcement: AnnouncementRow;
  requestedTemplateKey: AnnouncementEmailRequestedTemplateKey;
  recipients: string[];
  contactInfo: SchoolEmailContactInfo;
}): Promise<AnnouncementEmailSendResult> => {
  const templateMap = await loadTemplateMap();
  const resolvedTemplateKey = resolveTemplateKey(
    input.requestedTemplateKey,
    input.announcement.severity
  );
  const template = templateMap[resolvedTemplateKey] ?? DEFAULT_TEMPLATES[resolvedTemplateKey];
  const rendered = buildAnnouncementEmailContent(input.announcement, template, input.contactInfo);

  const sendResult = await emailService.send({
    to: input.recipients,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    fromName: BRAND_NAME
  });

  return {
    success: sendResult.success,
    recipients: input.recipients,
    subject: rendered.subject,
    templateKey: resolvedTemplateKey,
    messageId: sendResult.messageId,
    provider: sendResult.provider,
    error: sendResult.error
  };
};

export const getAnnouncementEmailSettings = async (): Promise<AnnouncementEmailSettings> => {
  const settings = await db.content.getAllSettings();
  const contactInfo = resolveSchoolEmailContactInfo(settings);
  const parsedRecipients = parseEmailList(settings.announcement_email_recipients);
  const recipients = normalizeRecipients(
    parsedRecipients.length > 0 ? parsedRecipients : [contactInfo.email || DEFAULT_RECIPIENT]
  );

  return {
    recipients,
    recipientsText: recipients.join(', '),
    contactInfo
  };
};

export const saveAnnouncementEmailRecipients = async (rawRecipients: unknown): Promise<string[]> => {
  const parsed = parseEmailList(rawRecipients);
  const fallbackSettings = await db.content.getAllSettings();
  const fallbackEmail = resolveSchoolEmailContactInfo(fallbackSettings).email || DEFAULT_RECIPIENT;
  const recipients = normalizeRecipients(parsed.length > 0 ? parsed : [fallbackEmail]);

  await query(
    `
      INSERT INTO settings (key, value, updated_at)
      VALUES ('announcement_email_recipients', $1::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `,
    [JSON.stringify(recipients.join(', '))]
  );
  db.cache.invalidateSettings();
  return recipients;
};

export const getAnnouncementEmailTemplateSummaries = async (): Promise<
  AnnouncementEmailTemplateSummary[]
> => {
  const map = await loadTemplateMap();
  return TEMPLATE_KEYS.map((key) => {
    const template = map[key] ?? DEFAULT_TEMPLATES[key];
    return {
      key,
      name: template.name,
      subjectTemplate: template.subjectTemplate,
      source: template.source
    };
  });
};

export const sendAnnouncementEmailNow = async (input: {
  announcementId: string;
  requestedTemplateKey?: unknown;
  createdBy?: string | null;
}): Promise<AnnouncementEmailSendResult> => {
  const announcement = await loadAnnouncementById(input.announcementId);
  if (!announcement) {
    return {
      success: false,
      recipients: [],
      subject: '',
      templateKey: DEFAULT_TEMPLATE_KEY,
      error: 'Announcement not found'
    };
  }

  const emailSettings = await getAnnouncementEmailSettings();
  const requestedTemplateKey = normalizeRequestedTemplateKey(input.requestedTemplateKey || 'auto');
  const result = await sendRenderedAnnouncementEmail({
    announcement,
    requestedTemplateKey,
    recipients: emailSettings.recipients,
    contactInfo: emailSettings.contactInfo
  });

  await logAnnouncementEmailMessage({
    subject: result.subject,
    bodyText: announcement.message,
    scheduledFor: null,
    sentAt: result.success ? new Date().toISOString() : null,
    status: result.success ? 'sent' : 'failed',
    recipients: result.recipients,
    createdBy: input.createdBy ?? null,
    metadata: {
      source: 'announcement_send_now',
      announcementId: announcement.id,
      templateKey: result.templateKey,
      provider: result.provider,
      error: result.error || null
    }
  });

  return result;
};

export const scheduleAnnouncementEmailReminder = async (input: {
  announcementId: string;
  scheduledFor: string;
  requestedTemplateKey?: unknown;
  createdBy?: string | null;
  jobKind?: AnnouncementEmailJobKind;
}): Promise<{ id: string | null; error?: string }> => {
  if (!isUuidLike(input.announcementId)) {
    return { id: null, error: 'Invalid announcement ID' };
  }

  const scheduledForIso = parseDateTime(input.scheduledFor);
  if (!scheduledForIso) {
    return { id: null, error: 'Invalid schedule date/time' };
  }

  const announcement = await loadAnnouncementById(input.announcementId);
  if (!announcement) {
    return { id: null, error: 'Announcement not found' };
  }

  const settings = await getAnnouncementEmailSettings();
  const recipients = settings.recipients;
  const templateKey = normalizeRequestedTemplateKey(input.requestedTemplateKey || 'auto');
  const jobKind = input.jobKind === 'initial' ? 'initial' : 'reminder';

  try {
    const result = await query<{ id: string }>(
      `
        INSERT INTO announcement_email_jobs (
          announcement_id,
          job_kind,
          template_key,
          recipients,
          scheduled_for,
          status,
          created_by
        )
        VALUES ($1::uuid, $2, $3, $4::text[], $5::timestamptz, 'scheduled', $6)
        RETURNING id
      `,
      [
        input.announcementId,
        jobKind,
        templateKey,
        recipients,
        scheduledForIso,
        input.createdBy ?? null
      ]
    );

    const id = result.rows[0]?.id ?? null;
    if (id) {
      await logAnnouncementEmailMessage({
        subject: `Scheduled reminder for ${announcement.title}`,
        bodyText: announcement.message,
        scheduledFor: scheduledForIso,
        sentAt: null,
        status: 'scheduled',
        recipients,
        createdBy: input.createdBy ?? null,
        metadata: {
          source: 'announcement_schedule',
          announcementId: announcement.id,
          jobId: id,
          templateKey,
          jobKind
        }
      });
    }

    return { id };
  } catch (error) {
    return {
      id: null,
      error: error instanceof Error ? error.message : 'Failed to schedule reminder'
    };
  }
};

export const getRecentAnnouncementEmailJobs = async (
  limit = 50
): Promise<AnnouncementEmailJobSummary[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  try {
    const rows = await queryRows<AnnouncementEmailJobRow>(
      `
        SELECT
          j.id,
          j.announcement_id,
          j.job_kind,
          j.template_key,
          j.recipients,
          j.scheduled_for,
          j.status,
          j.attempt_count,
          j.sent_count,
          j.sent_at,
          j.last_error,
          j.created_by,
          j.created_at,
          j.updated_at,
          a.title AS announcement_title
        FROM announcement_email_jobs j
        LEFT JOIN school_announcements a
          ON a.id = j.announcement_id
        ORDER BY j.scheduled_for DESC, j.created_at DESC
        LIMIT $1
      `,
      [boundedLimit]
    );
    return rows.map(toJobSummary);
  } catch (error) {
    logServerWarn('Failed to load announcement email jobs', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
};

export const cancelAnnouncementEmailJob = async (jobId: string): Promise<boolean> => {
  if (!isUuidLike(jobId)) return false;
  try {
    const result = await query(
      `
        UPDATE announcement_email_jobs
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1::uuid
          AND status IN ('scheduled', 'failed')
      `,
      [jobId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logServerWarn('Failed to cancel announcement email job', {
      jobId,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
};

const claimDueJobs = async (limit: number): Promise<AnnouncementEmailJobSummary[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const rows = await queryRows<AnnouncementEmailJobRow>(
    `
      WITH due AS (
        SELECT id
        FROM announcement_email_jobs
        WHERE status = 'scheduled'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE announcement_email_jobs j
      SET
        status = 'processing',
        attempt_count = j.attempt_count + 1,
        updated_at = NOW()
      FROM due
      WHERE j.id = due.id
      RETURNING
        j.id,
        j.announcement_id,
        j.job_kind,
        j.template_key,
        j.recipients,
        j.scheduled_for,
        j.status,
        j.attempt_count,
        j.sent_count,
        j.sent_at,
        j.last_error,
        j.created_by,
        j.created_at,
        j.updated_at,
        (
          SELECT a.title
          FROM school_announcements a
          WHERE a.id = j.announcement_id
          LIMIT 1
        ) AS announcement_title
    `,
    [boundedLimit]
  );

  return rows.map(toJobSummary);
};

const markJobResult = async (input: {
  jobId: string;
  status: 'sent' | 'failed';
  sentAt?: string | null;
  sentCount?: number;
  error?: string | null;
}) => {
  await query(
    `
      UPDATE announcement_email_jobs
      SET
        status = $2,
        sent_at = $3::timestamptz,
        sent_count = CASE WHEN $4::int IS NULL THEN sent_count ELSE $4::int END,
        last_error = $5,
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [input.jobId, input.status, input.sentAt ?? null, input.sentCount ?? null, input.error ?? null]
  );
};

export const processDueAnnouncementEmailJobs = async (
  options?: { limit?: number }
): Promise<ProcessAnnouncementEmailJobsResult> => {
  const claimedJobs = await claimDueJobs(options?.limit ?? 20);
  if (claimedJobs.length === 0) {
    return { claimed: 0, processed: 0, sent: 0, failed: 0 };
  }

  const settings = await getAnnouncementEmailSettings();

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of claimedJobs) {
    processed += 1;
    const announcement = await loadAnnouncementById(job.announcementId);
    if (!announcement) {
      failed += 1;
      await markJobResult({
        jobId: job.id,
        status: 'failed',
        sentAt: null,
        error: 'Announcement not found'
      });
      continue;
    }

    const recipients = normalizeRecipients(job.recipients.length > 0 ? job.recipients : settings.recipients);
    const sendResult = await sendRenderedAnnouncementEmail({
      announcement,
      requestedTemplateKey: job.templateKey,
      recipients,
      contactInfo: settings.contactInfo
    });

    if (!sendResult.success) {
      failed += 1;
      await markJobResult({
        jobId: job.id,
        status: 'failed',
        sentAt: null,
        error: sendResult.error || 'Failed to send announcement email'
      });

      await logAnnouncementEmailMessage({
        subject: sendResult.subject,
        bodyText: announcement.message,
        scheduledFor: job.scheduledFor,
        sentAt: null,
        status: 'failed',
        recipients,
        createdBy: job.createdBy,
        metadata: {
          source: 'announcement_scheduled',
          announcementId: announcement.id,
          jobId: job.id,
          templateKey: sendResult.templateKey,
          provider: sendResult.provider,
          error: sendResult.error || null
        }
      });
      continue;
    }

    sent += 1;
    const sentAt = new Date().toISOString();
    await markJobResult({
      jobId: job.id,
      status: 'sent',
      sentAt,
      sentCount: recipients.length,
      error: null
    });

    await logAnnouncementEmailMessage({
      subject: sendResult.subject,
      bodyText: announcement.message,
      scheduledFor: job.scheduledFor,
      sentAt,
      status: 'sent',
      recipients,
      createdBy: job.createdBy,
      metadata: {
        source: 'announcement_scheduled',
        announcementId: announcement.id,
        jobId: job.id,
        templateKey: sendResult.templateKey,
        provider: sendResult.provider,
        messageId: sendResult.messageId || null
      }
    });
  }

  return {
    claimed: claimedJobs.length,
    processed,
    sent,
    failed
  };
};
