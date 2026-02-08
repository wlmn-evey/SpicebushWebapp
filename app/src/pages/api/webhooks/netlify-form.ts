import type { APIRoute } from 'astro';
import { query } from '@lib/db/client';
import { logServerError, logServerWarn } from '@lib/server-logger';

/**
 * Simple webhook endpoint for Netlify Forms
 * 
 * This endpoint receives form submissions from Netlify and stores them
 * in our database for record-keeping purposes only.
 * 
 * The primary form handling is done by Netlify Forms - this is just
 * a backup/logging mechanism.
 */

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify this is from Netlify (simple check - in production you'd want to verify a webhook signature)
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return new Response('Invalid content type', { status: 400 });
    }

    // Parse the webhook payload
    const payload = await request.json();
    
    // Extract form data from Netlify's webhook format
    const formData = payload.data || payload;
    
    // Only process contact form submissions
    if (payload.form_name !== 'contact-form' && !formData.subject) {
      return new Response('Not a contact form submission', { status: 200 });
    }

    // Ensure database configuration exists
    const hasDatabaseUrl = Boolean(import.meta.env.NETLIFY_DATABASE_URL || import.meta.env.DATABASE_URL);
    if (!hasDatabaseUrl) {
      logServerWarn('Netlify form webhook skipped due to missing database credentials', {
        route: '/api/webhooks/netlify-form'
      });
      // Don't fail the webhook - Netlify has already handled the form
      return new Response('Configuration error', { status: 200 });
    }

    // Store the submission in our database
    try {
      await query(
        `
          INSERT INTO contact_form_submissions
          (name, email, phone, subject, message, child_age, tour_interest)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          formData.name || '',
          formData.email || '',
          formData.phone || null,
          formData.subject || '',
          formData.message || '',
          formData['child-age'] || null,
          formData['tour-interest'] === 'yes'
        ]
      );
    } catch (error) {
      logServerWarn('Failed to store Netlify form submission', {
        route: '/api/webhooks/netlify-form',
        error
      });
      // Don't fail the webhook - this is just logging
    }

    // Always return success to Netlify
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    logServerError('Netlify form webhook processing failed', error, {
      route: '/api/webhooks/netlify-form'
    });
    // Don't fail the webhook - Netlify has already handled the form
    return new Response('OK', { status: 200 });
  }
};
