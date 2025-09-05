/**
 * Netlify Function: Send Magic Link via Clerk
 * Handles magic link authentication for admin users
 */

import { Clerk } from '@clerk/backend';

// Initialize Clerk with secret key
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// Allowed email domains for admin access
const ALLOWED_DOMAINS = ['@spicebushmontessori.org', '@eveywinters.com'];

export async function handler(event) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

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

    // Create magic link sign-in attempt
    try {
      // First, check if user exists
      const users = await clerk.users.getUserList({
        emailAddress: [email]
      });

      let user = users.data?.[0];

      // If user doesn't exist, create one
      if (!user) {
        user = await clerk.users.createUser({
          emailAddress: [email],
          skipPasswordRequirement: true,
        });
      }

      // Create a sign-in token for the user
      const signInToken = await clerk.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: 900, // 15 minutes
      });

      // Generate the magic link URL
      const magicLinkUrl = `${process.env.URL || 'https://spicebush-testing.netlify.app'}/auth/callback?token=${signInToken.token}`;

      // Here you would normally send the email using your email service
      // For now, we'll return the magic link for testing
      // In production, integrate with Unione.io or another email service
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Magic link sent successfully',
          // Remove this in production - only for testing
          debugUrl: magicLinkUrl
        })
      };

    } catch (clerkError) {
      console.error('Clerk error:', clerkError);
      
      // Handle specific Clerk errors
      if (clerkError.errors?.[0]?.code === 'form_identifier_not_found') {
        return {
          statusCode: 404,
          body: JSON.stringify({ 
            error: 'User not found. Please contact administrator.' 
          })
        };
      }

      throw clerkError;
    }

  } catch (error) {
    console.error('Magic link error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send magic link',
        details: error.message 
      })
    };
  }
}