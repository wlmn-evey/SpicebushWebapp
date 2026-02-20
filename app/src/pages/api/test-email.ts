import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { emailService } from '@lib/email-service';
import {
  buildSchoolContactFooterHtml,
  buildSchoolContactFooterText,
  resolveSchoolEmailContactInfo
} from '@lib/email-template-footer';

const DEFAULT_TEST_EMAIL = 'information@spicebushmontessori.org';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const url = new URL(request.url);
  const requestedEmail = String(url.searchParams.get('email') || auth.user?.email || DEFAULT_TEST_EMAIL).trim();
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
      message: result.success ? `Test email sent to ${testEmail}` : `Failed to send email: ${result.error}`,
      provider: result.provider,
      messageId: result.messageId,
      serviceStatus: status,
      preferredProvider: emailService.getPreferredProvider()
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      serviceStatus: emailService.getStatus()
    });
  }
};
