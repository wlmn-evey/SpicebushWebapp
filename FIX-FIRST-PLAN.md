# Fix-First Plan: Get Spicebush Working

## Overview
We're fixing the existing app instead of rebuilding. The app is 65% complete - let's get it to 100%.

## Current State
- ✅ Architecture: Astro + Supabase + Strapi (keep it)
- ❌ Broken: Tuition calculator  
- ❌ Missing: Donation page (exists but not linked)
- ⚠️ Issue: 224 duplicate images
- ⚠️ Docker: Not currently running

## 3-Week Fix Plan

### Week 1: Critical Fixes

#### Day 1-2: Security & Setup
- [x] Fix hardcoded admin email (completed earlier today)
- [ ] Get app running locally (try npm first, Docker if needed)
- [ ] Verify database connections
- [ ] Check environment variables

#### Day 3-4: Tuition Calculator
- [ ] Diagnose why it's broken
- [ ] Check if data exists in Supabase
- [ ] Fix calculation logic
- [ ] Add error handling

#### Day 5: Donation Page
- [ ] Add to navigation menu
- [ ] Configure Stripe keys
- [ ] Test payment flow
- [ ] Add tax receipt info

### Week 2: Stabilization

#### Day 6-7: Image Cleanup
- [ ] Audit 224 duplicate images
- [ ] Delete unused files
- [ ] Optimize remaining images
- [ ] Update references

#### Day 8-9: Deployment
- [ ] Simplify deployment process
- [ ] Document deployment steps
- [ ] Set up staging environment
- [ ] Test deployment pipeline

#### Day 10: Documentation
- [ ] Admin user guide
- [ ] Content update guide
- [ ] Deployment guide
- [ ] Emergency procedures

### Week 3: Polish & Deploy

#### Day 11-12: Content & Compliance
- [ ] Verify all content accuracy
- [ ] Check FERPA compliance
- [ ] Update privacy policy
- [ ] Add accessibility features

#### Day 13-14: Testing & Optimization
- [ ] Test all user journeys
- [ ] Basic performance optimization
- [ ] Mobile responsiveness check
- [ ] Cross-browser testing

#### Day 15: Production Deploy
- [ ] Final backup
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Staff training session

## Quick Wins (Already Completed Today)
- ✅ Fixed hardcoded admin email
- ✅ Removed console.log statements
- ✅ Standardized email addresses
- ✅ Fixed footer color contrast
- ✅ Added Friday 3pm closing message

## Key Questions to Answer

### Technical
1. Why is tuition calculator broken? (DB connection?)
2. Is Strapi being used? (Just 5 blog posts?)
3. Do we need Docker? (Or just npm?)

### Business
1. How do staff update content now?
2. What's the donation workflow?
3. What are compliance requirements?

## Success Criteria
- [ ] Tuition calculator works
- [ ] Donations can be accepted
- [ ] Staff can update content
- [ ] Site deploys reliably
- [ ] All legal requirements met

## Next Immediate Steps
1. Get app running locally
2. Diagnose tuition calculator issue
3. Link donation page in navigation

## Philosophy
**Fix, don't rebuild.** The app is mostly working. With focused effort on broken features, we can have it production-ready in 3 weeks.