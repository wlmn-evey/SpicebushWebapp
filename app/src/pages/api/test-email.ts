import type { APIRoute } from 'astro';
import { emailService } from '../../lib/email-service';

export const GET: APIRoute = async ({ request }) => {
  // Only allow in development or with a secret query parameter
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const testEmail = url.searchParams.get('email') || 'information@spicebushmontessori.org';
  
  // Simple security check
  if (import.meta.env.PROD && secret !== 'spicebush2025test') {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get email service status
    const status = emailService.getStatus();
    
    // Try to send a test email
    const result = await emailService.send({
      to: testEmail,
      subject: `Spicebush Email Test - ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c5530;">Email Service Test</h2>
          
          <p>This is a test email from the Spicebush Montessori website.</p>
          
          <h3>Configuration Status:</h3>
          <ul>
            <li>Unione: ${status.Unione ? '✅ Configured' : '❌ Not configured'}</li>
            <li>SendGrid: ${status.SendGrid ? '✅ Configured' : '❌ Not configured'}</li>
            <li>Postmark: ${status.Postmark ? '✅ Configured' : '❌ Not configured'}</li>
            <li>Resend: ${status.Resend ? '✅ Configured' : '❌ Not configured'}</li>
          </ul>
          
          <p><strong>Environment:</strong></p>
          <ul>
            <li>Site URL: ${import.meta.env.PUBLIC_SITE_URL}</li>
            <li>Region: ${import.meta.env.UNIONE_REGION || 'us'}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
            <li>HTTPS: ${url.protocol === 'https:' ? 'Yes' : 'No'}</li>
          </ul>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated test email. If you received this, the email service is working correctly!
          </p>
        </div>
      `,
      text: `Email Service Test

This is a test email from the Spicebush Montessori website.

Configuration Status:
- Unione: ${status.Unione ? 'Configured' : 'Not configured'}
- SendGrid: ${status.SendGrid ? 'Configured' : 'Not configured'}
- Postmark: ${status.Postmark ? 'Configured' : 'Not configured'}
- Resend: ${status.Resend ? 'Configured' : 'Not configured'}

Environment:
- Site URL: ${import.meta.env.PUBLIC_SITE_URL}
- Region: ${import.meta.env.UNIONE_REGION || 'us'}
- Timestamp: ${new Date().toISOString()}
- HTTPS: ${url.protocol === 'https:' ? 'Yes' : 'No'}

This is an automated test email.`
    });
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.success 
        ? `Test email sent to ${testEmail}` 
        : `Failed to send email: ${result.error}`,
      provider: result.provider,
      messageId: result.messageId,
      serviceStatus: status,
      environment: {
        url: import.meta.env.PUBLIC_SITE_URL,
        https: url.protocol === 'https:',
        region: import.meta.env.UNIONE_REGION || 'us'
      }
    }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      serviceStatus: emailService.getStatus()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};