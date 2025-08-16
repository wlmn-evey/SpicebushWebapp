# Manual Testing Checklist for Spicebush Montessori Website

## Pre-Deployment Testing Protocol
Last Updated: 2025-08-16

### ✅ Critical Path Testing

#### 1. Homepage Performance
- [ ] **Load Time**: Homepage loads in < 5 seconds
  - Current: ~4.4 seconds ✓
  - Test on: Chrome, Safari, Firefox, Edge
  - Test on: Mobile (iOS Safari, Chrome Android)
- [ ] **First Contentful Paint**: < 2 seconds
- [ ] **Largest Contentful Paint**: < 3 seconds
- [ ] **No JavaScript errors in console**
- [ ] **All images load properly**
- [ ] **Hero section animations work**

#### 2. Navigation Testing
- [ ] **Desktop Navigation**
  - [ ] All menu items clickable
  - [ ] Dropdown menus work (if any)
  - [ ] Active page highlighting works
  - [ ] Logo links to homepage
- [ ] **Mobile Navigation**
  - [ ] Hamburger menu opens/closes
  - [ ] All mobile menu items work
  - [ ] Menu closes on item selection
  - [ ] No horizontal scroll issues

#### 3. Contact Form Testing
- [ ] **Form Submission**
  - [ ] All fields validate properly
  - [ ] Required fields show errors
  - [ ] Email validation works
  - [ ] Phone number formatting works
  - [ ] Success message displays
  - [ ] Email is received (check admin inbox)
- [ ] **Form Accessibility**
  - [ ] Tab navigation works
  - [ ] Screen reader labels present
  - [ ] Error messages are clear

#### 4. Admin Authentication Flow
- [ ] **Magic Link System**
  - [ ] Admin login page accessible at `/admin`
  - [ ] Email input validates @spicebushmontessori.org
  - [ ] Magic link email sent successfully
  - [ ] Link arrives within 1 minute
  - [ ] Link authenticates properly
  - [ ] Session persists across pages
  - [ ] Logout functionality works
- [ ] **Security**
  - [ ] Non-admin emails rejected
  - [ ] Expired links don't work
  - [ ] Session timeout works

#### 5. Tour Scheduling System
- [ ] **Calendar Display**
  - [ ] Available dates show correctly
  - [ ] Past dates are disabled
  - [ ] Selected date highlights
- [ ] **Form Flow**
  - [ ] Parent information saves
  - [ ] Child information saves
  - [ ] Multiple children can be added
  - [ ] Confirmation email sent
  - [ ] Admin notification received
- [ ] **Data Validation**
  - [ ] All required fields enforced
  - [ ] Date/time validation works
  - [ ] Duplicate bookings prevented

### 🎨 Visual & UX Testing

#### 6. Responsive Design
- [ ] **Mobile (320px - 768px)**
  - [ ] No horizontal scroll
  - [ ] Text is readable
  - [ ] Buttons are tappable (44px min)
  - [ ] Images scale properly
  - [ ] Forms are usable
- [ ] **Tablet (768px - 1024px)**
  - [ ] Layout adjusts properly
  - [ ] Navigation works
  - [ ] Content is balanced
- [ ] **Desktop (1024px+)**
  - [ ] Full layout displays
  - [ ] No content overflow
  - [ ] Proper spacing/margins

#### 7. Cross-Browser Testing
- [ ] **Chrome (Latest)**
- [ ] **Safari (Latest)**
- [ ] **Firefox (Latest)**
- [ ] **Edge (Latest)**
- [ ] **iOS Safari (iPhone/iPad)**
- [ ] **Chrome Android**

#### 8. Accessibility Testing
- [ ] **Keyboard Navigation**
  - [ ] All interactive elements reachable
  - [ ] Focus indicators visible
  - [ ] Skip to content link works
- [ ] **Screen Reader**
  - [ ] Page structure logical
  - [ ] Images have alt text
  - [ ] Form labels announced
  - [ ] Error messages announced
- [ ] **Color Contrast**
  - [ ] Text meets WCAG AA standards
  - [ ] Buttons have sufficient contrast

### 🔧 Technical Testing

#### 9. API Endpoints
- [ ] `/api/health` returns 200 OK
- [ ] `/api/auth/send-magic-link` works
- [ ] `/api/contact` form submission works
- [ ] `/api/schedule-tour` booking works
- [ ] Error handling returns proper status codes

#### 10. Database Connectivity
- [ ] Supabase connection established
- [ ] Data reads work
- [ ] Data writes work
- [ ] Connection pooling works
- [ ] Timeout handling works

#### 11. Email Service
- [ ] Unione.io configured properly
- [ ] Magic links send successfully
- [ ] Contact form emails send
- [ ] Tour confirmation emails send
- [ ] From domain verified

#### 12. Payment Integration (if enabled)
- [ ] Stripe checkout loads
- [ ] Test payment processes
- [ ] Success redirect works
- [ ] Cancel redirect works
- [ ] Webhook handling works

### 🔒 Security Testing

#### 13. Security Headers
- [ ] CSP header present and working
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] HSTS enabled (production only)
- [ ] Referrer-Policy set

#### 14. Data Protection
- [ ] No sensitive data in console logs
- [ ] API keys not exposed in client
- [ ] Form data sanitized
- [ ] SQL injection prevention
- [ ] XSS protection active

### 📱 Feature-Specific Testing

#### 15. Programs Page
- [ ] All program cards display
- [ ] Tuition calculator works
- [ ] Age eligibility displays
- [ ] Schedule information correct
- [ ] Enrollment links work

#### 16. About Page
- [ ] Staff bios display
- [ ] Philosophy section loads
- [ ] History timeline works
- [ ] Accreditation badges show

#### 17. Gallery/Photos
- [ ] Images lazy load
- [ ] Lightbox/modal works
- [ ] Captions display
- [ ] Performance acceptable

#### 18. Resources Section
- [ ] Parent resources accessible
- [ ] Forms downloadable
- [ ] Calendar displays
- [ ] Newsletter signup works

### 🚀 Pre-Launch Checklist

#### 19. Content Review
- [ ] No lorem ipsum text
- [ ] Contact info correct
- [ ] Hours of operation accurate
- [ ] Pricing up to date
- [ ] Legal pages present (Privacy, Terms)

#### 20. SEO & Analytics
- [ ] Meta tags present
- [ ] Open Graph tags set
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured
- [ ] Analytics tracking code installed

#### 21. Performance Metrics
- [ ] Lighthouse score > 90
- [ ] Bundle size < 500KB initial
- [ ] Image optimization complete
- [ ] CDN configured (if applicable)

#### 22. Error Handling
- [ ] 404 page works
- [ ] 500 error page exists
- [ ] Form error states display
- [ ] API error messages user-friendly

### 🔄 Post-Deployment Verification

#### 23. Production Environment
- [ ] Site loads on production URL
- [ ] SSL certificate valid
- [ ] www redirect works
- [ ] Environment variables set
- [ ] Database connected

#### 24. Monitoring Setup
- [ ] Health check endpoint monitored
- [ ] Error logging configured
- [ ] Uptime monitoring active
- [ ] Performance monitoring enabled

## Testing Commands

```bash
# Run automated tests
npm run test

# Check TypeScript
npm run typecheck:loose

# Check build
npm run build:production

# Test email service
node scripts/test-email.cjs

# Check environment
node scripts/check-env.cjs

# Performance test
node scripts/test-performance.cjs
```

## Known Issues to Verify Fixed
1. ✅ 27-second homepage load (now ~4.4s)
2. ✅ TypeScript errors blocking build
3. ✅ Mobile horizontal scroll
4. ⚠️ Unione API key needs replacement (using test key)
5. ✅ Security headers missing

## Sign-off

- [ ] Development Team Review
- [ ] Client Review
- [ ] Final Approval

---

**Note**: Complete all checks before production deployment. Any failures should be documented and resolved before launch.