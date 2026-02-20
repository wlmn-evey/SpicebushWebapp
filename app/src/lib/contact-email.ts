import { db } from '@lib/db';
import { emailService } from '@lib/email-service';
import {
  buildSchoolContactFooterHtml,
  buildSchoolContactFooterText,
  resolveSchoolEmailContactInfo,
  type SchoolEmailContactInfo
} from '@lib/email-template-footer';

export type SubmissionSource = 'contact' | 'coming-soon' | 'camp' | 'tour';

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

const BRAND_NAME = 'Spicebush Montessori School';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SourceRoutingConfig = {
  label: string;
  notifyRecipientsKey: string;
  notifySubjectKey: string;
  confirmEnabledKey: string;
  confirmSubjectKey: string;
  defaultNotifySubject: string;
  defaultConfirmSubject: string;
};

const SOURCE_CONFIG: Record<SubmissionSource, SourceRoutingConfig> = {
  contact: {
    label: 'Contact Form Inquiry',
    notifyRecipientsKey: 'contact_form_notify_emails',
    notifySubjectKey: 'contact_form_notify_subject',
    confirmEnabledKey: 'contact_form_confirm_submitter',
    confirmSubjectKey: 'contact_form_confirm_subject',
    defaultNotifySubject: 'New Contact Form Inquiry - {{name}}',
    defaultConfirmSubject: 'Thanks for contacting Spicebush Montessori'
  },
  'coming-soon': {
    label: 'Coming Soon Inquiry',
    notifyRecipientsKey: 'coming_soon_form_notify_emails',
    notifySubjectKey: 'coming_soon_form_notify_subject',
    confirmEnabledKey: 'coming_soon_form_confirm_submitter',
    confirmSubjectKey: 'coming_soon_form_confirm_subject',
    defaultNotifySubject: 'New Coming Soon Inquiry - {{name}}',
    defaultConfirmSubject: 'Thanks for your interest in Spicebush Montessori'
  },
  camp: {
    label: 'Camp Inquiry',
    notifyRecipientsKey: 'camp_form_notify_emails',
    notifySubjectKey: 'camp_form_notify_subject',
    confirmEnabledKey: 'camp_form_confirm_submitter',
    confirmSubjectKey: 'camp_form_confirm_subject',
    defaultNotifySubject: 'New Camp Question - {{name}}',
    defaultConfirmSubject: 'Thanks for your camp question'
  },
  tour: {
    label: 'Tour Request',
    notifyRecipientsKey: 'tour_request_notify_emails',
    notifySubjectKey: 'tour_request_notify_subject',
    confirmEnabledKey: 'tour_request_confirm_submitter',
    confirmSubjectKey: 'tour_request_confirm_subject',
    defaultNotifySubject: 'New Tour Request - {{name}}',
    defaultConfirmSubject: 'Tour Request Confirmation - Spicebush Montessori'
  }
};

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

const sourceLabel = (source: SubmissionSource): string => SOURCE_CONFIG[source].label;

const interpolate = (template: string, input: ContactSubmissionEmailInput): string =>
  template
    .replaceAll('{{name}}', input.name)
    .replaceAll('{{subject}}', input.subject)
    .replaceAll('{{source}}', sourceLabel(input.source));

const formatMultiline = (value: string): string => escapeHtml(value).replace(/\n/g, '<br/>');

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
  contactInfo,
  footerNote
}: {
  preheader: string;
  title: string;
  intro: string;
  body: string;
  contactInfo: SchoolEmailContactInfo;
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
              ${buildSchoolContactFooterHtml(contactInfo, { footerNote })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const buildNotificationEmail = (
  input: ContactSubmissionEmailInput,
  contactInfo: SchoolEmailContactInfo
) => {
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
    input.message,
    '',
    buildSchoolContactFooterText(contactInfo, {
      footerNote: 'Reply directly to this email to respond to the parent.'
    })
  ].join('\n');

  return {
    html: emailShell({
      preheader: `New ${sourceLabel(input.source).toLowerCase()} received.`,
      title: 'New Family Inquiry',
      intro: `A new ${sourceLabel(input.source).toLowerCase()} has been submitted through the website.`,
      body,
      contactInfo,
      footerNote: 'Reply directly to this email to respond to the parent.'
    }),
    text
  };
};

const confirmationBodyLineBySource = (input: ContactSubmissionEmailInput): string => {
  if (input.source === 'tour') {
    return 'We received your tour request and our admissions team will follow up to schedule your visit.';
  }

  if (input.source === 'camp') {
    return 'Thanks for your camp question. Our admissions team will follow up shortly with details.';
  }

  if (input.tourInterest) {
    return 'You mentioned interest in touring, so we will include next-step scheduling details in our reply.';
  }

  return 'If you would like to tour the school, just reply and we can help schedule that as well.';
};

const buildConfirmationEmail = (
  input: ContactSubmissionEmailInput,
  contactInfo: SchoolEmailContactInfo
) => {
  const followupText = confirmationBodyLineBySource(input);

  const body = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#2f3a34;">Hi ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#2f3a34;">
      Thank you for reaching out to ${BRAND_NAME}. We received your message and our team will get back to you shortly.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#2f3a34;">${escapeHtml(followupText)}</p>
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
    followupText,
    '',
    'Your message:',
    input.message,
    '',
    'Warmly,',
    BRAND_NAME,
    '',
    buildSchoolContactFooterText(contactInfo)
  ].join('\n');

  return {
    html: emailShell({
      preheader: 'We received your message at Spicebush Montessori School.',
      title: 'We Received Your Message',
      intro: 'Thanks for contacting us. A member of our team will follow up soon.',
      body,
      contactInfo,
      footerNote: 'If you did not submit this message, you can ignore this email.'
    }),
    text
  };
};

const loadEmailRoutingSettings = async (source: SubmissionSource) => {
  const settings = await db.content.getAllSettings();
  const contactInfo = resolveSchoolEmailContactInfo(settings);
  const schoolEmail = contactInfo.email;
  const sourceConfig = SOURCE_CONFIG[source];

  const notifyRecipients = parseEmailList(settings[sourceConfig.notifyRecipientsKey]);
  const notifySubjectTemplate =
    asString(settings[sourceConfig.notifySubjectKey]) || sourceConfig.defaultNotifySubject;
  const sendConfirmation = asBool(settings[sourceConfig.confirmEnabledKey], true);
  const confirmSubjectTemplate =
    asString(settings[sourceConfig.confirmSubjectKey]) || sourceConfig.defaultConfirmSubject;

  return {
    schoolEmail,
    contactInfo,
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

  const notificationContent = buildNotificationEmail(input, config.contactInfo);
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
    const confirmationContent = buildConfirmationEmail(input, config.contactInfo);
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
