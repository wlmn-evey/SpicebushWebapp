import type { APIRoute } from 'astro';
import { emailService } from '@lib/email-service';
import { logServerError, logServerWarn } from '@lib/server-logger';

const DEFAULT_TOUR_INBOX = 'information@spicebushmontessori.org';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { parentName, email, phone, childAge, preferredTimes, questions } = data;

    // Validate required fields
    if (!parentName || !email || !phone || !childAge) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeParentName = escapeHtml(String(parentName));
    const safeEmail = escapeHtml(String(email));
    const safePhone = escapeHtml(String(phone));
    const safeChildAge = escapeHtml(String(childAge));
    const safePreferredTimes = preferredTimes ? escapeHtml(String(preferredTimes)) : '';
    const safeQuestions = questions ? escapeHtml(String(questions)) : '';
    const schoolInbox = import.meta.env.SCHOOL_CONTACT_EMAIL || DEFAULT_TOUR_INBOX;

    // Create email content
    const emailContent = `
      <h2>New Tour Request</h2>
      <p><strong>Parent/Guardian Name:</strong> ${safeParentName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>Child's Age:</strong> ${safeChildAge}</p>
      ${safePreferredTimes ? `<p><strong>Preferred Times:</strong> ${safePreferredTimes}</p>` : ''}
      ${safeQuestions ? `<p><strong>Questions/Special Considerations:</strong> ${safeQuestions}</p>` : ''}
      <hr>
      <p><em>This tour request was submitted via the website on ${new Date().toLocaleString()}</em></p>
    `;

    // For development, we'll just log the email content
    // In production, you would configure a real email service
    if (import.meta.env.DEV) {
      // Tour request email prepared

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Tour request received (development mode - email logged to console)' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email using the configured email service
    const result = await emailService.send({
      to: schoolInbox,
      subject: `New Tour Request from ${safeParentName}`,
      html: emailContent,
      replyTo: email
    });

    if (!result.success) {
      logServerError('Failed to send tour request email', result.error, { route: '/api/schedule-tour' });
      return new Response(
        JSON.stringify({ error: 'Failed to send tour request. Please try again later.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send confirmation email to parent
    const confirmationEmail = `
      <h2>Thank you for your interest in Spicebush Montessori School!</h2>
      <p>We've received your tour request and will contact you within 1-2 business days to schedule your visit.</p>
      <p>If you have any immediate questions, please reply to this email and our team will help.</p>
      <p>We look forward to meeting you and showing you our wonderful school!</p>
      <hr>
      <p><strong>Your Tour Request Details:</strong></p>
      <p>Child's Age: ${safeChildAge}</p>
      ${safePreferredTimes ? `<p>Preferred Times: ${safePreferredTimes}</p>` : ''}
      ${safeQuestions ? `<p>Questions: ${safeQuestions}</p>` : ''}
    `;

    // Send confirmation email to parent
    const confirmationResult = await emailService.send({
      to: email,
      subject: 'Tour Request Confirmation - Spicebush Montessori School',
      html: confirmationEmail
    });

    if (!confirmationResult.success) {
      logServerWarn('Failed to send tour confirmation email', {
        route: '/api/schedule-tour',
        error: confirmationResult.error
      });
      // Don't fail the request if confirmation email fails
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Tour request submitted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logServerError('Error processing tour request', error, { route: '/api/schedule-tour' });
    
    return new Response(
      JSON.stringify({ error: 'Failed to process tour request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
