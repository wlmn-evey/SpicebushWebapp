import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { emailService } from '@lib/email-service';
import {
  buildSchoolContactFooterHtml,
  buildSchoolContactFooterText,
  resolveSchoolEmailContactInfo
} from '@lib/email-template-footer';
import { logServerError } from '@lib/server-logger';

const DEFAULT_TEST_EMAIL = 'information@spicebushmontessori.org';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const readRequestedEmail = async (request: Request): Promise<string> => {
  const fromQuery = new URL(request.url).searchParams.get('email');
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { email?: unknown };
      return typeof body.email === 'string' ? body.email : '';
    }
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const value = (await request.formData()).get('email');
      return typeof value === 'string' ? value : '';
    }
  } catch {
    // Malformed body: fall back to the default recipient.
  }
  return '';
};

// Sending mail is a side effect, so GET is refused: a cross-site link or prefetch must
// never trigger a send with an attacker-chosen ?email= (SameSite=Lax cookies ride along
// on top-level GET navigations, but not on cross-site POSTs).
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const requestedEmail = String(
    (await readRequestedEmail(request)) || auth.user?.email || DEFAULT_TEST_EMAIL
  ).trim();
  const testEmail = EMAIL_REGEX.test(requestedEmail) ? requestedEmail : DEFAULT_TEST_EMAIL;

  try {
    const status = emailService.getStatus();
    let contactInfo = resolveSchoolEmailContactInfo({});
    try {
      const settings = await db.content.getAllSettings();
      contactInfo = resolveSchoolEmailContactInfo(settings);
    } catch {
      // Keep defaults when settings are unavailable.
    }

    const result = await emailService.send({
      to: testEmail,
      subject: `Spicebush Email Test - ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c5530;">Email Service Test</h2>
          <p>This is a test email from the Spicebush Montessori website.</p>
          ${buildSchoolContactFooterHtml(contactInfo)}
        </div>
      `,
      text: `Email Service Test\n\nThis is a test email from the Spicebush Montessori website.\n\n${buildSchoolContactFooterText(contactInfo)}`
    });

    return jsonResponse(result.success ? 200 : 500, {
      success: result.success,
      message: result.success
        ? `Test email sent to ${testEmail}`
        : `Failed to send email: ${result.error}`,
      provider: result.provider,
      messageId: result.messageId,
      serviceStatus: status,
      preferredProvider: emailService.getPreferredProvider()
    });
  } catch (error) {
    logServerError('Test email send failed', error, { route: '/api/test-email' });
    return jsonResponse(500, {
      error: 'Failed to send test email',
      serviceStatus: emailService.getStatus()
    });
  }
};
