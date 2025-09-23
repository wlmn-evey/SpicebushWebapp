import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@lib/email-service';

/**
 * Stripe Webhook Handler
 * 
 * This endpoint receives webhook events from Stripe to confirm successful payments.
 * It handles the payment_intent.succeeded event which fires when a payment is successful.
 * 
 * Setup Instructions:
 * 1. Add this webhook endpoint in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * 2. Set the endpoint URL to: https://yoursite.com/api/webhooks/stripe
 * 3. Select event: payment_intent.succeeded
 * 4. Copy the webhook secret and add to environment as STRIPE_WEBHOOK_SECRET
 */

export const POST: APIRoute = async ({ request }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripeKey) {
    console.error('[Stripe Webhook] Missing STRIPE_SECRET_KEY');
    return new Response('Server configuration error', { status: 500 });
  }
  
  // In development, allow webhooks without signature verification
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (!webhookSecret && !isDevelopment) {
    console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET in production');
    return new Response('Server configuration error', { status: 500 });
  }
  
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-06-30.basil' as const
  });
  
  // Get the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    if (webhookSecret && signature) {
      // Verify the webhook signature in production
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else if (isDevelopment) {
      // In development, parse the body without signature verification
      event = JSON.parse(body) as Stripe.Event;
      console.warn('[Stripe Webhook] Running in development mode - signature verification skipped');
    } else {
      throw new Error('No signature provided');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', errorMessage);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
  
  // Log the event
  console.log('[Stripe Webhook] Event received:', {
    timestamp: new Date().toISOString(),
    type: event.type,
    id: event.id,
    environment: import.meta.env.MODE
  });
  
  // Handle the event
  try {
    switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
      // Extract metadata
      const metadata = paymentIntent.metadata || {};
        
      // Log successful payment
      console.log('[Stripe Payment Success]', JSON.stringify({
        timestamp: new Date().toISOString(),
        paymentIntentId: paymentIntent.id,
        donationId: metadata.donationId,
        amount: paymentIntent.amount / 100, // Convert cents to dollars
        currency: paymentIntent.currency,
        donationType: metadata.donationType,
        designation: metadata.designation,
        donorName: metadata.donorName,
        donorEmail: metadata.donorEmail || paymentIntent.receipt_email,
        status: paymentIntent.status,
        message: metadata.message
      }, null, 2));
        
      // Best-effort: Store donation record in database if configured
      try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
        const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceKey) {
          const supabase = createClient(supabaseUrl, serviceKey);
          const { error } = await supabase.from('donations').insert({
            donation_id: metadata.donationId || null,
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: paymentIntent.amount,
            currency: paymentIntent.currency,
            donor_email: metadata.donorEmail || paymentIntent.receipt_email || null,
            donor_name: metadata.donorName || null,
            designation: metadata.designation || null,
            donation_type: metadata.donationType || null,
            status: 'completed',
            completed_at: new Date().toISOString()
          });
          if (error) {
            console.warn('[Stripe Webhook] DB insert failed:', error.message);
          }
        } else {
          console.warn('[Stripe Webhook] Skipping DB insert: missing SUPABASE config');
        }
      } catch (dbError) {
        console.warn('[Stripe Webhook] DB logging error:', dbError);
      }
        
      // Best-effort: Send thank-you email if provider configured
      try {
        const providers = emailService.getStatus?.();
        const anyConfigured = providers && Object.values(providers).some(Boolean);
        const donorEmail = metadata.donorEmail || paymentIntent.receipt_email;
        if (donorEmail && anyConfigured) {
          await emailService.send({
            to: donorEmail,
            subject: 'Thank you for your donation',
            text: `Thank you for your donation of $${(paymentIntent.amount / 100).toFixed(2)}. Donation ID: ${metadata.donationId || paymentIntent.id}`,
            html: `<p>Thank you for your donation of <strong>$${(paymentIntent.amount / 100).toFixed(2)}</strong>.</p><p>Donation ID: ${metadata.donationId || paymentIntent.id}</p>`
          });
        }
      } catch (emailErr) {
        console.warn('[Stripe Webhook] Email send failed:', emailErr instanceof Error ? emailErr.message : emailErr);
      }
        
      break;
    }
      
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
      // Log failed payment
      console.error('[Stripe Payment Failed]', JSON.stringify({
        timestamp: new Date().toISOString(),
        paymentIntentId: paymentIntent.id,
        donationId: paymentIntent.metadata?.donationId,
        error: paymentIntent.last_payment_error?.message,
        amount: paymentIntent.amount / 100,
        donorEmail: paymentIntent.metadata?.donorEmail
      }, null, 2));
        
      break;
    }
      
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
        
      // Log new recurring donation
      console.log('[Stripe Subscription Created]', JSON.stringify({
        timestamp: new Date().toISOString(),
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        amount: subscription.items.data[0]?.price.unit_amount ? 
          subscription.items.data[0].price.unit_amount / 100 : 0,
        interval: subscription.items.data[0]?.price.recurring?.interval,
        metadata: subscription.metadata
      }, null, 2));
        
      break;
    }
      
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
        
      // Log cancelled recurring donation
      console.log('[Stripe Subscription Cancelled]', JSON.stringify({
        timestamp: new Date().toISOString(),
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        canceledAt: subscription.canceled_at,
        metadata: subscription.metadata
      }, null, 2));
        
      break;
    }
      
    default:
      // Log unhandled event types for visibility
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // Log webhook processing errors
    console.error('[Stripe Webhook Error]', {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    // Return 500 to indicate webhook processing failed
    // Stripe will retry the webhook
    return new Response('Webhook processing failed', { status: 500 });
  }
};

// Also handle GET requests with helpful information
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      message: 'Stripe webhook endpoint',
      status: 'operational',
      acceptedEvents: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'customer.subscription.created',
        'customer.subscription.deleted'
      ],
      setupInstructions: 'Add this endpoint URL to your Stripe webhook settings: /api/webhooks/stripe'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
