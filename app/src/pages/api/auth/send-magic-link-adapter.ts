import type { APIRoute } from 'astro';
import { auth } from '@lib/auth';
import { EmailService } from '@lib/email-service';
import { checkAdminAccess } from '@lib/auth/clerk-helpers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    
    // Validate email has admin access
    if (!checkAdminAccess(email)) {
      return new Response(JSON.stringify({
        error: 'Only administrators can access the admin panel'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Use the auth adapter to send magic link
    const result = await auth.sendMagicLink(email);
    
    if (!result.success) {
      console.error('Magic link error:', result.error);
      return new Response(JSON.stringify({
        error: result.error || 'Failed to send magic link'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If using Clerk, it handles email sending automatically
    // If using Supabase, we might need to send custom email
    if (auth.getProvider() === 'supabase' && result.requiresCustomEmail) {
      // Send custom email using Unione.io API
      const emailService = new EmailService();
      const magicLinkUrl = result.magicLinkUrl || `${import.meta.env.PUBLIC_SITE_URL}/auth/callback`;
      
      const emailResult = await emailService.send({
        to: email,
        from: 'noreply@spicebushmontessori.org',
        fromName: 'Spicebush Montessori School',
        subject: 'Sign in to Spicebush Admin',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2c5530; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .button { display: inline-block; padding: 12px 30px; background-color: #4a7c59; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Spicebush Montessori School</h1>
              </div>
              <div class="content">
                <h2>Sign in to your admin account</h2>
                <p>Hello,</p>
                <p>You requested a sign-in link for the Spicebush Montessori admin panel. Click the button below to access your account:</p>
                <p style="text-align: center;">
                  <a href="${magicLinkUrl}" class="button">Sign In to Admin Panel</a>
                </p>
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                <p>If you didn't request this link, you can safely ignore this email.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 14px; color: #666;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <span style="word-break: break-all;">${magicLinkUrl}</span>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Spicebush Montessori School</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Sign in to Spicebush Montessori Admin

Hello,

You requested a sign-in link for the Spicebush Montessori admin panel. Click the link below to access your account:

${magicLinkUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this link, you can safely ignore this email.

© ${new Date().getFullYear()} Spicebush Montessori School
This is an automated email. Please do not reply.`
      });
      
      if (!emailResult.success) {
        console.error('Custom email error:', emailResult.error);
        // Still return success since Supabase sent its own email
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Magic link sent successfully',
      provider: auth.getProvider(),
      debugUrl: result.debugUrl // For testing - remove in production
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Send magic link error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};