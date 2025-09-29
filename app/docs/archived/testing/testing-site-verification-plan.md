# Testing Site Verification Plan

## Pre-Deployment Checklist ✅

### Critical Files Present
- [x] `.env.testing.template` exists with all required variables
- [x] `deploy-to-testing.sh` is executable and has validation logic
- [x] `package.json`, `astro.config.mjs`, `netlify.toml` are present
- [x] Build process works with minimal environment variables

### Environment Variable Consistency ✅
- [x] Code properly handles both `PUBLIC_SUPABASE_ANON_KEY` and `PUBLIC_SUPABASE_PUBLIC_KEY` as fallbacks
- [x] `netlify.toml` expects `PUBLIC_SUPABASE_ANON_KEY` (consistent with standardization)
- [x] `.env.testing.template` uses standardized naming

## Post-Deployment Verification Tests

### 1. Basic Site Functionality
**URL**: `https://spicebush-testing.netlify.app`

#### Core Pages Load Test
- [ ] **Homepage** (`/`) - Should load without errors
- [ ] **About** (`/about`) - Should display school information
- [ ] **Contact** (`/contact`) - Should show contact form
- [ ] **Programs** (`/programs`) - Should display program information
- [ ] **Teachers** (`/teachers`) - Should show teacher profiles

#### Navigation Test
- [ ] **Main navigation** - All menu items clickable and functional
- [ ] **Mobile navigation** - Hamburger menu works on mobile
- [ ] **Footer links** - All footer links working

### 2. Database Connectivity Test
**Purpose**: Verify Supabase connection is working

#### Supabase Connection
- [ ] **Settings API** - `/api/settings` returns data without errors
- [ ] **Coming Soon Collection** - Dynamic content loads
- [ ] **Teachers Collection** - Teacher data displays correctly
- [ ] **Photos Collection** - Images load properly

#### Test Commands (run locally to verify remote)
```bash
# Test basic connectivity
curl https://spicebush-testing.netlify.app/api/settings

# Check for common errors
curl -v https://spicebush-testing.netlify.app/api/settings 2>&1 | grep -E "(HTTP|error|fail)"
```

### 3. Stripe Integration Test (If Enabled)
**Purpose**: Verify donation form functionality with test keys

#### Donation Form Test
- [ ] **Form loads** - `/donate` page displays correctly
- [ ] **Stripe elements** - Payment form fields appear
- [ ] **Test payment** - Use test card `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - Result: Should process successfully or show clear test message

### 4. Error Handling Test

#### 404 Pages
- [ ] **Non-existent page** - Should show custom 404 page
- [ ] **Missing assets** - Should gracefully handle missing images

#### API Error Handling
- [ ] **Database unavailable** - Should show appropriate error message
- [ ] **Network issues** - Should handle timeouts gracefully

### 5. Performance and Security Test

#### Loading Performance
- [ ] **Page load time** - Homepage loads in under 3 seconds
- [ ] **Image optimization** - Images are properly optimized and load quickly
- [ ] **JavaScript bundle** - Client-side JavaScript loads without console errors

#### Security Headers
```bash
# Check security headers
curl -I https://spicebush-testing.netlify.app
```
- [ ] **HTTPS enforced** - All requests redirect to HTTPS
- [ ] **Security headers present** - CSP, X-Frame-Options, etc.

### 6. Mobile Responsiveness Test

#### Device Testing
- [ ] **Mobile phone** - Site works on mobile viewport
- [ ] **Tablet** - Site works on tablet viewport
- [ ] **Desktop** - Site works on desktop viewport

### 7. Form Functionality Test

#### Contact Form
- [ ] **Form submission** - Contact form submits without errors
- [ ] **Validation** - Required fields properly validated
- [ ] **Success message** - Confirmation shown after submission

## Automated Verification Script

Create this script to run automated checks:

```bash
#!/bin/bash
# testing-site-verification.sh

SITE_URL="https://spicebush-testing.netlify.app"
echo "🧪 Testing Site Verification Started"
echo "====================================="

# Test 1: Basic connectivity
echo "Test 1: Basic connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Site is accessible (HTTP $HTTP_CODE)"
else
    echo "❌ Site accessibility issue (HTTP $HTTP_CODE)"
fi

# Test 2: API endpoints
echo "Test 2: API endpoints..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/settings")
if [ "$API_CODE" = "200" ]; then
    echo "✅ Settings API working (HTTP $API_CODE)"
else
    echo "❌ Settings API issue (HTTP $API_CODE)"
fi

# Test 3: Key pages
PAGES=("/" "/about" "/contact" "/programs" "/teachers")
echo "Test 3: Key pages..."
for page in "${PAGES[@]}"; do
    PAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL$page")
    if [ "$PAGE_CODE" = "200" ]; then
        echo "✅ $page (HTTP $PAGE_CODE)"
    else
        echo "❌ $page (HTTP $PAGE_CODE)"
    fi
done

echo ""
echo "🎯 Manual tests still required:"
echo "   - Stripe payment form (if enabled)"
echo "   - Mobile responsiveness"
echo "   - Contact form submission"
echo "   - Admin authentication (if configured)"
```

## Common Issues and Solutions

### Build Failures
**Symptom**: Deployment fails with build errors
**Check**: 
- Environment variables are set correctly in Netlify
- Variable names match exactly (case-sensitive)
- Supabase URL format is correct

### Database Connection Issues
**Symptom**: API endpoints return 500 errors
**Check**:
- `DATABASE_URL` includes correct password
- `SUPABASE_SERVICE_ROLE_KEY` is valid
- Supabase project is not paused

### Stripe Payment Issues
**Symptom**: Payment form doesn't load or fails
**Check**:
- Using test keys (`pk_test_`, `sk_test_`)
- Webhook endpoint configured for testing site
- `STRIPE_WEBHOOK_SECRET` matches testing endpoint

### Performance Issues
**Symptom**: Site loads slowly
**Check**:
- Image optimization is working
- JavaScript bundles are reasonable size
- CDN caching is enabled

## Success Criteria

Deployment is considered successful when:
- [ ] All core pages load without errors
- [ ] Database connectivity is working
- [ ] No JavaScript console errors
- [ ] Mobile responsiveness is good
- [ ] Site loads in under 3 seconds
- [ ] Contact form works
- [ ] Stripe integration works (if enabled)

## Next Steps After Verification

1. **If all tests pass**: Site is ready for stakeholder review
2. **If tests fail**: Document specific issues and fix before proceeding
3. **Performance issues**: Optimize as needed
4. **Feature missing**: Update environment variables or code as needed