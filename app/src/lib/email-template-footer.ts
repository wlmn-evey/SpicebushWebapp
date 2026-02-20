const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\//i;

const DEFAULT_SCHOOL_EMAIL = 'information@spicebushmontessori.org';
const DEFAULT_SCHOOL_PHONE = '(484) 202-0712';
const DEFAULT_ADDRESS = {
  street: '827 Concord Road',
  city: 'Glen Mills',
  state: 'PA',
  zip: '19342'
};

export const EMAIL_CONFIDENTIALITY_NOTICE =
  'This message is intended for school-family communication only and is not meant to be published or shared publicly.';

export interface SchoolEmailContactInfo {
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  addressSingleLine: string;
  addressMultiLine: string;
  directionsUrl: string;
}

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return fallback;
};

const isEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());

const isHttpUrl = (value: string): boolean => URL_REGEX.test(value.trim());

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const compactAddress = ({ street, city, state, zip }: Pick<SchoolEmailContactInfo, 'street' | 'city' | 'state' | 'zip'>): string => {
  const locationBits = [city, state].filter((part) => part.length > 0);
  const location = [locationBits.join(', '), zip].filter(Boolean).join(' ').trim();
  return [street, location].filter(Boolean).join(', ').trim();
};

const multiLineAddress = ({ street, city, state, zip }: Pick<SchoolEmailContactInfo, 'street' | 'city' | 'state' | 'zip'>): string => {
  const lineTwo = [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ').trim();
  return [street, lineTwo].filter(Boolean).join('\n');
};

const buildDirectionsUrl = (
  providedUrl: string,
  addressFallback: string
): string => {
  if (isHttpUrl(providedUrl)) {
    return providedUrl;
  }

  const query = encodeURIComponent(addressFallback || DEFAULT_ADDRESS.street);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

const sanitizePhoneForTel = (phone: string): string => phone.replace(/[^\d+]/g, '');

export const resolveSchoolEmailContactInfo = (
  settings: Record<string, unknown>
): SchoolEmailContactInfo => {
  const emailCandidates = [
    asString(settings.school_email),
    asString(settings.main_email),
    asString(settings.contact_email),
    DEFAULT_SCHOOL_EMAIL
  ];

  const email = emailCandidates.find((candidate) => isEmail(candidate)) || DEFAULT_SCHOOL_EMAIL;

  const phone =
    asString(settings.school_phone) || asString(settings.contact_phone) || DEFAULT_SCHOOL_PHONE;

  const street = asString(settings.school_address_street) || DEFAULT_ADDRESS.street;
  const city = asString(settings.school_address_city) || DEFAULT_ADDRESS.city;
  const state = asString(settings.school_address_state) || DEFAULT_ADDRESS.state;
  const zip = asString(settings.school_address_zip) || DEFAULT_ADDRESS.zip;

  const addressSingleLine = compactAddress({ street, city, state, zip });
  const addressMultiLine = multiLineAddress({ street, city, state, zip });

  const directionsUrl = buildDirectionsUrl(
    asString(settings.school_directions_link) || asString(settings.directions_external_link),
    addressSingleLine
  );

  return {
    email,
    phone,
    street,
    city,
    state,
    zip,
    addressSingleLine,
    addressMultiLine,
    directionsUrl
  };
};

export const buildSchoolContactFooterHtml = (
  info: SchoolEmailContactInfo,
  options?: { footerNote?: string }
): string => {
  const telHref = sanitizePhoneForTel(info.phone);
  const phoneDisplay = escapeHtml(info.phone);
  const emailDisplay = escapeHtml(info.email);
  const addressDisplay = escapeHtml(info.addressMultiLine).replace(/\n/g, '<br/>');
  const directionsDisplay = escapeHtml(info.directionsUrl);
  const footerNote = options?.footerNote ? escapeHtml(options.footerNote) : '';

  return `
    <div style="margin-top:18px;padding:14px;border:1px solid #dce4db;border-radius:10px;background:#f8fbf8;">
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:#597565;font-weight:700;">School Contact & Directions</p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#2f3a34;"><strong>Phone:</strong> <a href="tel:${escapeHtml(telHref)}" style="color:#2f6a4f;text-decoration:underline;">${phoneDisplay}</a></p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#2f3a34;"><strong>Email:</strong> <a href="mailto:${emailDisplay}" style="color:#2f6a4f;text-decoration:underline;">${emailDisplay}</a></p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#2f3a34;"><strong>Address:</strong><br/>${addressDisplay}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#2f3a34;"><strong>Directions:</strong> <a href="${directionsDisplay}" style="color:#2f6a4f;text-decoration:underline;">Open in Maps</a></p>
    </div>
    ${footerNote ? `<p style="margin:10px 0 0;color:#5f6f67;font-size:13px;line-height:1.5;">${footerNote}</p>` : ''}
    <p style="margin:10px 0 0;color:#5f6f67;font-size:12px;line-height:1.5;">${escapeHtml(EMAIL_CONFIDENTIALITY_NOTICE)}</p>
  `;
};

export const buildSchoolContactFooterText = (
  info: SchoolEmailContactInfo,
  options?: { footerNote?: string }
): string => {
  const parts = [
    'School Contact & Directions',
    `Phone: ${info.phone}`,
    `Email: ${info.email}`,
    `Address: ${info.addressSingleLine}`,
    `Directions: ${info.directionsUrl}`
  ];

  if (options?.footerNote) {
    parts.push(options.footerNote);
  }

  parts.push(`Confidentiality notice: ${EMAIL_CONFIDENTIALITY_NOTICE}`);
  return parts.join('\n');
};
