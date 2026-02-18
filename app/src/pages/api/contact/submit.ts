import type { APIRoute } from 'astro';
import { query } from '@lib/db/client';
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

const detectSource = (formData: FormData): SubmissionSource => {
  if (
    typeof formData.get('parent-name') === 'string'
    || typeof formData.get('child-birthdate') === 'string'
    || parseString(formData.get('form-name')) === 'coming-soon-contact'
    || parseString(formData.get('source')) === 'coming-soon'
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
  source === 'contact' ? '/contact?error=submission-failed' : '/coming-soon?error=submission-failed';

export const POST: APIRoute = async ({ request, redirect }) => {
  let source: SubmissionSource = 'contact';

  try {
    const formData = await request.formData();
    source = detectSource(formData);

    const honeypot = parseString(formData.get('bot-field'));
    const requestedRedirect = parseRedirectPath(formData.get('redirectTo'));
    const successRedirect = requestedRedirect ?? successRedirectFor(source);

    // Silently accept obvious bot submissions while skipping storage.
    if (honeypot.length > 0) {
      return redirect(successRedirect);
    }

    const name = source === 'coming-soon'
      ? parseString(formData.get('parent-name'))
      : parseString(formData.get('name'));
    const email = parseString(formData.get('email'));
    const phoneValue = parseString(formData.get('phone'));
    const subject = toSubject(source, formData);
    const message = toMessage(source, formData);
    const childAge = toChildAge(source, formData);
    const tourInterest = toTourInterest(source, formData);

    if (!name || !email) {
      return redirect(errorRedirectFor(source));
    }

    await query(
      `
        INSERT INTO contact_form_submissions
        (name, email, phone, subject, message, child_age, tour_interest)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        name,
        email,
        phoneValue || null,
        subject,
        message,
        childAge,
        tourInterest
      ]
    );

    return redirect(successRedirect);
  } catch (error) {
    logServerError('Failed to process contact form submission', error, {
      route: '/api/contact/submit',
      source
    });
    return redirect(errorRedirectFor(source));
  }
};

export const GET: APIRoute = async ({ redirect }) => {
  logServerWarn('Unexpected GET on contact submission endpoint', {
    route: '/api/contact/submit'
  });
  return redirect('/contact');
};
