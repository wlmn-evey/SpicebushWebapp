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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BRAND_NAME = 'Spicebush Montessori School';
const DEFAULT_DONOR_NAME = 'friend';
const DEFAULT_CURRENCY = 'USD';

export type DonationKind = 'one-time' | 'recurring-start' | 'recurring-renewal';
export type DonationTemplateKey = DonationKind;
export type DonationTemplateSelection = 'auto' | DonationTemplateKey;
export type DonationEmailJobStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type DonationEmailJobKind = 'reminder' | 'retry' | 'manual-resend';

type DonationEventEmailStatus = 'pending' | 'sent' | 'skipped' | 'failed';

type TemplateRecord = {
  key: DonationTemplateKey;
  name: string;
  messageType: string;
  subjectTemplate: string;
  contentTemplate: string;
  source: 'database' | 'default';
};

type DonationEventRow = {
  id: string;
  stripe_event_id: string;
  stripe_event_type: string;
  stripe_object_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  amount_cents: number | null;
  currency: string | null;
  donation_kind: DonationKind;
  source: string;
  event_created_at: string;
  metadata: Record<string, unknown> | null;
  thank_you_email_status: DonationEventEmailStatus;
  thank_you_email_sent_at: string | null;
  thank_you_email_error: string | null;
  created_at: string;
  updated_at: string;
};

type DonationEmailJobRow = {
  id: string;
  donation_event_id: string;
  donation_stripe_event_id: string | null;
  donor_email: string | null;
  donor_name: string | null;
  donation_kind: DonationKind | null;
  amount_cents: number | null;
  currency: string | null;
  job_kind: DonationEmailJobKind;
  template_key: DonationTemplateSelection;
  scheduled_for: string;
  status: DonationEmailJobStatus;
  attempt_count: number;
  sent_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type StripeWebhookEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: {
    object?: Record<string, unknown>;
  };
};

type DonationEventInsert = {
  stripeEventId: string;
  stripeEventType: string;
  stripeObjectId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amountCents: number | null;
  currency: string | null;
  donationKind: DonationKind;
  eventCreatedAt: string;
  metadata: Record<string, unknown>;
};

export interface DonationThankYouSettings {
  enabled: boolean;
  sendRecurringRenewals: boolean;
  defaultReminderHours: number;
  contactInfo: SchoolEmailContactInfo;
}

export interface DonationTemplateSummary {
  key: DonationTemplateKey;
  name: string;
  subjectTemplate: string;
  contentTemplate: string;
  source: 'database' | 'default';
}

export interface DonationEventSummary {
  id: string;
  stripeEventId: string;
  stripeEventType: string;
  donorName: string | null;
  donorEmail: string | null;
  amountCents: number | null;
  currency: string | null;
  donationKind: DonationKind;
  eventCreatedAt: string;
  thankYouEmailStatus: DonationEventEmailStatus;
  thankYouEmailSentAt: string | null;
  thankYouEmailError: string | null;
  createdAt: string;
}

export interface DonationEmailJobSummary {
  id: string;
  donationEventId: string;
  donationStripeEventId: string | null;
  donorEmail: string | null;
  donorName: string | null;
  donationKind: DonationKind | null;
  amountCents: number | null;
  currency: string | null;
  jobKind: DonationEmailJobKind;
  templateKey: DonationTemplateSelection;
  scheduledFor: string;
  status: DonationEmailJobStatus;
  attemptCount: number;
  sentAt: string | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DonationAdminData {
  settings: DonationThankYouSettings;
  templates: DonationTemplateSummary[];
  events: DonationEventSummary[];
  jobs: DonationEmailJobSummary[];
}

export interface SendDonationThankYouResult {
  success: boolean;
  eventId: string;
  donorEmail: string | null;
  subject: string;
  templateKey: DonationTemplateKey;
  provider?: string;
  messageId?: string;
  error?: string;
}

export interface ProcessDonationJobsSummary {
  claimed: number;
  processed: number;
  sent: number;
  failed: number;
}

export interface HandleStripeDonationWebhookResult {
  handled: boolean;
  reason?: string;
  eventId?: string;
  stripeEventId?: string;
  donationKind?: DonationKind;
  emailSent?: boolean;
}

const TEMPLATE_OPTIONS: Array<{ key: DonationTemplateSelection; label: string }> = [
  { key: 'auto', label: 'Auto (match donation type)' },
  { key: 'one-time', label: 'One-Time Donation Thank You' },
  { key: 'recurring-start', label: 'Recurring Start Thank You' },
  { key: 'recurring-renewal', label: 'Recurring Renewal Thank You' }
];

const defaultTemplates: Record<DonationTemplateKey, TemplateRecord> = {
  'one-time': {
    key: 'one-time',
    name: 'Donation Thank You - One-Time',
    messageType: 'donation_thank_you_one_time',
    subjectTemplate: 'Thank you for your gift to Spicebush Montessori, {{first_name}}',
    contentTemplate:
      'Dear {{first_name}},\n\nThank you so much for your one-time gift of {{amount}}. Your generosity directly supports inclusive Montessori learning for children and families in our community.\n\nYour support helps us:\n- Keep tuition as accessible as possible\n- Provide rich classroom materials and experiences\n- Sustain a warm and welcoming environment for every child\n\nDonation details:\n- Amount: {{amount}}\n- Date: {{donation_date}}\n\nWith deep gratitude,\nSpicebush Montessori School',
    source: 'default'
  },
  'recurring-start': {
    key: 'recurring-start',
    name: 'Donation Thank You - Recurring Start',
    messageType: 'donation_thank_you_recurring_start',
    subjectTemplate: 'Welcome to monthly giving, {{first_name}} — thank you',
    contentTemplate:
      'Dear {{first_name}},\n\nThank you for starting a monthly gift of {{amount}} to Spicebush Montessori. Ongoing support like yours gives our school stability and helps us plan boldly for children and families.\n\nYour recurring donation supports:\n- Consistent classroom resources throughout the year\n- Inclusive programming and support for diverse learners\n- Long-term planning that keeps our mission strong\n\nDonation details:\n- Monthly amount: {{amount}}\n- Start date: {{donation_date}}\n\nWe are so grateful to have you as part of this work.\n\nWarmly,\nSpicebush Montessori School',
    source: 'default'
  },
  'recurring-renewal': {
    key: 'recurring-renewal',
    name: 'Donation Thank You - Recurring Renewal',
    messageType: 'donation_thank_you_recurring_renewal',
    subjectTemplate: 'Thank you for your continued monthly support, {{first_name}}',
    contentTemplate:
      'Dear {{first_name}},\n\nThank you for your continued monthly gift of {{amount}}. Your consistency makes a real, practical difference for our children, classrooms, and families.\n\nDonation details:\n- Monthly amount: {{amount}}\n- Date received: {{donation_date}}\n\nWe appreciate your ongoing generosity more than we can say.\n\nWith gratitude,\nSpicebush Montessori School',
    source: 'default'
  }
};

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
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
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());
const isUuid = (value: string): boolean => UUID_REGEX.test(value);

const formatCurrency = (amountCents: number | null, currency: string | null): string => {
  if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || amountCents < 0) return 'an amount';
  const normalizedCurrency = (currency || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
};

const toIsoTimestamp = (value: unknown, fallback = new Date()): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return fallback.toISOString();
};

const parseTemplateSelection = (value: unknown): DonationTemplateSelection => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'auto') return 'auto';
  if (normalized === 'one-time') return 'one-time';
  if (normalized === 'recurring-start') return 'recurring-start';
  if (normalized === 'recurring-renewal') return 'recurring-renewal';
  return 'auto';
};

const parseDonationKind = (value: unknown): DonationKind => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'one-time') return 'one-time';
  if (normalized === 'recurring-start') return 'recurring-start';
  if (normalized === 'recurring-renewal') return 'recurring-renewal';
  return 'one-time';
};

const parseJobKind = (value: unknown): DonationEmailJobKind => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'retry') return 'retry';
  if (normalized === 'manual-resend') return 'manual-resend';
  return 'reminder';
};

const parseJobStatus = (value: unknown): DonationEmailJobStatus => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'processing') return 'processing';
  if (normalized === 'sent') return 'sent';
  if (normalized === 'failed') return 'failed';
  if (normalized === 'cancelled') return 'cancelled';
  return 'scheduled';
};

const parseEventEmailStatus = (value: unknown): DonationEventEmailStatus => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'sent') return 'sent';
  if (normalized === 'skipped') return 'skipped';
  if (normalized === 'failed') return 'failed';
  return 'pending';
};

const interpolate = (template: string, values: Record<string, string>): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => values[key] ?? '');

const firstNameFrom = (name: string | null): string => {
  const normalized = asString(name);
  if (!normalized) return DEFAULT_DONOR_NAME;
  return normalized.split(/\s+/)[0] || DEFAULT_DONOR_NAME;
};

const resolveTemplateKey = (
  selection: DonationTemplateSelection,
  donationKind: DonationKind
): DonationTemplateKey => {
  if (selection === 'auto') return donationKind;
  return selection;
};

const normalizeReminderHours = (value: unknown): number => {
  const parsed = asNumber(value);
  if (parsed === null) return 72;
  const rounded = Math.round(parsed);
  return Math.max(1, Math.min(720, rounded));
};

const toEventSummary = (row: DonationEventRow): DonationEventSummary => ({
  id: asString(row.id),
  stripeEventId: asString(row.stripe_event_id),
  stripeEventType: asString(row.stripe_event_type),
  donorName: row.donor_name,
  donorEmail: row.donor_email,
  amountCents: typeof row.amount_cents === 'number' ? row.amount_cents : null,
  currency: row.currency,
  donationKind: parseDonationKind(row.donation_kind),
  eventCreatedAt: asString(row.event_created_at),
  thankYouEmailStatus: parseEventEmailStatus(row.thank_you_email_status),
  thankYouEmailSentAt: row.thank_you_email_sent_at,
  thankYouEmailError: row.thank_you_email_error,
  createdAt: asString(row.created_at)
});

const toJobSummary = (row: DonationEmailJobRow): DonationEmailJobSummary => ({
  id: asString(row.id),
  donationEventId: asString(row.donation_event_id),
  donationStripeEventId: row.donation_stripe_event_id,
  donorEmail: row.donor_email,
  donorName: row.donor_name,
  donationKind: row.donation_kind ? parseDonationKind(row.donation_kind) : null,
  amountCents: typeof row.amount_cents === 'number' ? row.amount_cents : null,
  currency: row.currency,
  jobKind: parseJobKind(row.job_kind),
  templateKey: parseTemplateSelection(row.template_key),
  scheduledFor: asString(row.scheduled_for),
  status: parseJobStatus(row.status),
  attemptCount: typeof row.attempt_count === 'number' ? row.attempt_count : 0,
  sentAt: row.sent_at,
  lastError: row.last_error,
  createdBy: row.created_by,
  createdAt: asString(row.created_at)
});

const loadSettingsAndContactInfo = async (): Promise<DonationThankYouSettings> => {
  const settings = await db.content.getAllSettings();
  const contactInfo = resolveSchoolEmailContactInfo(settings);

  return {
    enabled: asBoolean(settings.donation_thank_you_enabled, true),
    sendRecurringRenewals: asBoolean(settings.donation_thank_you_send_recurring_renewals, false),
    defaultReminderHours: normalizeReminderHours(settings.donation_thank_you_default_reminder_hours),
    contactInfo
  };
};

const loadTemplateMap = async (): Promise<Record<DonationTemplateKey, TemplateRecord>> => {
  const templates: Record<DonationTemplateKey, TemplateRecord> = {
    'one-time': { ...defaultTemplates['one-time'] },
    'recurring-start': { ...defaultTemplates['recurring-start'] },
    'recurring-renewal': { ...defaultTemplates['recurring-renewal'] }
  };

  const messageTypes = [
    defaultTemplates['one-time'].messageType,
    defaultTemplates['recurring-start'].messageType,
    defaultTemplates['recurring-renewal'].messageType
  ];

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
      [messageTypes]
    );

    rows.forEach((row) => {
      const type = asString(row.message_type);
      const key =
        type === defaultTemplates['one-time'].messageType
          ? 'one-time'
          : type === defaultTemplates['recurring-start'].messageType
            ? 'recurring-start'
            : type === defaultTemplates['recurring-renewal'].messageType
              ? 'recurring-renewal'
              : null;
      if (!key) return;

      templates[key] = {
        key,
        name: asString(row.name) || templates[key].name,
        messageType: templates[key].messageType,
        subjectTemplate: asString(row.subject_template) || templates[key].subjectTemplate,
        contentTemplate: asString(row.content_template) || templates[key].contentTemplate,
        source: 'database'
      };
    });
  } catch (error) {
    logServerWarn('Could not load donation templates from DB, using defaults', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return templates;
};

const buildDonationEmail = (input: {
  event: DonationEventSummary;
  template: TemplateRecord;
  contactInfo: SchoolEmailContactInfo;
}): { subject: string; html: string; text: string } => {
  const donorName = input.event.donorName || '';
  const firstName = firstNameFrom(donorName);
  const amount = formatCurrency(input.event.amountCents, input.event.currency);
  const donationDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long'
  }).format(new Date(input.event.eventCreatedAt));
  const frequencyLabel =
    input.event.donationKind === 'one-time'
      ? 'one-time'
      : input.event.donationKind === 'recurring-start'
        ? 'monthly (new)'
        : 'monthly (renewal)';

  const values: Record<string, string> = {
    first_name: firstName,
    donor_name: donorName || firstName,
    amount,
    donation_date: donationDate,
    frequency_label: frequencyLabel,
    school_name: BRAND_NAME
  };

  const subject = interpolate(input.template.subjectTemplate, values).trim();
  const contentText = interpolate(input.template.contentTemplate, values).trim();
  const footerNote = `Donation type: ${frequencyLabel}.`;

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
                <div style="margin:0;font-size:15px;line-height:1.65;color:#2f3a34;">${escapeHtml(contentText).replace(/\n/g, '<br/>')}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 26px 24px;color:#5f6f67;font-size:13px;line-height:1.5;">
                ${buildSchoolContactFooterHtml(input.contactInfo, { footerNote })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = `${contentText}\n\n${buildSchoolContactFooterText(input.contactInfo, { footerNote })}`;

  return {
    subject,
    html,
    text
  };
};

const updateDonationEventEmailStatus = async (input: {
  eventId: string;
  status: DonationEventEmailStatus;
  sentAt?: string | null;
  error?: string | null;
}) => {
  await query(
    `
      UPDATE donation_events
      SET
        thank_you_email_status = $2,
        thank_you_email_sent_at = $3::timestamptz,
        thank_you_email_error = $4,
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [input.eventId, input.status, input.sentAt ?? null, input.error ?? null]
  );
};

const fetchDonationEvent = async (eventId: string): Promise<DonationEventSummary | null> => {
  if (!isUuid(eventId)) return null;

  const row = await queryFirst<DonationEventRow>(
    `
      SELECT
        id,
        stripe_event_id,
        stripe_event_type,
        stripe_object_id,
        stripe_customer_id,
        stripe_subscription_id,
        donor_name,
        donor_email,
        amount_cents,
        currency,
        donation_kind,
        source,
        event_created_at,
        metadata,
        thank_you_email_status,
        thank_you_email_sent_at,
        thank_you_email_error,
        created_at,
        updated_at
      FROM donation_events
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [eventId]
  );

  return row ? toEventSummary(row) : null;
};

const logDonationMessage = async (input: {
  subject: string;
  body: string;
  recipient: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
  status: 'scheduled' | 'sent' | 'failed';
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const recipientCount = input.recipient && isEmail(input.recipient) ? 1 : 0;
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
      VALUES ($1, $2, 'donation_thank_you', 'single', $3, $4::timestamptz, $5::timestamptz, $6, $7::jsonb, $8)
    `,
    [
      input.subject,
      input.body,
      recipientCount,
      input.scheduledFor ?? null,
      input.sentAt ?? null,
      input.status,
      JSON.stringify({
        recipient: input.recipient,
        ...(input.metadata || {})
      }),
      input.createdBy ?? null
    ]
  );
};

const renderAndSendDonationThankYou = async (input: {
  event: DonationEventSummary;
  templateSelection: DonationTemplateSelection;
  contactInfo: SchoolEmailContactInfo;
}): Promise<SendDonationThankYouResult> => {
  const templateMap = await loadTemplateMap();
  const templateKey = resolveTemplateKey(input.templateSelection, input.event.donationKind);
  const template = templateMap[templateKey];
  const rendered = buildDonationEmail({
    event: input.event,
    template,
    contactInfo: input.contactInfo
  });

  if (!input.event.donorEmail || !isEmail(input.event.donorEmail)) {
    return {
      success: false,
      eventId: input.event.id,
      donorEmail: input.event.donorEmail,
      subject: rendered.subject,
      templateKey,
      error: 'Donor email address is missing or invalid'
    };
  }

  const sendResult = await emailService.send({
    to: input.event.donorEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    fromName: BRAND_NAME
  });

  if (sendResult.success) {
    return {
      success: true,
      eventId: input.event.id,
      donorEmail: input.event.donorEmail,
      subject: rendered.subject,
      templateKey,
      provider: sendResult.provider,
      messageId: sendResult.messageId
    };
  }

  return {
    success: false,
    eventId: input.event.id,
    donorEmail: input.event.donorEmail,
    subject: rendered.subject,
    templateKey,
    provider: sendResult.provider,
    error: sendResult.error || 'Failed to send donor thank-you email'
  };
};

const createRetryJob = async (input: {
  eventId: string;
  templateKey: DonationTemplateSelection;
  createdBy?: string | null;
  hoursFromNow?: number;
  scheduledFor?: string;
}) => {
  const scheduledFor = new Date(Date.now() + Math.max(1, input.hoursFromNow ?? 1) * 60 * 60 * 1000).toISOString();
  await query(
    `
      INSERT INTO donation_email_jobs (
        donation_event_id,
        job_kind,
        template_key,
        scheduled_for,
        status,
        created_by
      )
      VALUES ($1::uuid, 'retry', $2, $3::timestamptz, 'scheduled', $4)
    `,
    [input.eventId, input.templateKey, input.scheduledFor ?? scheduledFor, input.createdBy ?? null]
  );
};

const insertDonationEvent = async (
  input: DonationEventInsert
): Promise<{ insertedId: string | null; existingId: string | null }> => {
  const insertResult = await query<{ id: string }>(
    `
      INSERT INTO donation_events (
        stripe_event_id,
        stripe_event_type,
        stripe_object_id,
        stripe_customer_id,
        stripe_subscription_id,
        donor_name,
        donor_email,
        amount_cents,
        currency,
        donation_kind,
        source,
        event_created_at,
        metadata,
        thank_you_email_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'stripe', $11::timestamptz, $12::jsonb, 'pending')
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING id
    `,
    [
      input.stripeEventId,
      input.stripeEventType,
      input.stripeObjectId,
      input.stripeCustomerId,
      input.stripeSubscriptionId,
      input.donorName,
      input.donorEmail,
      input.amountCents,
      input.currency,
      input.donationKind,
      input.eventCreatedAt,
      JSON.stringify(input.metadata)
    ]
  );

  const insertedId = insertResult.rows[0]?.id ?? null;
  if (insertedId) {
    return { insertedId, existingId: null };
  }

  const existing = await queryFirst<{ id: string }>(
    `
      SELECT id
      FROM donation_events
      WHERE stripe_event_id = $1
      LIMIT 1
    `,
    [input.stripeEventId]
  );

  return { insertedId: null, existingId: existing?.id ?? null };
};

const parseStripeDonationEvent = (event: StripeWebhookEvent): DonationEventInsert | { ignore: string } => {
  const eventId = asString(event.id);
  const eventType = asString(event.type);
  const object = event.data?.object;

  if (!eventId || !eventType || !object) {
    return { ignore: 'invalid_payload' };
  }

  const eventCreatedAt = toIsoTimestamp(event.created);

  if (eventType === 'checkout.session.completed') {
    const paymentStatus = asString(object.payment_status).toLowerCase();
    if (paymentStatus && paymentStatus !== 'paid') {
      return { ignore: 'checkout_not_paid' };
    }

    const mode = asString(object.mode).toLowerCase();
    const donationKind: DonationKind = mode === 'subscription' ? 'recurring-start' : 'one-time';
    const donorEmail =
      asString((object.customer_details as Record<string, unknown> | undefined)?.email) ||
      asString(object.customer_email) ||
      null;
    const donorName =
      asString((object.customer_details as Record<string, unknown> | undefined)?.name) || null;
    const amountCents =
      asNumber(object.amount_total) === null ? null : Math.round(asNumber(object.amount_total) as number);

    const metadataObject =
      object.metadata && typeof object.metadata === 'object'
        ? (object.metadata as Record<string, unknown>)
        : {};

    return {
      stripeEventId: eventId,
      stripeEventType: eventType,
      stripeObjectId: asString(object.id) || null,
      stripeCustomerId: asString(object.customer) || null,
      stripeSubscriptionId: asString(object.subscription) || null,
      donorName,
      donorEmail,
      amountCents,
      currency: asString(object.currency) || DEFAULT_CURRENCY,
      donationKind,
      eventCreatedAt,
      metadata: {
        mode,
        payment_status: paymentStatus || null,
        metadata: metadataObject
      }
    };
  }

  if (eventType === 'invoice.payment_succeeded') {
    const billingReason = asString(object.billing_reason).toLowerCase();
    if (billingReason === 'subscription_create') {
      return { ignore: 'initial_subscription_invoice_ignored' };
    }

    const donorEmail = asString(object.customer_email) || null;
    const donorName = asString(object.customer_name) || null;
    const amountRaw = asNumber(object.amount_paid) ?? asNumber(object.total);
    const amountCents = amountRaw === null ? null : Math.round(amountRaw);

    return {
      stripeEventId: eventId,
      stripeEventType: eventType,
      stripeObjectId: asString(object.id) || null,
      stripeCustomerId: asString(object.customer) || null,
      stripeSubscriptionId: asString(object.subscription) || null,
      donorName,
      donorEmail,
      amountCents,
      currency: asString(object.currency) || DEFAULT_CURRENCY,
      donationKind: 'recurring-renewal',
      eventCreatedAt,
      metadata: {
        billing_reason: billingReason || null
      }
    };
  }

  return { ignore: 'unsupported_event_type' };
};

const parseDateTimeInput = (value: string): string | null => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
};

const markJobResult = async (input: {
  jobId: string;
  status: 'sent' | 'failed';
  sentAt?: string | null;
  lastError?: string | null;
}) => {
  await query(
    `
      UPDATE donation_email_jobs
      SET
        status = $2,
        sent_at = $3::timestamptz,
        last_error = $4,
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [input.jobId, input.status, input.sentAt ?? null, input.lastError ?? null]
  );
};

const claimDueJobs = async (limit: number): Promise<DonationEmailJobSummary[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const rows = await queryRows<DonationEmailJobRow>(
    `
      WITH due AS (
        SELECT id
        FROM donation_email_jobs
        WHERE status = 'scheduled'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE donation_email_jobs j
      SET
        status = 'processing',
        attempt_count = j.attempt_count + 1,
        updated_at = NOW()
      FROM due
      WHERE j.id = due.id
      RETURNING
        j.id,
        j.donation_event_id,
        j.job_kind,
        j.template_key,
        j.scheduled_for,
        j.status,
        j.attempt_count,
        j.sent_at,
        j.last_error,
        j.created_by,
        j.created_at,
        j.updated_at,
        (
          SELECT e.stripe_event_id
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS donation_stripe_event_id,
        (
          SELECT e.donor_email
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS donor_email,
        (
          SELECT e.donor_name
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS donor_name,
        (
          SELECT e.donation_kind
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS donation_kind,
        (
          SELECT e.amount_cents
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS amount_cents,
        (
          SELECT e.currency
          FROM donation_events e
          WHERE e.id = j.donation_event_id
          LIMIT 1
        ) AS currency
    `,
    [boundedLimit]
  );

  return rows.map(toJobSummary);
};

export const donationTemplateOptions = TEMPLATE_OPTIONS;

export const getDonationThankYouSettings = async (): Promise<DonationThankYouSettings> =>
  loadSettingsAndContactInfo();

export const saveDonationThankYouSettings = async (input: {
  enabled: unknown;
  sendRecurringRenewals: unknown;
  defaultReminderHours: unknown;
}) => {
  const nextEnabled = asBoolean(input.enabled, true);
  const nextRenewals = asBoolean(input.sendRecurringRenewals, false);
  const nextReminderHours = normalizeReminderHours(input.defaultReminderHours);

  const entries: Array<[string, unknown]> = [
    ['donation_thank_you_enabled', nextEnabled],
    ['donation_thank_you_send_recurring_renewals', nextRenewals],
    ['donation_thank_you_default_reminder_hours', nextReminderHours]
  ];

  for (const [key, value] of entries) {
    await query(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      `,
      [key, JSON.stringify(value)]
    );
  }

  db.cache.invalidateSettings();
};

export const getDonationTemplates = async (): Promise<DonationTemplateSummary[]> => {
  const map = await loadTemplateMap();
  const keys: DonationTemplateKey[] = ['one-time', 'recurring-start', 'recurring-renewal'];
  return keys.map((key) => ({
    key,
    name: map[key].name,
    subjectTemplate: map[key].subjectTemplate,
    contentTemplate: map[key].contentTemplate,
    source: map[key].source
  }));
};

export const saveDonationTemplate = async (input: {
  key: unknown;
  subjectTemplate: unknown;
  contentTemplate: unknown;
  updatedBy?: string | null;
}) => {
  const key = parseDonationKind(input.key);
  const defaults = defaultTemplates[key];
  const subjectTemplate = asString(input.subjectTemplate) || defaults.subjectTemplate;
  const contentTemplate = asString(input.contentTemplate) || defaults.contentTemplate;

  await query(
    `
      INSERT INTO communications_templates (
        name,
        description,
        message_type,
        subject_template,
        content_template,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (name)
      DO UPDATE SET
        subject_template = EXCLUDED.subject_template,
        content_template = EXCLUDED.content_template,
        updated_at = NOW()
    `,
    [
      defaults.name,
      `Configured thank-you template for ${key} donations.`,
      defaults.messageType,
      subjectTemplate,
      contentTemplate,
      input.updatedBy ?? null
    ]
  );
};

export const getRecentDonationEvents = async (limit = 40): Promise<DonationEventSummary[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  const rows = await queryRows<DonationEventRow>(
    `
      SELECT
        id,
        stripe_event_id,
        stripe_event_type,
        stripe_object_id,
        stripe_customer_id,
        stripe_subscription_id,
        donor_name,
        donor_email,
        amount_cents,
        currency,
        donation_kind,
        source,
        event_created_at,
        metadata,
        thank_you_email_status,
        thank_you_email_sent_at,
        thank_you_email_error,
        created_at,
        updated_at
      FROM donation_events
      ORDER BY event_created_at DESC, created_at DESC
      LIMIT $1
    `,
    [boundedLimit]
  );
  return rows.map(toEventSummary);
};

export const getRecentDonationEmailJobs = async (limit = 40): Promise<DonationEmailJobSummary[]> => {
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  const rows = await queryRows<DonationEmailJobRow>(
    `
      SELECT
        j.id,
        j.donation_event_id,
        j.job_kind,
        j.template_key,
        j.scheduled_for,
        j.status,
        j.attempt_count,
        j.sent_at,
        j.last_error,
        j.created_by,
        j.created_at,
        j.updated_at,
        e.stripe_event_id AS donation_stripe_event_id,
        e.donor_email,
        e.donor_name,
        e.donation_kind,
        e.amount_cents,
        e.currency
      FROM donation_email_jobs j
      LEFT JOIN donation_events e
        ON e.id = j.donation_event_id
      ORDER BY j.scheduled_for DESC, j.created_at DESC
      LIMIT $1
    `,
    [boundedLimit]
  );
  return rows.map(toJobSummary);
};

export const getDonationAdminData = async (): Promise<DonationAdminData> => {
  const [settings, templates, events, jobs] = await Promise.all([
    getDonationThankYouSettings(),
    getDonationTemplates(),
    getRecentDonationEvents(50),
    getRecentDonationEmailJobs(50)
  ]);

  return {
    settings,
    templates,
    events,
    jobs
  };
};

export const sendDonationThankYouNow = async (input: {
  eventId: string;
  templateSelection?: unknown;
  createdBy?: string | null;
}): Promise<SendDonationThankYouResult> => {
  const event = await fetchDonationEvent(input.eventId);
  if (!event) {
    return {
      success: false,
      eventId: input.eventId,
      donorEmail: null,
      subject: '',
      templateKey: 'one-time',
      error: 'Donation event not found'
    };
  }

  const settings = await getDonationThankYouSettings();
  const templateSelection = parseTemplateSelection(input.templateSelection);
  const sendResult = await renderAndSendDonationThankYou({
    event,
    templateSelection,
    contactInfo: settings.contactInfo
  });

  if (sendResult.success) {
    const sentAt = new Date().toISOString();
    await updateDonationEventEmailStatus({
      eventId: event.id,
      status: 'sent',
      sentAt,
      error: null
    });
    await logDonationMessage({
      subject: sendResult.subject,
      body: `Manual donor thank-you send (${sendResult.templateKey})`,
      recipient: sendResult.donorEmail,
      sentAt,
      status: 'sent',
      createdBy: input.createdBy ?? null,
      metadata: {
        source: 'manual_send',
        eventId: event.id,
        templateKey: sendResult.templateKey,
        provider: sendResult.provider,
        messageId: sendResult.messageId || null
      }
    });
    return sendResult;
  }

  await updateDonationEventEmailStatus({
    eventId: event.id,
    status: 'failed',
    sentAt: null,
    error: sendResult.error || 'Failed sending thank-you email'
  });
  await logDonationMessage({
    subject: sendResult.subject || `Donation thank-you (${event.id})`,
    body: `Manual donor thank-you failed: ${sendResult.error || 'Unknown error'}`,
    recipient: sendResult.donorEmail,
    sentAt: null,
    status: 'failed',
    createdBy: input.createdBy ?? null,
    metadata: {
      source: 'manual_send',
      eventId: event.id,
      templateKey: sendResult.templateKey,
      provider: sendResult.provider,
      error: sendResult.error || null
    }
  });
  return sendResult;
};

export const scheduleDonationEmailReminder = async (input: {
  eventId: string;
  scheduledFor: string;
  templateSelection?: unknown;
  createdBy?: string | null;
  jobKind?: DonationEmailJobKind;
}): Promise<{ id: string | null; error?: string }> => {
  if (!isUuid(input.eventId)) {
    return { id: null, error: 'Invalid donation event id' };
  }

  const scheduledFor = parseDateTimeInput(input.scheduledFor);
  if (!scheduledFor) {
    return { id: null, error: 'Invalid reminder schedule date/time' };
  }

  const event = await fetchDonationEvent(input.eventId);
  if (!event) {
    return { id: null, error: 'Donation event not found' };
  }

  const templateSelection = parseTemplateSelection(input.templateSelection);
  const jobKind = input.jobKind ?? 'reminder';

  const result = await query<{ id: string }>(
    `
      INSERT INTO donation_email_jobs (
        donation_event_id,
        job_kind,
        template_key,
        scheduled_for,
        status,
        created_by
      )
      VALUES ($1::uuid, $2, $3, $4::timestamptz, 'scheduled', $5)
      RETURNING id
    `,
    [input.eventId, jobKind, templateSelection, scheduledFor, input.createdBy ?? null]
  );

  const jobId = result.rows[0]?.id ?? null;
  if (jobId) {
    await logDonationMessage({
      subject: `Scheduled donor reminder: ${event.stripeEventId}`,
      body: `Scheduled ${jobKind} for donation event ${event.id}.`,
      recipient: event.donorEmail,
      scheduledFor,
      status: 'scheduled',
      createdBy: input.createdBy ?? null,
      metadata: {
        source: 'manual_schedule',
        eventId: event.id,
        templateSelection,
        jobId,
        jobKind
      }
    });
  }

  return { id: jobId };
};

export const cancelDonationEmailJob = async (jobId: string): Promise<boolean> => {
  if (!isUuid(jobId)) return false;
  const result = await query(
    `
      UPDATE donation_email_jobs
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1::uuid
        AND status IN ('scheduled', 'failed')
    `,
    [jobId]
  );
  return (result.rowCount ?? 0) > 0;
};

export const processDueDonationEmailJobs = async (limit = 20): Promise<ProcessDonationJobsSummary> => {
  const claimedJobs = await claimDueJobs(limit);
  if (claimedJobs.length === 0) {
    return { claimed: 0, processed: 0, sent: 0, failed: 0 };
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of claimedJobs) {
    processed += 1;
    const sendResult = await sendDonationThankYouNow({
      eventId: job.donationEventId,
      templateSelection: job.templateKey,
      createdBy: job.createdBy
    });

    if (sendResult.success) {
      sent += 1;
      await markJobResult({
        jobId: job.id,
        status: 'sent',
        sentAt: new Date().toISOString(),
        lastError: null
      });
      continue;
    }

    failed += 1;
    await markJobResult({
      jobId: job.id,
      status: 'failed',
      sentAt: null,
      lastError: sendResult.error || 'Failed sending donor thank-you email'
    });
  }

  return {
    claimed: claimedJobs.length,
    processed,
    sent,
    failed
  };
};

export const handleStripeDonationWebhook = async (
  stripeEvent: StripeWebhookEvent
): Promise<HandleStripeDonationWebhookResult> => {
  const parsed = parseStripeDonationEvent(stripeEvent);
  if ('ignore' in parsed) {
    return {
      handled: false,
      reason: parsed.ignore
    };
  }

  const insertion = await insertDonationEvent(parsed);
  const eventId = insertion.insertedId || insertion.existingId;
  if (!eventId) {
    return {
      handled: false,
      reason: 'failed_to_record_event'
    };
  }

  if (insertion.existingId) {
    return {
      handled: true,
      reason: 'duplicate_event_ignored',
      eventId,
      stripeEventId: parsed.stripeEventId,
      donationKind: parsed.donationKind
    };
  }

  const settings = await getDonationThankYouSettings();
  const event = await fetchDonationEvent(eventId);
  if (!event) {
    return {
      handled: false,
      reason: 'event_not_found_after_insert',
      eventId
    };
  }

  if (!settings.enabled) {
    await updateDonationEventEmailStatus({
      eventId,
      status: 'skipped',
      sentAt: null,
      error: 'Thank-you emails disabled'
    });
    return {
      handled: true,
      reason: 'emails_disabled',
      eventId,
      stripeEventId: parsed.stripeEventId,
      donationKind: parsed.donationKind,
      emailSent: false
    };
  }

  if (event.donationKind === 'recurring-renewal' && !settings.sendRecurringRenewals) {
    await updateDonationEventEmailStatus({
      eventId,
      status: 'skipped',
      sentAt: null,
      error: 'Recurring renewal thank-you emails disabled'
    });
    return {
      handled: true,
      reason: 'recurring_renewals_disabled',
      eventId,
      stripeEventId: parsed.stripeEventId,
      donationKind: parsed.donationKind,
      emailSent: false
    };
  }

  const sendResult = await renderAndSendDonationThankYou({
    event,
    templateSelection: 'auto',
    contactInfo: settings.contactInfo
  });

  if (sendResult.success) {
    const sentAt = new Date().toISOString();
    await updateDonationEventEmailStatus({
      eventId,
      status: 'sent',
      sentAt,
      error: null
    });
    await logDonationMessage({
      subject: sendResult.subject,
      body: `Automatic donor thank-you sent (${sendResult.templateKey}).`,
      recipient: sendResult.donorEmail,
      sentAt,
      status: 'sent',
      createdBy: null,
      metadata: {
        source: 'stripe_webhook',
        eventId,
        templateKey: sendResult.templateKey,
        provider: sendResult.provider,
        messageId: sendResult.messageId || null
      }
    });
    return {
      handled: true,
      eventId,
      stripeEventId: parsed.stripeEventId,
      donationKind: parsed.donationKind,
      emailSent: true
    };
  }

  await updateDonationEventEmailStatus({
    eventId,
    status: 'failed',
    sentAt: null,
    error: sendResult.error || 'Failed sending donor thank-you email'
  });

  await createRetryJob({
    eventId,
    templateKey: 'auto',
    createdBy: null,
    hoursFromNow: 1
  });

  await logDonationMessage({
    subject: sendResult.subject || `Donation thank-you (${eventId})`,
    body: `Automatic donor thank-you failed: ${sendResult.error || 'Unknown error'}`,
    recipient: sendResult.donorEmail,
    sentAt: null,
    status: 'failed',
    createdBy: null,
    metadata: {
      source: 'stripe_webhook',
      eventId,
      templateKey: sendResult.templateKey,
      provider: sendResult.provider,
      error: sendResult.error || null
    }
  });

  return {
    handled: true,
    reason: 'email_failed_retry_scheduled',
    eventId,
    stripeEventId: parsed.stripeEventId,
    donationKind: parsed.donationKind,
    emailSent: false
  };
};

export const saveDefaultDonationReminderForEvent = async (input: {
  eventId: string;
  createdBy?: string | null;
}): Promise<{ id: string | null; error?: string }> => {
  const settings = await getDonationThankYouSettings();
  const scheduledFor = new Date(Date.now() + settings.defaultReminderHours * 60 * 60 * 1000).toISOString();

  return scheduleDonationEmailReminder({
    eventId: input.eventId,
    scheduledFor,
    templateSelection: 'auto',
    createdBy: input.createdBy ?? null,
    jobKind: 'reminder'
  });
};
