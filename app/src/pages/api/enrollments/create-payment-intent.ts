import type { APIRoute } from 'astro';
import Stripe from 'stripe';

/**
 * Enrollment Payment Intent API
 * 
 * Handles the $50 enrollment fee payment for new students.
 * This is a one-time payment that secures the child's spot in the program.
 */

/**
 * Generate a unique enrollment ID
 */
function generateEnrollmentId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `ENR-${timestamp}-${randomStr}`.toUpperCase();
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
      donor,
      childName,
      childBirthdate,
      message
    } = body;
    
    // Validate the request
    if (!amount || amount !== 5000) { // Should be exactly $50 (5000 cents)
      return new Response(
        JSON.stringify({ error: 'Invalid enrollment fee amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!childName || !childBirthdate) {
      return new Response(
        JSON.stringify({ error: 'Child information is required for enrollment' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate unique enrollment ID
    const enrollmentId = generateEnrollmentId();
    
    // Create metadata for the payment
    const metadata = {
      enrollmentId,
      formType: 'enrollment',
      parentName: `${donor.firstName} ${donor.lastName}`,
      parentEmail: donor.email,
      childName,
      childBirthdate,
      message: message || '',
      timestamp: new Date().toISOString()
    };
    
    // Create a simple payment intent for the enrollment fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // Fixed $50 enrollment fee
      currency: 'usd',
      payment_method_types: ['card'],
      metadata,
      receipt_email: donor.email,
      description: `Enrollment Fee for ${childName}`,
      statement_descriptor: 'SPICEBUSH ENROLLMENT'
    });
    
    // Log successful payment intent creation
    console.log('[Enrollment Payment Intent Created]', JSON.stringify({
      timestamp: new Date().toISOString(),
      enrollmentId,
      amount: 50, // $50
      currency: 'USD',
      parentEmail: donor.email,
      childName,
      childBirthdate,
      environment: import.meta.env.MODE
    }, null, 2));
    
    // TODO: After webhook confirms payment:
    // 1. Create enrollment record in database
    // 2. Send confirmation email with next steps
    // 3. Notify admissions team
    
    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        donationId: enrollmentId // Using same field name for consistency
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
      context: 'enrollment-payment-intent',
      environment: import.meta.env.MODE
    };
    
    console.error('[Enrollment Payment Error]', JSON.stringify(errorDetails, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process enrollment payment' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};