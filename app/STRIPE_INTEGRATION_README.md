# Stripe Integration Documentation

## Overview

This document provides complete instructions for the Stripe payment integration in the Spicebush Montessori website. The integration supports both donations and enrollment fee payments.

## Features

### 1. Donation Form (`/donate`)
- **One-time donations**: Accept any amount
- **Monthly recurring donations**: Set up subscriptions
- **Giving levels**: Pre-defined amounts with impact messaging
- **Fund designation**: Direct donations to specific programs
- **Anonymous donations**: Option to donate anonymously
- **Corporate matching**: Information about employer matching programs

### 2. Enrollment Form (`/enrollment`)
- **Fixed $50 enrollment fee**: Secure a child's spot
- **Parent and child information**: Collect necessary enrollment data
- **Automated confirmation**: Immediate payment processing
- **Next steps guidance**: Clear information about the enrollment process

## Setup Instructions

### Step 1: Environment Configuration

1. **Development Setup** (for testing):
```bash
# Copy the example environment file
cp .env.example .env.local

# Add test keys to .env.local:
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
```

2. **Production Setup**:
```bash
# Add to .env.production or Netlify environment variables:
STRIPE_SECRET_KEY=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
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY  # Get from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET  # After setting up webhook
```

### Step 2: Get Your Stripe Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy your **Publishable key** (starts with `pk_live_`)
4. Your **Secret key** is already provided (the `rk_live_` key)

### Step 3: Configure Webhook (Production Only)

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://spicebushmontessori.org/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to your environment as `STRIPE_WEBHOOK_SECRET`

### Step 4: Deploy to Netlify

1. **Add Environment Variables in Netlify**:
   - Go to **Site Settings → Environment variables**
   - Add all three Stripe keys:
     - `STRIPE_SECRET_KEY`
     - `PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`

2. **Deploy the Site**:
```bash
git add .
git commit -m "Add Stripe payment integration"
git push origin main
```

Netlify will automatically deploy the changes.

## Testing

### Test Cards

Use these test card numbers in development:

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Payment declined |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9987 | Requires authentication |

**Note**: Use any future expiry date and any 3-digit CVC.

### Testing Checklist

#### Donation Form Testing:
- [ ] Can select different donation amounts
- [ ] Can enter custom amount
- [ ] Can switch between one-time and monthly
- [ ] Form validation works correctly
- [ ] Anonymous donation hides name fields
- [ ] Payment processes successfully
- [ ] Redirects to thank you page
- [ ] Donation ID displays on thank you page

#### Enrollment Form Testing:
- [ ] Shows fixed $50 amount
- [ ] Parent information validates correctly
- [ ] Child information fields are required
- [ ] Date picker works for birthdate
- [ ] Payment processes successfully
- [ ] Redirects to enrollment thank you page
- [ ] Enrollment ID displays on confirmation

#### Webhook Testing:
- [ ] Webhook endpoint responds with 200 status
- [ ] Payment success events are logged
- [ ] Failed payments are logged with errors

## Accessing Payment Data

### Stripe Dashboard

1. **View Payments**: 
   - Go to **Payments** in Stripe Dashboard
   - Filter by date, amount, or status
   - Search by customer email or donation ID

2. **Export Data**:
   - Click **Export** button in payments list
   - Select date range and fields
   - Download as CSV for accounting

3. **View Subscriptions** (Monthly Donations):
   - Go to **Billing → Subscriptions**
   - View active recurring donations
   - Cancel or modify as needed

### Donation Reports

The donation/enrollment IDs follow these formats:
- Donations: `DON-[timestamp]-[random]` (e.g., `DON-LQX3M2N-AB7K9`)
- Enrollments: `ENR-[timestamp]-[random]` (e.g., `ENR-LQX3M2N-XY2P4`)

These IDs are included in:
- Payment metadata in Stripe
- Webhook logs
- Thank you page URLs
- Email receipts (if configured)

## Email Receipts

Stripe automatically sends email receipts to donors/parents. To customize:

1. Go to **Settings → Emails** in Stripe Dashboard
2. Customize receipt template
3. Add your logo and brand colors
4. Configure reply-to email address

## Troubleshooting

### Common Issues

1. **"Stripe is not configured" error**:
   - Check that `STRIPE_SECRET_KEY` is set in environment
   - Verify the key starts with `sk_` or `rk_`
   - Restart the development server after adding keys

2. **Payment fails with no error**:
   - Check browser console for JavaScript errors
   - Verify `PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
   - Ensure the publishable key starts with `pk_`

3. **Webhook not receiving events**:
   - Verify webhook URL is correct
   - Check `STRIPE_WEBHOOK_SECRET` is set (production only)
   - Look at webhook logs in Stripe Dashboard

4. **Form shows "Demo Mode" warning**:
   - Add proper Stripe keys to environment
   - Ensure publishable key is prefixed with `PUBLIC_`

### Logs and Monitoring

Check logs for debugging:

1. **Browser Console**: JavaScript errors and network requests
2. **Server Logs**: Payment intent creation and webhook events
3. **Stripe Dashboard**: 
   - **Developers → Logs** for API requests
   - **Webhooks → [Your endpoint] → Attempted webhooks** for webhook attempts

## Security Best Practices

1. **Never commit real API keys** to version control
2. **Use environment variables** for all sensitive keys
3. **Restrict API key scope** when possible (the `rk_` key has limited scope)
4. **Monitor for suspicious activity** in Stripe Dashboard
5. **Keep webhook endpoint secure** with signature verification
6. **Use HTTPS in production** (Netlify provides this automatically)

## Support

### Internal Support

For technical issues:
1. Check this documentation
2. Review server logs for errors
3. Check Stripe Dashboard for payment details

### Stripe Support

- **Documentation**: https://stripe.com/docs
- **Support**: Available through Stripe Dashboard
- **Status**: https://status.stripe.com

## Future Enhancements

Potential improvements after initial launch:

1. **Database Integration**: Store donation records locally
2. **Email Notifications**: Custom thank you emails via Unione
3. **Donation Thermometer**: Visual fundraising progress
4. **Recurring Donation Portal**: Allow donors to manage subscriptions
5. **Tax Receipt Generation**: Automated PDF receipts
6. **Tuition Payments**: Add monthly tuition payment options
7. **Financial Aid Applications**: Integrate with sliding scale program

## Maintenance

### Monthly Tasks
- Review payment logs for any failures
- Export donation data for accounting
- Check for any disputed charges
- Review and respond to any donor inquiries

### Quarterly Tasks
- Audit recurring donations
- Review conversion rates
- Update giving level amounts if needed
- Generate donation reports for board

### Annual Tasks
- Generate year-end tax receipts
- Review and update fund designations
- Analyze donation patterns
- Plan fundraising campaigns

---

Last Updated: 2025-08-04
Version: 1.0.0