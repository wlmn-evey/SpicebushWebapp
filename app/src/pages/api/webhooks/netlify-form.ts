import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * Simple webhook endpoint for Netlify Forms
 * 
 * This endpoint receives form submissions from Netlify and stores them
 * in our database for record-keeping purposes only.
 * 
 * The primary form handling is done by Netlify Forms - this is just
 * a backup/logging mechanism.
 */

// Get Supabase credentials from environment
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Initialize Supabase client with service role key for admin access
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      // Don't fail the webhook - Netlify has already handled the form
      return new Response('Configuration error', { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the submission in our database
    const { error } = await supabase
      .from('contact_form_submissions')
      .insert({
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || null,
        subject: formData.subject || '',
        message: formData.message || '',
        child_age: formData['child-age'] || null,
        tour_interest: formData['tour-interest'] === 'yes'
      });

    if (error) {
      console.error('Error storing form submission:', error);
      // Don't fail the webhook - this is just logging
    }

    // Always return success to Netlify
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't fail the webhook - Netlify has already handled the form
    return new Response('OK', { status: 200 });
  }
};