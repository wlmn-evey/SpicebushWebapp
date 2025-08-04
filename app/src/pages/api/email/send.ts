import type { APIRoute } from 'astro';
import { emailService } from '@lib/email-service';
import type { EmailMessage } from '@lib/email-service';

/**
 * API endpoint for sending emails using the configured email service
 * 
 * This endpoint is used internally by the application to send transactional emails
 * such as contact form notifications, tour scheduling confirmations, etc.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.to || !body.subject || (!body.text && !body.html)) {
      return new Response(JSON.stringify({
        error: 'Missing required fields. Required: to, subject, and either text or html'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare email message
    const message: EmailMessage = {
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
      from: body.from,
      fromName: body.fromName,
      replyTo: body.replyTo
    };

    // Send email using the email service
    const result = await emailService.send(message);

    if (!result.success) {
      return new Response(JSON.stringify({
        error: result.error,
        provider: result.provider
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      provider: result.provider
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * GET endpoint to check email service status
 */
export const GET: APIRoute = async () => {
  try {
    const status = emailService.getStatus();
    const configured = Object.values(status).some(v => v);

    return new Response(JSON.stringify({
      configured,
      providers: status,
      preferredProvider: import.meta.env.EMAIL_SERVICE || 'auto'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email status check error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to check email service status'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};