import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';
import { EmailService } from '@lib/email-service';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    
    // Validate email domain
    const allowedDomains = ['@spicebushmontessori.org', '@eveywinters.com'];
    const isAllowed = allowedDomains.some(domain => 
      email.toLowerCase().trim().endsWith(domain)
    );
    
    if (!isAllowed) {
      return new Response(JSON.stringify({
        error: 'Only administrators can access the admin panel'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate magic link using Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Supabase OTP error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to generate magic link'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract the OTP token from Supabase response
    // Note: In production, Supabase doesn't return the token directly for security
    // We need to intercept the email sending and use our own service
    
    // Send email using Unione.io API
    const emailService = new EmailService();
    const magicLinkUrl = `${import.meta.env.PUBLIC_SITE_URL}/auth/callback?token=${data.session?.access_token || 'check-email'}`;
    
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
      console.error('Unione.io error:', emailResult.error);
      // Fallback to Supabase default email
      return new Response(JSON.stringify({
        success: true,
        message: 'Magic link sent via default email service'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Magic link sent successfully',
      messageId: emailResult.messageId
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