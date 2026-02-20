import { db } from '@lib/db';
import { emailService } from '@lib/email-service';

export type SubmissionSource = 'contact' | 'coming-soon';

export interface ContactSubmissionEmailInput {
  source: SubmissionSource;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  childAge: string | null;
  tourInterest: boolean;
}

export interface ContactSubmissionEmailResult {
  notificationSent: boolean;
  confirmationSent: boolean;
  notifiedRecipients: string[];
  errors: string[];
}

const DEFAULT_SCHOOL_EMAIL = 'information@spicebushmontessori.org';
const BRAND_NAME = 'Spicebush Montessori School';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const asBool = (value: unknown, fallback = false): boolean => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const isEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());

const parseEmailList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => isEmail(entry));
  }

  const raw = asString(value);
  if (!raw) return [];

  return raw
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => isEmail(entry));
};

const resolveSchoolEmail = (settings: Record<string, unknown>): string => {
  const candidates = [
    asString(settings.school_email),
    asString(settings.main_email),
    asString(settings.contact_email),
    DEFAULT_SCHOOL_EMAIL
  ];

  for (const candidate of candidates) {
    if (isEmail(candidate)) return candidate;
  }

  return DEFAULT_SCHOOL_EMAIL;
};

const sourceLabel = (source: SubmissionSource): string =>
  source === 'coming-soon' ? 'Coming Soon Inquiry' : 'Contact Form Inquiry';

const interpolate = (template: string, input: ContactSubmissionEmailInput): string =>
  template
    .replaceAll('{{name}}', input.name)
    .replaceAll('{{subject}}', input.subject)
    .replaceAll('{{source}}', sourceLabel(input.source));

const formatMultiline = (value: string): string =>
  escapeHtml(value).replace(/\n/g, '<br/>');

const toLines = (input: ContactSubmissionEmailInput): Array<{ label: string; value: string }> => [
  { label: 'Source', value: sourceLabel(input.source) },
  { label: 'Name', value: input.name },
  { label: 'Email', value: input.email },
  { label: 'Phone', value: input.phone || 'Not provided' },
  { label: 'Child Age / Birthdate', value: input.childAge || 'Not provided' },
  { label: 'Tour Interest', value: input.tourInterest ? 'Yes' : 'No' },
  { label: 'Subject', value: input.subject }
];

const emailShell = ({
  preheader,
  title,
  intro,
  body,
  footerNote
}: {
  preheader: string;
  title: string;
  intro: string;
  body: string;
  footerNote?: string;
}): string => `
  <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5ef;padding:24px 12px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2f3a34;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;border:1px solid #d9dfd6;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2f6a4f,#5f8f76);padding:22px 26px;color:#ffffff;">
              <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;">${BRAND_NAME}</p>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 26px 8px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#33423a;">${intro}</p>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 26px 24px;color:#5f6f67;font-size:13px;line-height:1.5;">
              ${footerNote ? `<p style="margin:10px 0 0;">${escapeHtml(footerNote)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const buildNotificationEmail = (input: ContactSubmissionEmailInput) => {
  const rows = toLines(input)
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 0;color:#5a6a62;font-size:13px;font-weight:700;vertical-align:top;width:190px;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#2f3a34;font-size:14px;">${escapeHtml(row.value)}</td>
        </tr>
      `
    )
    .join('');

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
    </table>
    <div style="margin-top:18px;padding:14px;border:1px solid #dce4db;border-radius:10px;background:#f8fbf8;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#4b5b53;">Message</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#2f3a34;">${formatMultiline(input.message)}</p>
    </div>
  `;

  const text = [
    `${sourceLabel(input.source)} - New Submission`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || 'Not provided'}`,
    `Child Age/Birthdate: ${input.childAge || 'Not provided'}`,
    `Tour Interest: ${input.tourInterest ? 'Yes' : 'No'}`,
    `Subject: ${input.subject}`,
    '',
    'Message:',
    input.message
  ].join('\n');

  return {
    html: emailShell({
      preheader: `New ${sourceLabel(input.source).toLowerCase()} received.`,
      title: 'New Family Inquiry',
      intro: `A new ${sourceLabel(input.source).toLowerCase()} has been submitted through the website.`,
      body,
      footerNote: 'Reply directly to this email to respond to the parent.'
    }),
    text
  };
};

const buildConfirmationEmail = (input: ContactSubmissionEmailInput) => {
  const needsTourFollowup = input.tourInterest
    ? 'You mentioned you are interested in touring, so we will include next-step scheduling details in our reply.'
    : 'If you would like to tour the school, just reply and we can help schedule that as well.';

  const body = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#2f3a34;">Hi ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#2f3a34;">
      Thank you for reaching out to ${BRAND_NAME}. We received your message and our team will get back to you shortly.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#2f3a34;">${escapeHtml(needsTourFollowup)}</p>
    <div style="margin:0 0 16px;padding:12px 14px;border-left:4px solid #6f987f;background:#f7faf7;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:#597565;font-weight:700;">Your message</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#2f3a34;">${formatMultiline(input.message)}</p>
    </div>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#2f3a34;">Warmly,<br/>${BRAND_NAME}</p>
  `;

  const text = [
    `Hi ${input.name},`,
    '',
    `Thank you for reaching out to ${BRAND_NAME}. We received your message and our team will get back to you shortly.`,
    needsTourFollowup,
    '',
    'Your message:',
    input.message,
    '',
    'Warmly,',
    BRAND_NAME
  ].join('\n');

  return {
    html: emailShell({
      preheader: 'We received your message at Spicebush Montessori School.',
      title: 'We Received Your Message',
      intro: 'Thanks for contacting us. A member of our team will follow up soon.',
      body,
      footerNote: 'If you did not submit this message, you can ignore this email.'
    }),
    text
  };
};

const loadEmailRoutingSettings = async (source: SubmissionSource) => {
  const settings = await db.content.getAllSettings();
  const schoolEmail = resolveSchoolEmail(settings);

  const notifyRecipientsKey =
    source === 'coming-soon' ? 'coming_soon_form_notify_emails' : 'contact_form_notify_emails';
  const notifyRecipients = parseEmailList(settings[notifyRecipientsKey]);

  const notifySubjectKey =
    source === 'coming-soon' ? 'coming_soon_form_notify_subject' : 'contact_form_notify_subject';
  const notifySubjectTemplate =
    asString(settings[notifySubjectKey]) ||
    (source === 'coming-soon'
      ? 'New Coming Soon Inquiry - {{name}}'
      : 'New Contact Form Inquiry - {{name}}');

  const confirmEnabledKey =
    source === 'coming-soon'
      ? 'coming_soon_form_confirm_submitter'
      : 'contact_form_confirm_submitter';
  const sendConfirmation = asBool(settings[confirmEnabledKey], true);

  const confirmSubjectKey =
    source === 'coming-soon'
      ? 'coming_soon_form_confirm_subject'
      : 'contact_form_confirm_subject';
  const confirmSubjectTemplate =
    asString(settings[confirmSubjectKey]) ||
    (source === 'coming-soon'
      ? 'Thanks for your interest in Spicebush Montessori'
      : 'Thanks for contacting Spicebush Montessori');

  return {
    schoolEmail,
    notifyRecipients: notifyRecipients.length > 0 ? notifyRecipients : [schoolEmail],
    notifySubjectTemplate,
    sendConfirmation,
    confirmSubjectTemplate
  };
};

export const sendContactSubmissionEmails = async (
  input: ContactSubmissionEmailInput
): Promise<ContactSubmissionEmailResult> => {
  const config = await loadEmailRoutingSettings(input.source);

  const result: ContactSubmissionEmailResult = {
    notificationSent: false,
    confirmationSent: false,
    notifiedRecipients: config.notifyRecipients,
    errors: []
  };

  const notificationContent = buildNotificationEmail(input);
  const notificationSubject = interpolate(config.notifySubjectTemplate, input);

  const notificationResult = await emailService.send({
    to: config.notifyRecipients,
    subject: notificationSubject,
    html: notificationContent.html,
    text: notificationContent.text,
    replyTo: input.email,
    fromName: BRAND_NAME
  });

  if (notificationResult.success) {
    result.notificationSent = true;
  } else {
    result.errors.push(
      `notification: ${notificationResult.error || 'Failed to send notification email'}`
    );
  }

  if (config.sendConfirmation && isEmail(input.email)) {
    const confirmationContent = buildConfirmationEmail(input);
    const confirmationSubject = interpolate(config.confirmSubjectTemplate, input);
    const confirmationResult = await emailService.send({
      to: input.email,
      subject: confirmationSubject,
      html: confirmationContent.html,
      text: confirmationContent.text,
      fromName: BRAND_NAME
    });

    if (confirmationResult.success) {
      result.confirmationSent = true;
    } else {
      result.errors.push(
        `confirmation: ${confirmationResult.error || 'Failed to send confirmation email'}`
      );
    }
  }

  return result;
};
