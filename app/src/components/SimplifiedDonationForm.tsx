import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with production key
const stripeKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51L7M83HrcKFotQYJjLdnjrlvUNQllhv6UcRSNxXtVAlKS4j7SDzzwaNTedSoFBGefwssgxFqMOVz9Qz6Tt4gyCv500mchbb6Dn';
const isDemoMode = false; // We have a real key now
const stripePromise = loadStripe(stripeKey);

// Form type to support both donations and enrollment
export type FormType = 'donation' | 'enrollment';

// Extended data interface to support both donation and enrollment
interface FormData {
  amount: number;
  frequency: 'one-time' | 'monthly';
  designation: string;
  donor: {
    firstName: string;
    lastName: string;
    email: string;
    anonymous?: boolean;
  };
  // Enrollment-specific fields
  childName?: string;
  childBirthdate?: string;
  // Optional fields
  message?: string;
}

// Props for the form component
interface SimplifiedDonationFormProps {
  formType?: FormType;
  fixedAmount?: number;
  hideAmountSelection?: boolean;
  successRedirectUrl?: string;
}

// Giving levels with impact messaging (valuable feature to keep)
const givingLevels = [
  {
    amount: 25,
    name: 'Seedling',
    impact: 'Provides art supplies for one child for a month'
  },
  {
    amount: 50,
    name: 'Sapling',
    impact: 'Supports our garden program with seeds and tools'
  },
  {
    amount: 100,
    name: 'Tree',
    impact: 'Funds Montessori learning materials for a classroom',
    popular: true
  },
  {
    amount: 250,
    name: 'Forest Guardian',
    impact: 'Provides tuition assistance for a family in need'
  },
  {
    amount: 500,
    name: 'Forest Canopy',
    impact: 'Sponsors a full month of our sliding scale program'
  }
];

function SimplifiedDonationFormContent({ 
  formType = 'donation',
  fixedAmount,
  hideAmountSelection = false,
  successRedirectUrl
}: SimplifiedDonationFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    amount: fixedAmount || (formType === 'enrollment' ? 50 : 100),
    frequency: 'one-time',
    designation: formType === 'enrollment' ? 'enrollment' : 'general',
    donor: {
      firstName: '',
      lastName: '',
      email: '',
      anonymous: formType === 'enrollment' ? false : false
    },
    childName: '',
    childBirthdate: '',
    message: ''
  });

  const [customAmount, setCustomAmount] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(100);

  const handleAmountSelect = (amount: number) => {
    setSelectedLevel(amount);
    setCustomAmount('');
    setFormData(prev => ({ ...prev, amount }));
  };

  const handleCustomAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomAmount(value);
    setSelectedLevel(null);
    setFormData(prev => ({ ...prev, amount: numValue }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('donor.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        donor: {
          ...prev.donor,
          [field]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
      const apiEndpoint = formType === 'enrollment' 
        ? '/api/enrollments/create-payment-intent'
        : '/api/donations/create-payment-intent';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: formData.amount * 100, // Convert to cents
          donationType: formData.frequency,
          designation: formData.designation,
          donor: formData.donor,
          message: formData.message,
          // Include enrollment-specific fields if applicable
          ...(formType === 'enrollment' && {
            childName: formData.childName,
            childBirthdate: formData.childBirthdate,
            formType: 'enrollment'
          })
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, donationId } = await response.json();

      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: formData.donor.anonymous 
              ? 'Anonymous Donor' 
              : `${formData.donor.firstName} ${formData.donor.lastName}`,
            email: formData.donor.email
          }
        }
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        setSuccess(true);
        // Redirect to appropriate thank you page
        const redirectUrl = successRedirectUrl || 
          (formType === 'enrollment' 
            ? `/enrollment/thank-you?id=${donationId}`
            : `/donate/thank-you?id=${donationId}`);
        window.location.href = redirectUrl;
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = () => {
    // Basic validation for all forms
    const baseValid = formData.amount >= 1 &&
      formData.donor.email &&
      isValidEmail(formData.donor.email);
    
    // Skip name validation if anonymous donation
    if (formData.donor.anonymous && formType === 'donation') {
      return baseValid;
    }
    
    // Name validation
    const nameValid = formData.donor.firstName.trim().length >= 2 &&
      formData.donor.lastName.trim().length >= 2;
    
    // Enrollment-specific validation
    if (formType === 'enrollment') {
      return baseValid && nameValid && 
        formData.childName!.trim().length >= 2 &&
        formData.childBirthdate!.length > 0;
    }
    
    return baseValid && nameValid;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
        <p className="text-gray-700">
          {formType === 'enrollment' 
            ? 'Your enrollment fee has been processed successfully. We\'ll contact you soon with next steps.'
            : 'Your donation has been processed successfully. You will receive a receipt via email shortly.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Demo Mode Warning */}
      {isDemoMode && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> This form is in demo mode. Configure Stripe API keys to enable live donations.
          </p>
        </div>
      )}

      {/* Amount Selection - Hide for enrollment or when hideAmountSelection is true */}
      {!hideAmountSelection && formType === 'donation' && (
      <div>
        <h3 className="text-lg font-semibold text-earth-brown mb-4">Choose Your Gift Amount</h3>
        
        {/* Frequency Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, frequency: 'one-time' }))}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              formData.frequency === 'one-time'
                ? 'bg-forest-canopy text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            One-Time Gift
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, frequency: 'monthly' }))}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              formData.frequency === 'monthly'
                ? 'bg-forest-canopy text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly Gift
          </button>
        </div>

        {/* Giving Levels */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {givingLevels.map((level) => (
            <button
              key={level.amount}
              type="button"
              onClick={() => handleAmountSelect(level.amount)}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                selectedLevel === level.amount
                  ? 'border-forest-canopy bg-forest-canopy/5'
                  : 'border-gray-200 hover:border-forest-canopy/50'
              }`}
            >
              {level.popular && (
                <span className="absolute top-2 right-2 bg-sunlight-gold text-xs font-semibold px-2 py-1 rounded">
                  Most Popular
                </span>
              )}
              
              <div className="font-semibold text-earth-brown mb-1">
                ${level.amount}{formData.frequency === 'monthly' ? '/mo' : ''}
              </div>
              <div className="text-sm text-gray-600 mb-2">{level.name}</div>
              <div className="text-xs text-gray-500">{level.impact}</div>
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex items-center gap-3">
          <span className="text-gray-700">Other amount:</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
              placeholder="Enter amount"
              aria-label="Custom donation amount"
            />
          </div>
        </div>
      </div>
      )}
      
      {/* Fixed Amount Display for Enrollment */}
      {formType === 'enrollment' && (
        <div className="bg-forest-canopy/5 border-2 border-forest-canopy rounded-lg p-6">
          <h3 className="text-lg font-semibold text-earth-brown mb-2">Enrollment Fee</h3>
          <p className="text-3xl font-bold text-forest-canopy">${fixedAmount || 50}</p>
          <p className="text-sm text-gray-600 mt-2">
            This one-time fee secures your child's spot in our program.
          </p>
        </div>
      )}

      {/* Fund Designation - Only show for donations */}
      {formType === 'donation' && (
      <div>
        <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
          How would you like your gift to be used?
        </label>
        <select
          id="designation"
          name="designation"
          value={formData.designation}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
        >
          <option value="general">General Fund - Where Needed Most</option>
          <option value="scholarship">Scholarship Fund - Tuition Assistance</option>
          <option value="garden">Garden & Nature Program</option>
          <option value="materials">Montessori Materials & Resources</option>
          <option value="teacher-development">Teacher Professional Development</option>
        </select>
      </div>
      )}

      {/* Donor/Parent Information */}
      <div>
        <h3 className="text-lg font-semibold text-earth-brown mb-4">
          {formType === 'enrollment' ? 'Parent Information' : 'Your Information'}
        </h3>
        
        {/* Anonymous Checkbox - Only for donations */}
        {formType === 'donation' && (
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="anonymous"
            name="donor.anonymous"
            checked={formData.donor.anonymous}
            onChange={handleInputChange}
            className="h-4 w-4 text-forest-canopy focus:ring-forest-canopy border-gray-300 rounded"
          />
          <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
            Make this donation anonymous
          </label>
        </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name {!formData.donor.anonymous && '*'}
            </label>
            <input
              type="text"
              id="firstName"
              name="donor.firstName"
              required={!formData.donor.anonymous}
              value={formData.donor.firstName}
              onChange={handleInputChange}
              disabled={formData.donor.anonymous}
              minLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy disabled:bg-gray-100"
              aria-invalid={!formData.donor.anonymous && formData.donor.firstName.length > 0 && formData.donor.firstName.length < 2 ? 'true' : undefined}
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name {!formData.donor.anonymous && '*'}
            </label>
            <input
              type="text"
              id="lastName"
              name="donor.lastName"
              required={!formData.donor.anonymous}
              value={formData.donor.lastName}
              onChange={handleInputChange}
              disabled={formData.donor.anonymous}
              minLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy disabled:bg-gray-100"
              aria-invalid={!formData.donor.anonymous && formData.donor.lastName.length > 0 && formData.donor.lastName.length < 2 ? 'true' : undefined}
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="donor.email"
            required
            value={formData.donor.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
            aria-invalid={formData.donor.email.length > 0 && !isValidEmail(formData.donor.email) ? 'true' : undefined}
          />
          <p className="mt-1 text-sm text-gray-500">
            {formType === 'enrollment' 
              ? "We'll send enrollment confirmation to this email address."
              : "We'll send your tax-deductible receipt to this email address."}
          </p>
        </div>
      </div>
      
      {/* Child Information - Only for enrollment */}
      {formType === 'enrollment' && (
      <div>
        <h3 className="text-lg font-semibold text-earth-brown mb-4">Child Information</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="childName" className="block text-sm font-medium text-gray-700 mb-1">
              Child's Full Name *
            </label>
            <input
              type="text"
              id="childName"
              name="childName"
              required
              value={formData.childName}
              onChange={handleInputChange}
              minLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
              placeholder="First and Last Name"
            />
          </div>
          
          <div>
            <label htmlFor="childBirthdate" className="block text-sm font-medium text-gray-700 mb-1">
              Child's Birthdate *
            </label>
            <input
              type="date"
              id="childBirthdate"
              name="childBirthdate"
              required
              value={formData.childBirthdate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Children must be between 2.5 and 6 years old to enroll in our program.
        </p>
      </div>
      )}

      {/* Optional Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          {formType === 'enrollment' ? 'Additional Information (Optional)' : 'Message (Optional)'}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          value={formData.message}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-canopy focus:border-forest-canopy"
          placeholder={formType === 'enrollment' 
            ? 'Any special needs or questions about enrollment...'
            : 'Leave a message with your donation...'}
        />
      </div>

      {/* Payment Information */}
      <div>
        <h3 className="text-lg font-semibold text-earth-brown mb-4">Payment Information</h3>
        
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

      {/* Corporate Matching Note - Only for donations */}
      {formType === 'donation' && (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Double Your Impact:</strong> Many employers will match your donation. 
          Check with your HR department about corporate matching gift programs.
        </p>
      </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || loading || !isValid()}
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
          formType === 'enrollment' 
            ? `Pay $${formData.amount} Enrollment Fee`
            : `Donate $${formData.amount}${formData.frequency === 'monthly' ? '/month' : ''}`
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

export default function SimplifiedDonationForm(props: SimplifiedDonationFormProps = {}) {
  return (
    <Elements stripe={stripePromise}>
      <SimplifiedDonationFormContent {...props} />
    </Elements>
  );
}