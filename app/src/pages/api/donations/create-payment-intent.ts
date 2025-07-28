import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request }) => {
  // Initialize Stripe with your secret key
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-06-30.basil' as const
  });
  
  try {
    // Parse the request body
    const body = await request.json();
    const { amount, donationType, metadata } = body;

    // Validate the amount
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Minimum donation is $1.00' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create payment intent options
    const paymentIntentOptions: Stripe.PaymentIntentCreateParams = {
      amount, // Amount in cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        ...metadata,
        donationType,
        timestamp: new Date().toISOString()
      }
    };

    // If it's a monthly donation, we'll need to create a subscription
    // For now, we'll just process one-time payments and add subscription logic later
    if (donationType === 'monthly') {
      // Add a note to metadata that this should become a subscription
      paymentIntentOptions.metadata!.note = 'Convert to subscription after initial payment';
    }

    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    // Return the client secret
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    // Log error to monitoring service in production
    
    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode || 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle other errors
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};