# Performance Optimization Plan - 2025-07-29

## Critical Performance Issues Identified

### Current Metrics (Unacceptable):
- DOM Content Loaded: 16.1 seconds (target: <3s)
- First Contentful Paint: 10.7 seconds (target: <1.8s)
- Minimum Load Time: 3.8+ seconds
- Performance Score: 45/100

### Root Causes Identified:

1. **Unoptimized Images (Primary Culprit)**
   - Total image payload: 2.8MB
   - No lazy loading implemented (except in OptimizedImage component)
   - Images loading eagerly throughout the page
   - Multiple high-resolution images in homepage

2. **JavaScript Bundle Issues**
   - Bundle size: 450KB
   - No code splitting configured
   - React hydration happening for all components immediately
   - Unused dependencies included

3. **Render-Blocking Resources**
   - 5 render-blocking resources identified
   - CSS loaded synchronously
   - Fonts loading without display swap

4. **Server-Side Rendering Configuration**
   - Site configured as SSR (output: 'server') which may add latency
   - No caching headers configured
   - Cold starts possible in serverless functions

## Comprehensive Solution Architecture

### Phase 1: Critical Image Optimization (Immediate Impact)

#### Task 1.1: Implement Lazy Loading for All Images
- Update all image components to use loading="lazy" by default
- Implement Intersection Observer for browsers without native support
- Prioritize only above-the-fold images (HeroSection)

#### Task 1.2: Run Image Optimization Script
- Execute existing optimize-images.js script
- Generate WebP variants for all images
- Create responsive sizes (320w, 640w, 960w, 1280w)

#### Task 1.3: Optimize Homepage Image Loading
- Set priority=true only for hero image
- Lazy load all ImageGrid components
- Defer loading of teacher photos and testimonials

### Phase 2: JavaScript Optimization

#### Task 2.1: Configure Code Splitting
```javascript
// astro.config.mjs enhancement
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        'supabase': ['@supabase/supabase-js'],
        'ui': ['lucide-astro']
      }
    }
  }
}
```

#### Task 2.2: Implement Component-Level Code Splitting
- Use dynamic imports for below-the-fold components
- Defer non-critical component hydration
- Implement progressive enhancement

### Phase 3: Critical Path Optimization

#### Task 3.1: Inline Critical CSS
- Extract critical CSS for above-the-fold content
- Load remaining CSS asynchronously
- Implement CSS purging for unused styles

#### Task 3.2: Optimize Font Loading
```css
@font-face {
  font-family: 'YourFont';
  src: url('/fonts/font.woff2') format('woff2');
  font-display: swap; /* Critical for performance */
}
```

#### Task 3.3: Implement Resource Hints
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="/images/hero.webp" as="image" type="image/webp">
<link rel="prefetch" href="/js/below-fold.js">
```

### Phase 4: Caching Strategy Implementation

#### Task 4.1: Configure Cache Headers
- Static assets: Cache-Control: public, max-age=31536000, immutable
- HTML pages: Cache-Control: public, max-age=3600, must-revalidate
- API responses: Cache-Control: no-store

#### Task 4.2: Implement Service Worker (Optional)
- Cache static assets for offline support
- Implement stale-while-revalidate strategy
- Prefetch critical resources

### Phase 5: Server Optimization

#### Task 5.1: Consider Static Generation
- Change output from 'server' to 'hybrid'
- Pre-render static pages (homepage, about, programs)
- Keep dynamic pages (admin, auth) as SSR

#### Task 5.2: Implement Edge Caching
- Configure CDN for static assets
- Set up edge functions for dynamic content
- Implement cache warming strategies

## Implementation Priority Order

1. **Immediate Actions (Today)**
   - Run image optimization script
   - Update OptimizedImage component lazy loading
   - Fix hero image loading priority

2. **High Priority (Tomorrow)**
   - Implement code splitting
   - Configure cache headers
   - Optimize font loading

3. **Medium Priority (This Week)**
   - Convert to hybrid rendering
   - Implement critical CSS
   - Add resource hints

4. **Low Priority (Next Week)**
   - Service worker implementation
   - CDN configuration
   - Advanced performance monitoring

## Expected Performance Improvements

### After Phase 1 (Images):
- FCP: 10.7s → ~3-4s
- LCP: 5.8s → ~2.5s
- Total payload: -60% reduction

### After Phase 2 (JavaScript):
- TTI: 7.2s → ~4s
- TBT: 650ms → ~200ms
- Bundle size: -40% reduction

### After Full Implementation:
- Performance Score: 45 → 85-90
- FCP: <1.8s
- LCP: <2.5s
- TTI: <3.8s
- CLS: <0.1

## Success Metrics

- Lighthouse Performance Score > 85
- Real User Metrics (RUM) showing <3s load times
- Core Web Vitals passing all thresholds
- Zero cumulative layout shift
- <5% bounce rate due to performance

## Testing Strategy

1. Run Lighthouse audits after each phase
2. Test on slow 3G connections
3. Monitor real user metrics
4. A/B test performance improvements
5. Verify no visual regressions

## Risk Mitigation

- Create backups before optimization
- Test each change in development first
- Monitor error rates during rollout
- Have rollback plan ready
- Document all changes made