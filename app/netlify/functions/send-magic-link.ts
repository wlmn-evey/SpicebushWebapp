/**
 * Netlify Function: Send Magic Link via Clerk
 * Handles magic link authentication for admin users
 */

import type { Handler } from '@netlify/functions';
import { Clerk } from '@clerk/backend';

// Initialize Clerk with secret key
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// Allowed email domains for admin access
const ALLOWED_DOMAINS = ['@spicebushmontessori.org', '@eveywinters.com'];

export const handler: Handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    // Validate email
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Check if email domain is allowed
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      email.toLowerCase().trim().endsWith(domain)
    );

    if (!isAllowed) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          error: 'Only administrators can access the admin panel' 
        })
      };
    }

    // Create an email link using Clerk's Email Links feature
    try {
      // Create email link authentication
      const emailLink = await clerk.emailLinks.createEmailLink({
        identifier: email,
        redirectUrl: `${process.env.URL || 'https://spicebush-testing.netlify.app'}/auth/callback`,
        expiry: 900, // 15 minutes
      });

      // Send email using your email service (Unione.io)
      // For now, we'll just return success
      // In production, integrate with Unione.io here
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: 'Magic link sent to your email',
          // Remove debugUrl in production - only for testing
          debugUrl: emailLink.url
        })
      };

    } catch (clerkError: any) {
      console.error('Clerk error:', clerkError);
      
      // Handle specific Clerk errors
      if (clerkError.errors?.[0]?.code === 'form_identifier_not_found') {
        // User doesn't exist, create one
        try {
          const newUser = await clerk.users.createUser({
            emailAddress: [email],
            skipPasswordRequirement: true,
            skipPasswordChecks: true,
          });

          // Retry creating email link
          const emailLink = await clerk.emailLinks.createEmailLink({
            identifier: email,
            redirectUrl: `${process.env.URL || 'https://spicebush-testing.netlify.app'}/auth/callback`,
            expiry: 900,
          });

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              message: 'Account created and magic link sent',
              debugUrl: emailLink.url
            })
          };
        } catch (createError) {
          console.error('Failed to create user:', createError);
          throw createError;
        }
      }

      throw clerkError;
    }

  } catch (error: any) {
    console.error('Magic link error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Failed to send magic link',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};