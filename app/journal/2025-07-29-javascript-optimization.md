# JavaScript Optimization Quest - Phase 2
Date: 2025-07-29

## Problem Statement
The Spicebush Montessori website is loading slowly (10.6 seconds) despite image optimization. Need to implement JavaScript optimizations to reduce bundle size and defer non-critical code.

## Current State Analysis

### Dependencies Identified
- **Heavy Libraries:**
  - Stripe.js (@stripe/stripe-js, @stripe/react-stripe-js)
  - Supabase (@supabase/supabase-js) 
  - React & React-DOM
  - Lucide icons (lucide-astro)
  - DOMPurify, Marked (for content rendering)

### Components Using Client-Side JavaScript
- DonationForm.tsx - Uses client:load (immediate loading)
- MobileBottomNav.astro - Static component
- AdminPreviewBar.astro - Static component

### Font Loading
- Google Fonts loaded with display=swap (good)
- Preconnect hints present (good)
- Two font families: Nunito and Poppins

## Optimization Strategy

### 1. Code Splitting Configuration
- Split vendor chunks (React, React-DOM)
- Split Stripe libraries into separate chunk
- Split Supabase into separate chunk
- Optimize Vite rollup configuration

### 2. Component Loading Strategy
- Change DonationForm from client:load to client:visible
- This will defer loading until user scrolls to donation section

### 3. Font Optimization
- Already has display=swap, no changes needed

## Implementation Steps
1. ✅ Update astro.config.mjs with Vite build optimizations
2. ✅ Update donate.astro to use client:visible
3. Test and verify improvements

## Decisions Made
- Using manual chunk splitting instead of automatic to have precise control
- Keeping font loading as-is since it already uses best practices
- Focusing on deferring Stripe/payment code since it's only needed on donation page

## Changes Implemented

### 1. Code Splitting Configuration (astro.config.mjs)
Added comprehensive Vite build configuration with manual chunk splitting:
- `react-vendor`: React and React-DOM libraries
- `stripe-vendor`: Stripe.js and React Stripe libraries  
- `supabase-vendor`: Supabase client library
- `icons-vendor`: Lucide icon libraries
- `content-vendor`: Marked, DOMPurify for content processing
- `vendor`: General vendor chunk for remaining dependencies

### 2. Component Loading Optimization (donate.astro)
- Changed DonationForm from `client:load` to `client:visible`
- This defers loading of React, Stripe, and payment processing code until user scrolls to donation form
- Significantly reduces initial JavaScript bundle

### 3. Font Display Optimization
- Verified fonts already use `display=swap` preventing render blocking
- No changes needed

## Expected Improvements
- Reduced initial JavaScript bundle size by splitting large libraries
- Deferred loading of payment processing code (Stripe) until needed
- Better caching with separate vendor chunks
- Faster initial page load and Time to Interactive (TTI)