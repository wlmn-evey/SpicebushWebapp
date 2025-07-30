import type { APIRoute } from 'astro';
import { errorResponse } from '@lib/api-utils';
import { validators } from '@lib/form-validation';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate email
    const emailError = validators.email(data.email);
    if (emailError) {
      return errorResponse(emailError, 400);
    }
    
    // Get metadata for logging
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';
    const signup_page = data.signup_page || request.headers.get('referer') || 'unknown';
    
    // Subscribe the user using Supabase
    const email = data.email.trim().toLowerCase();
    
    // Check if email already exists
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', email)
      .single();
    
    let result;
    
    if (existing) {
      // If they're already active, just return success
      if (existing.subscription_status === 'active') {
        result = { 
          success: true, 
          message: 'You are already subscribed to our newsletter!',
          subscriber: existing 
        };
      } else if (existing.subscription_status === 'unsubscribed') {
        // If they unsubscribed before, reactivate
        const { data: updated, error } = await supabase
          .from('newsletter_subscribers')
          .update({ 
            subscription_status: 'active',
            unsubscribed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single();
        
        if (error) throw error;
        
        result = { 
          success: true, 
          message: 'Welcome back! You have been resubscribed to our newsletter.',
          subscriber: updated 
        };
      } else {
        result = { 
          success: true, 
          message: 'Your subscription is being processed.',
          subscriber: existing 
        };
      }
    } else {
      // New subscriber
      const { data: newSubscriber, error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email,
          first_name: data.first_name?.trim() || null,
          last_name: data.last_name?.trim() || null,
          subscription_type: data.subscription_type || 'general',
          signup_source: data.signup_source || 'website',
          signup_page,
          referral_source: data.referral_source || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      result = { 
        success: true, 
        message: 'Thank you for subscribing to our newsletter!',
        subscriber: newSubscriber 
      };
    }
    
    // Log the signup attempt
    await supabase
      .from('newsletter_signup_logs')
      .insert({
        email,
        signup_successful: result.success,
        error_message: result.success ? null : result.message,
        ip_address,
        user_agent,
        signup_page
      });
    
    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: result.message,
        subscriber: {
          email: result.subscriber?.email,
          subscription_type: result.subscriber?.subscription_type
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return errorResponse('Subscription failed', 400);
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return errorResponse('Failed to process subscription', 500);
  }
};

// GET method to check subscription status
export const GET: APIRoute = async ({ url }) => {
  try {
    const email = new URL(url).searchParams.get('email');
    
    if (!email) {
      return errorResponse('Email parameter required', 400);
    }
    
    // For privacy, we don't reveal if an email exists
    // Just return a generic message
    return new Response(JSON.stringify({
      message: 'Please check your email for subscription status'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Newsletter status check error:', error);
    return errorResponse('Failed to check subscription status', 500);
  }
};