import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe (you'll need to add your publishable key to env)
// Use a dummy key if not configured to prevent build errors
const stripeKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy_key_configure_stripe';
const stripePromise = loadStripe(stripeKey);

interface DonationFormData {
  amount: number;
  donationType: 'one-time' | 'monthly';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  anonymous: boolean;
  message?: string;
}

function DonationFormContent() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<DonationFormData>({
    amount: 100,
    donationType: 'one-time',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    anonymous: false,
    message: ''
  });

  // Listen for amount and type changes from DonationOptions
  useEffect(() => {
    const handleAmountChange = (e: CustomEvent) => {
      setFormData(prev => ({ ...prev, amount: e.detail.amount }));
    };
    
    const handleTypeChange = (e: CustomEvent) => {
      setFormData(prev => ({ ...prev, donationType: e.detail.type }));
    };
    
    document.addEventListener('donation-amount-change', handleAmountChange as EventListener);
    document.addEventListener('donation-type-change', handleTypeChange as EventListener);
    
    return () => {
      document.removeEventListener('donation-amount-change', handleAmountChange as EventListener);
      document.removeEventListener('donation-type-change', handleTypeChange as EventListener);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent on the server
      const response = await fetch('/api/donations/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: formData.amount * 100, // Convert to cents
          donationType: formData.donationType,
          metadata: {
            firstName: formData.anonymous ? 'Anonymous' : formData.firstName,
            lastName: formData.anonymous ? 'Donor' : formData.lastName,
            email: formData.email,
            phone: formData.phone,
            message: formData.message
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: formData.anonymous ? 'Anonymous Donor' : `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone || undefined
          }
        }
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        setSuccess(true);
        // Reset form
        setFormData({
          amount: 100,
          donationType: 'one-time',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          anonymous: false,
          message: ''
        });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      // Log error to monitoring service in production
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-earth-brown mb-2">Thank You!</h3>
        <p className="text-gray-700 mb-4">
          Your donation has been processed successfully. You will receive a receipt via email shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-forest-canopy hover:underline"
        >
          Make another donation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Donor Information */}
      <div>
        <h4 className="text-lg font-semibold text-earth-brown mb-4">Your Information</h4>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required={!formData.anonymous}
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={formData.anonymous}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy disabled:bg-gray-100"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required={!formData.anonymous}
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={formData.anonymous}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
            />
          </div>
        </div>

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="anonymous"
            name="anonymous"
            checked={formData.anonymous}
            onChange={handleInputChange}
            className="h-4 w-4 text-forest-canopy focus:ring-forest-canopy border-gray-300 rounded"
          />
          <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
            Make this donation anonymous
          </label>
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message (Optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          value={formData.message}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
          placeholder="Leave a message with your donation..."
        />
      </div>

      {/* Payment Information */}
      <div>
        <h4 className="text-lg font-semibold text-earth-brown mb-4">Payment Information</h4>
        
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4'
                  }
                },
                invalid: {
                  color: '#9e2146'
                }
              }
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-forest-canopy text-white py-3 px-4 rounded-lg font-semibold hover:bg-forest-canopy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Donate $${formData.amount}${formData.donationType === 'monthly' ? '/month' : ''}`
        )}
      </button>

      {/* Security Notice */}
      <p className="text-xs text-gray-600 text-center">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your payment information is secure and encrypted.
      </p>
    </form>
  );
}

export default function DonationForm() {
  return (
    <Elements stripe={stripePromise}>
      <DonationFormContent />
    </Elements>
  );
}