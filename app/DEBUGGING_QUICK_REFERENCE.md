# 🔧 Debugging Quick Reference - Spicebush Testing Site

**Testing URL**: https://spicebush-testing.netlify.app  
**Last Updated**: August 4, 2025

## 🚨 Emergency Checklist (When Things Break)

### Site Down Completely
```bash
# 1. Check Netlify status
curl -I https://spicebush-testing.netlify.app

# 2. Check recent deployments
# Go to: https://app.netlify.com/projects/spicebush-testing/deploys

# 3. Rollback if needed (in Netlify Dashboard)
# Click on last working deploy → "Publish deploy"
```

### Payment Not Working
```javascript
// Browser Console Quick Check
console.log('Stripe loaded?', typeof Stripe !== 'undefined');
console.log('Public key?', !!window.ENV?.PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Check Stripe Dashboard
// https://dashboard.stripe.com/payments
```

### Forms Not Submitting
```javascript
// Test database connection
fetch('/api/health/database').then(r => r.json()).then(console.log);

// Check form validation
document.querySelector('form').checkValidity();
```

### Emails Not Arriving
1. **Check spam folder first!**
2. Test email service:
```javascript
fetch('/api/test/email', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({to: 'test@example.com'})
}).then(r => r.json()).then(console.log);
```

## 📊 Quick Diagnostics

### Health Check All Services
```javascript
// Run in browser console
async function healthCheck() {
  const checks = {
    site: await fetch('/').then(r => r.status),
    api: await fetch('/api/health').then(r => r.status),
    database: await fetch('/api/health/database').then(r => r.status),
    stripe: typeof Stripe !== 'undefined'
  };
  console.table(checks);
}
healthCheck();
```

### Check Environment Variables
```bash
# In Netlify Dashboard
# Site Settings → Environment Variables
# Verify these are set:
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL
- PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- UNIONE_API_KEY
```

## 🔍 Common Issues & Quick Fixes

### 1. Stripe Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Stripe is not defined" | JS not loaded | Check CSP headers, network tab |
| "Invalid API key" | Wrong key | Verify starts with `pk_live_` |
| "Payment declined" | Card issue | Try test card: 4242 4242 4242 4242 |
| "Amount too small" | < $0.50 | Set minimum to $1 |

### 2. Database Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Connection refused" | Wrong URL | Check DATABASE_URL format |
| "Too many connections" | Pool exhausted | Restart app or increase pool |
| "Permission denied" | RLS policy | Check Supabase policies |
| "SSL required" | Missing SSL | Add `?sslmode=require` to URL |

### 3. Form Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Required field" | Empty field | Fill all * fields |
| "Invalid email" | Bad format | Check email format |
| "Failed to fetch" | Network/CORS | Check API endpoint, CORS headers |
| Form stuck | JS error | Check browser console |

### 4. Email Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Not arriving | In spam | Check spam, whitelist sender |
| Wrong recipient | Config error | Verify ADMIN_EMAIL env var |
| Rate limited | Too many | Check Unione.io dashboard |
| Bounce | Bad address | Verify recipient email |

## 🛠️ Debugging Commands

### Browser Console Snippets

```javascript
// Enable verbose logging
localStorage.setItem('debug', '*');

// Monitor all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('→ API Call:', args[0]);
  return originalFetch.apply(this, args).then(r => {
    console.log('← Response:', r.status);
    return r;
  });
};

// Check Stripe Elements
document.querySelectorAll('.StripeElement').forEach(el => {
  console.log('Stripe Element:', el.className, el.innerHTML ? 'Has content' : 'Empty');
});

// Validate all forms
document.querySelectorAll('form').forEach(form => {
  console.log('Form:', form.id || form.action, 'Valid:', form.checkValidity());
});
```

### Terminal Commands

```bash
# Check site status
curl -I https://spicebush-testing.netlify.app

# Test API endpoints
curl https://spicebush-testing.netlify.app/api/health
curl https://spicebush-testing.netlify.app/api/donations/config

# View Netlify logs (requires CLI)
netlify logs:function --site spicebush-testing

# Database connection test
psql "$DATABASE_URL" -c "SELECT NOW();"
```

## 📝 Logs Location

### Where to Find Logs

1. **Browser Errors**
   - Open DevTools (F12)
   - Console tab for JS errors
   - Network tab for API failures

2. **Netlify Logs**
   - Dashboard: https://app.netlify.com/projects/spicebush-testing
   - Functions tab → View logs
   - Or use CLI: `netlify logs:function`

3. **Supabase Logs**
   - Your Supabase Dashboard
   - Logs section
   - Filter by: API, Database, Auth

4. **Stripe Logs**
   - Dashboard: https://dashboard.stripe.com
   - Developers → Logs
   - Filter by: Errors only

## 🔄 Quick Rollback

### Rollback Deployment
```bash
# Option 1: Via Netlify Dashboard
# Deploys tab → Find working deploy → "Publish deploy"

# Option 2: Via Git
git checkout testing
git revert HEAD
git push origin testing
```

### Clear Caches
```bash
# Local development
rm -rf .netlify .astro dist node_modules/.cache

# Browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

## 📞 Support Contacts

### Service Dashboards
- **Netlify**: https://app.netlify.com/projects/spicebush-testing
- **Stripe**: https://dashboard.stripe.com
- **Supabase**: [Your project URL]
- **Unione.io**: [Your dashboard URL]

### Documentation
- **This Guide**: `/app/DEBUGGING_QUICK_REFERENCE.md`
- **Full Plan**: `/app/journal/2025-08-04-comprehensive-debugging-plan.md`
- **Troubleshooting**: `/app/docs/blueprint/TROUBLESHOOTING_GUIDE.md`

## ✅ Pre-Deploy Checklist

Before deploying any changes:

```bash
□ Test locally: npm run dev
□ Check browser console for errors
□ Test critical paths:
  □ Donation form
  □ Tour scheduling
  □ Contact form
□ Verify environment variables set
□ Check build succeeds: npm run build
□ Review changes in git
□ Deploy to testing first
□ Verify on testing site
□ Then deploy to production
```

## 🎯 Quick Wins

### If Nothing Else Works

1. **Clear Everything**
   ```bash
   # Nuclear option - clear all caches
   rm -rf node_modules package-lock.json .netlify .astro dist
   npm install
   npm run build
   ```

2. **Check Environment Variables**
   - Most issues are missing env vars
   - Double-check in Netlify dashboard
   - Ensure no typos or spaces

3. **Rollback**
   - Find last working deployment
   - Rollback via Netlify dashboard
   - Investigate issue offline

4. **Test with Minimal Data**
   - Use simple test data
   - Try test card: 4242 4242 4242 4242
   - Use test@example.com email

---

**Remember**: Most issues are configuration problems. Check environment variables first, then logs, then code.