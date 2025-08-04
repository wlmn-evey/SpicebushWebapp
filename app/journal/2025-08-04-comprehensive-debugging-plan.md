# Comprehensive Debugging Plan for Spicebush Testing Site

**Date Created**: August 4, 2025  
**Testing Site**: https://spicebush-testing.netlify.app  
**Purpose**: Complete debugging guide for rapid issue identification and resolution

## Executive Summary

This debugging plan provides systematic approaches to identify and resolve issues on the Spicebush Montessori testing site. The plan prioritizes common issues based on likelihood and impact, with clear diagnostic steps and solutions.

## Environment Configuration

### Testing Site Details
- **URL**: https://spicebush-testing.netlify.app
- **Branch**: `testing`
- **Auto-deploys**: Yes, from testing branch
- **Site ID**: `27a429f4-9a58-4421-bc1f-126d70d81aa1`
- **Admin Panel**: https://app.netlify.com/projects/spicebush-testing

### Key Integrations
- **Payment**: Stripe (Live keys configured)
- **Database**: Supabase (Hosted)
- **Email**: Unione.io
- **Hosting**: Netlify

## 1. Common Issues and Quick Solutions

### 1.1 Payment Processing Failures

#### Issue: Donation Not Processing
**Symptoms**: 
- Payment button unresponsive
- "Processing..." stuck
- No redirect to thank you page

**Quick Diagnostics**:
```javascript
// Browser Console Check
console.log('Stripe loaded:', typeof Stripe !== 'undefined');
console.log('Public key present:', !!window.ENV?.PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

**Solutions**:
1. **Missing Stripe.js**:
   - Check Network tab for `https://js.stripe.com/v3/`
   - Verify CSP headers allow Stripe domains

2. **API Key Issues**:
   - Verify in Netlify Dashboard: `PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
   - Should start with `pk_live_`
   - Check browser console for key exposure

3. **Network Errors**:
   ```javascript
   // Test API endpoint
   fetch('/api/donations/create-payment-intent', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({amount: 100})
   }).then(r => console.log('API Status:', r.status));
   ```

#### Issue: Payment Declined
**Common Decline Codes**:
- `insufficient_funds`: Card has insufficient funds
- `card_declined`: Generic decline
- `expired_card`: Card expired
- `incorrect_cvc`: Wrong CVC

**Debug Steps**:
1. Check Stripe Dashboard: https://dashboard.stripe.com/payments
2. Look for payment attempt and decline reason
3. Test with card: `4242 4242 4242 4242`

### 1.2 Form Submission Issues

#### Issue: Tour Form Not Submitting
**Symptoms**:
- Form appears to submit but nothing happens
- No confirmation message
- Data not saved

**Quick Check**:
```javascript
// Check Supabase connection
fetch('/api/health/database')
  .then(r => r.json())
  .then(data => console.log('DB Status:', data));
```

**Solutions**:
1. **Validation Errors**:
   - Check all required fields marked with *
   - Verify email format
   - Check date is in future

2. **Database Connection**:
   - Check Netlify env vars: `DATABASE_URL`, `DIRECT_URL`
   - Verify Supabase service is running

3. **API Endpoint Issues**:
   ```bash
   # Test form endpoint
   curl -X POST https://spicebush-testing.netlify.app/api/tour/schedule \
     -H "Content-Type: application/json" \
     -d '{"parentName":"Test","email":"test@example.com"}'
   ```

### 1.3 Email Delivery Problems

#### Issue: Emails Not Arriving
**Symptoms**:
- No confirmation emails
- No donation receipts
- Admin not notified

**Diagnostic Steps**:
1. **Check Spam Folder** - Most common issue
2. **Verify Email Service**:
   ```javascript
   // Test email API
   fetch('/api/test/email', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({to: 'your-email@example.com'})
   });
   ```

3. **Check Unione.io Status**:
   - Login to Unione dashboard
   - Check delivery reports
   - Verify API key in Netlify

**Solutions**:
- Add sender to whitelist
- Check `EMAIL_FROM` address is verified
- Verify `UNIONE_API_KEY` in environment

### 1.4 Database Connection Issues

#### Issue: "Database Error" Messages
**Symptoms**:
- 500 errors on pages
- "Failed to load data"
- Settings not loading

**Quick Diagnostics**:
```sql
-- Test connection string (use in psql)
psql "your-database-url-here"

-- If connected, test query
SELECT COUNT(*) FROM settings;
```

**Solutions**:
1. **Connection Pool Exhausted**:
   - Restart application
   - Check for connection leaks in code

2. **Wrong Credentials**:
   - Verify `DATABASE_URL` in Netlify
   - Check format: `postgresql://user:pass@host:port/db`

3. **Network Issues**:
   - Check Supabase dashboard status
   - Verify no IP restrictions

## 2. Accessing and Interpreting Logs

### 2.1 Netlify Logs

**Access Methods**:

1. **Netlify Dashboard**:
   - Go to: https://app.netlify.com/projects/spicebush-testing
   - Click "Functions" tab
   - View function logs

2. **Netlify CLI**:
   ```bash
   # Install CLI
   npm install -g netlify-cli
   
   # Login
   netlify login
   
   # Stream logs
   netlify logs:function --site spicebush-testing
   ```

**What to Look For**:
- Function execution errors
- Timeout messages (10 second limit)
- Environment variable issues
- Memory errors

### 2.2 Browser Console Logs

**Enable Verbose Logging**:
```javascript
// Add to browser console for detailed logs
localStorage.setItem('debug', '*');
window.DEBUG = true;
```

**Key Error Patterns**:
- `Failed to fetch`: CORS or network issues
- `Unexpected token`: JSON parsing errors
- `Cannot read property of undefined`: Missing data
- `401 Unauthorized`: Auth token issues

### 2.3 Supabase Logs

**Access Dashboard**:
1. Go to your Supabase project dashboard
2. Navigate to "Logs" section
3. Filter by:
   - API logs
   - Database logs
   - Auth logs

**Common Error Patterns**:
- `permission denied`: RLS policy issue
- `invalid input syntax`: Data type mismatch
- `duplicate key value`: Unique constraint violation

## 3. Debugging Payment Failures

### 3.1 Stripe Integration Checklist

**Pre-Payment Checks**:
```javascript
// Run in browser console on donation page
const checks = {
  stripeLoaded: typeof Stripe !== 'undefined',
  publicKey: document.querySelector('[data-stripe-key]')?.dataset.stripeKey,
  elements: !!document.querySelector('.StripeElement'),
  formValid: document.querySelector('form').checkValidity()
};
console.table(checks);
```

### 3.2 Common Payment Errors

#### Error: "Payment method required"
**Cause**: Card details not captured
**Fix**: Ensure Stripe Elements mounted correctly

#### Error: "Customer not found"
**Cause**: Customer creation failed
**Fix**: Check server-side customer creation logic

#### Error: "Amount too small"
**Cause**: Amount below Stripe minimum ($0.50)
**Fix**: Set minimum donation amount

### 3.3 Webhook Issues

**Test Webhook Locally**:
```bash
# Use Stripe CLI
stripe listen --forward-to localhost:4321/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

**Production Webhook Debugging**:
1. Check webhook endpoint in Stripe Dashboard
2. Verify signing secret matches environment variable
3. Check webhook logs for failures
4. Ensure endpoint returns 200 status

## 4. Troubleshooting Form Submissions

### 4.1 Validation Debugging

**Client-Side Validation Check**:
```javascript
// Check form validity
const form = document.querySelector('form');
const validity = form.checkValidity();
const errors = Array.from(form.elements)
  .filter(el => !el.validity.valid)
  .map(el => ({
    name: el.name,
    value: el.value,
    error: el.validationMessage
  }));
console.table(errors);
```

### 4.2 Server-Side Processing

**API Endpoint Testing**:
```bash
# Test contact form
curl -X POST https://spicebush-testing.netlify.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message"
  }'
```

### 4.3 Data Persistence Issues

**Verify Database Write**:
```sql
-- Check if data was saved
SELECT * FROM contact_submissions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for constraints
\d contact_submissions
```

## 5. Database Connection Debugging

### 5.1 Connection Testing

**Quick Connection Test**:
```javascript
// API health check
fetch('/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('API Status:', data.status);
    console.log('DB Connected:', data.database);
    console.log('Services:', data.services);
  });
```

### 5.2 Common Database Errors

#### Error: "ECONNREFUSED"
**Cause**: Database not reachable
**Solutions**:
- Check DATABASE_URL format
- Verify Supabase project is active
- Check network/firewall settings

#### Error: "SSL required"
**Cause**: SSL not configured
**Fix**: Add `?sslmode=require` to connection string

#### Error: "Too many connections"
**Cause**: Connection pool exhausted
**Solutions**:
- Reduce pool size in code
- Check for connection leaks
- Restart application

## 6. Email Delivery Debugging

### 6.1 Email Service Health Check

**Test Email Sending**:
```javascript
// Simple email test
async function testEmail() {
  const response = await fetch('/api/test/email', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      to: 'your-email@example.com',
      subject: 'Test Email',
      text: 'This is a test'
    })
  });
  console.log('Email test:', await response.json());
}
testEmail();
```

### 6.2 Common Email Issues

**Issue: Emails Going to Spam**
**Solutions**:
- Add SPF/DKIM records
- Use verified sender domain
- Avoid spam trigger words
- Include unsubscribe link

**Issue: Rate Limiting**
**Check**: Unione.io dashboard for limits
**Solution**: Implement queue or batch sending

## 7. Performance Bottlenecks

### 7.1 Quick Performance Audit

**Browser Performance Check**:
```javascript
// Measure page load performance
const perfData = performance.getEntriesByType("navigation")[0];
console.log('Page Load Metrics:', {
  domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
  loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
  totalTime: perfData.loadEventEnd - perfData.fetchStart
});
```

### 7.2 Common Performance Issues

**Slow Initial Load**:
- Check image sizes (should be < 200KB)
- Verify lazy loading enabled
- Check for blocking scripts
- Review bundle size

**Slow API Responses**:
- Check database query performance
- Look for N+1 queries
- Verify indexes exist
- Check function cold starts

### 7.3 Performance Tools

**Lighthouse Audit**:
```bash
# Run Lighthouse CLI
npx lighthouse https://spicebush-testing.netlify.app \
  --output html \
  --output-path ./lighthouse-report.html
```

**Bundle Analysis**:
```bash
# Check bundle size
npm run build -- --analyze
```

## 8. Deployment and Build Issues

### 8.1 Build Failures

**Common Build Errors**:

#### Error: "Module not found"
**Fix**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Error: "Out of memory"
**Fix**: Add to build command:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### 8.2 Deployment Verification

**Post-Deployment Checklist**:
```bash
# 1. Check deployment status
curl -I https://spicebush-testing.netlify.app

# 2. Verify environment variables
curl https://spicebush-testing.netlify.app/api/health/env

# 3. Test critical paths
curl https://spicebush-testing.netlify.app/api/donations/config
```

## 9. Debugging Tools and Techniques

### 9.1 Browser DevTools

**Network Tab Debugging**:
1. Open DevTools (F12)
2. Go to Network tab
3. Look for:
   - Red requests (failed)
   - Slow requests (>3s)
   - Large payloads (>1MB)
   - CORS errors

**Console Debugging**:
```javascript
// Enable verbose logging
localStorage.setItem('debug', '*');

// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Response:', response.status);
      return response;
    });
};
```

### 9.2 API Testing Tools

**Postman Collection**:
Create collection with:
- Health check endpoint
- Form submission endpoints
- Payment endpoints
- Admin endpoints

**cURL Commands**:
```bash
# Health check
curl https://spicebush-testing.netlify.app/api/health

# Test donation API
curl -X POST https://spicebush-testing.netlify.app/api/donations/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

### 9.3 Database Queries

**Useful Diagnostic Queries**:
```sql
-- Check recent errors
SELECT * FROM error_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check form submissions
SELECT COUNT(*) as count, 
       DATE(created_at) as date 
FROM contact_submissions 
GROUP BY DATE(created_at) 
ORDER BY date DESC;

-- Check payment records
SELECT * FROM donations 
WHERE created_at > NOW() - INTERVAL '1 day';
```

## 10. Emergency Rollback Procedures

### 10.1 Quick Rollback

**Via Netlify Dashboard**:
1. Go to Deploys tab
2. Find last working deployment
3. Click "Publish deploy"
4. Confirm rollback

**Via Git**:
```bash
# Rollback to previous commit
git checkout testing
git revert HEAD
git push origin testing

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin testing
```

### 10.2 Database Rollback

**Restore from Backup**:
```bash
# If you have a backup
psql DATABASE_URL < backup.sql

# Or use Supabase dashboard
# Settings > Backups > Restore
```

### 10.3 Emergency Contacts

**Services**:
- Stripe Support: https://support.stripe.com
- Netlify Support: https://www.netlify.com/support/
- Supabase Support: https://supabase.com/support
- Unione.io Support: support@unione.io

**Internal**:
- Site Admin: (336) 766-1214
- Email: info@spicebushmontessori.org

## Debugging Workflow

### Standard Debugging Process

1. **Identify Symptoms**
   - Error messages
   - Unexpected behavior
   - User reports

2. **Reproduce Issue**
   - Same browser/device
   - Same user flow
   - Same data inputs

3. **Isolate Problem**
   - Check browser console
   - Check network requests
   - Check server logs

4. **Test Hypothesis**
   - Make minimal change
   - Test in isolation
   - Verify fix

5. **Deploy Fix**
   - Test locally first
   - Deploy to testing branch
   - Verify on testing site
   - Deploy to production

### Quick Reference Commands

```bash
# Check site status
curl -I https://spicebush-testing.netlify.app

# View latest deployment
netlify status

# Check environment variables
netlify env:list

# Tail function logs
netlify logs:function --tail

# Run local development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database console
psql $DATABASE_URL

# Clear all caches
rm -rf .netlify .astro dist node_modules/.cache
```

## Success Metrics

Monitor these metrics to ensure healthy operation:

1. **Uptime**: > 99.9%
2. **Page Load**: < 3 seconds
3. **API Response**: < 500ms
4. **Payment Success**: > 95%
5. **Email Delivery**: > 98%
6. **Error Rate**: < 1%
7. **Form Completion**: > 60%

## Preventive Measures

1. **Regular Monitoring**
   - Set up uptime monitoring
   - Configure error alerts
   - Review logs weekly

2. **Testing Protocol**
   - Test before deploying
   - Use staging environment
   - Automated testing suite

3. **Documentation**
   - Keep debugging log
   - Document solutions
   - Update runbooks

---

This debugging plan provides comprehensive guidance for maintaining and troubleshooting the Spicebush testing site. Follow the systematic approaches outlined here for rapid issue resolution.