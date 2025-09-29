# Stripe Integration Deployment Checklist

## CRITICAL SECURITY ISSUES - FIX IMMEDIATELY

### 1. Remove Sensitive Files from Git History
```bash
# IMPORTANT: The .env file contains production credentials and must be removed from git
git rm --cached .env
git commit -m "Remove .env file with sensitive credentials"

# Add to .gitignore if not already there
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Ensure .env is in gitignore"
```

### 2. Rotate Compromised Credentials
Since the Stripe restricted key was exposed in the repository:
1. Log into Stripe Dashboard
2. Navigate to Developers > API keys
3. Create a new restricted key with the same permissions
4. Delete the old key after updating all environments

## PRE-DEPLOYMENT CHECKLIST

### Environment Variables Setup

#### Required for Stripe to Work:
- [ ] **PUBLIC_STRIPE_PUBLISHABLE_KEY** - Get from Stripe Dashboard > API keys
- [ ] **STRIPE_SECRET_KEY** - Use the restricted key (rk_live_...)
- [ ] **STRIPE_WEBHOOK_SECRET** - After setting up webhook endpoint

#### Already Configured:
- [x] Supabase URLs and keys
- [x] Database connection strings

### Stripe Dashboard Configuration

1. [ ] **Get Publishable Key**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy the publishable key (starts with `pk_live_`)
   
2. [ ] **Configure Webhook Endpoint**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://spicebushmontessori.org/api/webhooks/stripe`
   - Select events:
     - payment_intent.succeeded
     - payment_intent.payment_failed
     - customer.subscription.created (for monthly donations)
     - customer.subscription.deleted
   - Copy the signing secret (starts with `whsec_`)

### Netlify Environment Setup

1. [ ] **Add Environment Variables**
   ```
   # In Netlify Dashboard > Site Settings > Environment Variables
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your_key]
   STRIPE_SECRET_KEY=rk_live_[your_restricted_key]
   STRIPE_WEBHOOK_SECRET=whsec_[your_webhook_secret]
   ```

2. [ ] **Verify Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 20 (set in netlify.toml)

### Testing Before Go-Live

#### Local Testing
```bash
# Test with production keys locally (BE CAREFUL)
cp .env.example .env.local
# Add your Stripe keys to .env.local
npm run dev
```

1. [ ] Test donation form with test card: 4242 4242 4242 4242
2. [ ] Test enrollment form ($50 fixed amount)
3. [ ] Verify thank you pages load correctly
4. [ ] Check browser console for any errors

#### Staging Deployment
```bash
# Deploy to Netlify preview
npm run deploy:preview
```

1. [ ] Test payment flow on preview URL
2. [ ] Verify webhook endpoint responds (check Stripe dashboard logs)
3. [ ] Test both donation and enrollment forms
4. [ ] Verify mobile responsiveness

### Production Deployment

1. [ ] **Final Security Check**
   ```bash
   # Ensure no sensitive data in committed files
   git log -p | grep -E "(sk_|rk_|pk_|whsec_)" 
   # Should return nothing
   ```

2. [ ] **Deploy to Production**
   ```bash
   git push origin main
   # Netlify auto-deploys from main branch
   ```

3. [ ] **Post-Deployment Verification**
   - [ ] Visit https://spicebushmontessori.org/donate
   - [ ] Visit https://spicebushmontessori.org/enrollment
   - [ ] Make a test $1 donation
   - [ ] Check Stripe Dashboard for payment
   - [ ] Verify webhook received (Stripe Dashboard > Webhooks > Your endpoint)

### Monitoring Setup

1. [ ] **Set up Stripe Notifications**
   - Dashboard > Settings > Team and security > Notifications
   - Enable notifications for:
     - Failed payments
     - Disputes
     - Large payments

2. [ ] **Monitor Initial Transactions**
   - Watch first 10 real transactions closely
   - Check webhook logs for any failures
   - Monitor server logs in Netlify Functions tab

## ROLLBACK PLAN

If issues occur after deployment:

1. **Quick Disable** (if payments are failing):
   ```javascript
   // In SimplifiedDonationForm.tsx, set:
   const isDemoMode = true; // Force demo mode
   ```

2. **Environment Variable Rollback**:
   - Remove Stripe keys from Netlify environment
   - Site will show "Demo Mode" warning but won't break

3. **Full Rollback**:
   ```bash
   git revert HEAD
   git push origin main
   ```

## POST-LAUNCH TASKS

### Week 1
- [ ] Monitor daily transaction logs
- [ ] Check for any failed payments
- [ ] Review webhook success rate
- [ ] Collect user feedback

### Week 2
- [ ] Export first donation report
- [ ] Verify accounting reconciliation
- [ ] Review conversion rates
- [ ] Plan any UX improvements

### Month 1
- [ ] Generate monthly donation report
- [ ] Review recurring donation retention
- [ ] Analyze donation patterns
- [ ] Plan next features (donation thermometer, etc.)

## SUPPORT CONTACTS

- **Stripe Support**: Available in Dashboard
- **Netlify Support**: support@netlify.com
- **Developer Contact**: [Your contact info]

## NOTES

- Current implementation uses Stripe's restricted key for security
- Webhook signature verification is bypassed in development mode
- All payment data is logged for debugging (remove excessive logging after stable)
- Consider implementing database storage for donation records in Phase 2

---

Last Updated: 2025-08-04
Status: REQUIRES IMMEDIATE SECURITY FIXES