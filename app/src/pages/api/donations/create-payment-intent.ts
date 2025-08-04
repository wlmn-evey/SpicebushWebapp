import type { APIRoute } from 'astro';
import Stripe from 'stripe';

/**
 * Generate a unique donation ID
 */
function generateDonationId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `DON-${timestamp}-${randomStr}`.toUpperCase();
}

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
    const body = await request.json();
    const {
      amount,
      donationType,
      designation,
      donor,
      message
    } = body;
    
    // Validate the request
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid donation amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate unique donation ID
    const donationId = generateDonationId();
    
    // Create metadata for the payment
    const metadata = {
      donationId,
      donationType,
      designation,
      donorName: donor.anonymous ? 'Anonymous' : `${donor.firstName} ${donor.lastName}`,
      donorEmail: donor.email,
      message: message || ''
    };
    
    let clientSecret;
    
    // For monthly donations, create a subscription
    if (donationType === 'monthly') {
      // Create or retrieve customer
      const customers = await stripe.customers.list({
        email: donor.email,
        limit: 1
      });
      
      let customer;
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: donor.email,
          name: donor.anonymous ? 'Anonymous Donor' : `${donor.firstName} ${donor.lastName}`,
          metadata
        });
      }
      
      // Create a price for the monthly donation
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        product_data: {
          name: `Monthly Donation - ${designation === 'general' ? 'General Fund' : designation}`,
          metadata
        }
      });
      
      // Create a subscription with trial to collect payment method
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription' 
        },
        expand: ['latest_invoice.payment_intent'],
        metadata
      });
      
      const paymentIntent = (subscription.latest_invoice as Stripe.Invoice)?.payment_intent as Stripe.PaymentIntent;
      clientSecret = paymentIntent?.client_secret;
      
    } else {
      // For one-time payments, create a simple payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount, // Amount in cents
        currency: 'usd',
        payment_method_types: ['card'],
        metadata,
        receipt_email: donor.email,
        description: `Donation to ${designation === 'general' ? 'General Fund' : designation}`
      });
      
      clientSecret = paymentIntent.client_secret;
    }
    
    // Log successful payment intent creation
    console.log('[Stripe Payment Intent Created]', JSON.stringify({
      timestamp: new Date().toISOString(),
      donationId,
      amount: amount / 100, // Convert cents to dollars for logging
      currency: 'USD',
      type: donationType,
      designation,
      donorEmail: donor.email,
      environment: import.meta.env.MODE
    }, null, 2));
    
    // TODO: Log donation to database after webhook confirmation
    // TODO: Send email receipt after webhook confirms successful payment
    
    return new Response(
      JSON.stringify({ 
        clientSecret,
        donationId 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    // Enhanced error logging with timestamp and context
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      context: 'create-payment-intent',
      environment: import.meta.env.MODE
    };
    
    console.error('[Stripe Payment Error]', JSON.stringify(errorDetails, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process donation' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};