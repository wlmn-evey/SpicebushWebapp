# Performance Optimization Testing Manual

## Overview

This manual provides comprehensive testing procedures to verify the performance optimizations implemented by Elrond. All tests should be performed to ensure the optimizations are working correctly and meeting performance targets.

## Performance Targets

- **Page Load Time**: < 3 seconds
- **First Contentful Paint**: < 1.8 seconds  
- **Lighthouse Score**: > 90 across all categories
- **Bundle Sizes**: React < 200KB, vendor chunks < 500KB each
- **Database Cache Hit Rate**: > 80%
- **Image Size Reduction**: 55% reduction achieved (679MB → 302MB)

## Pre-Testing Setup

### 1. Environment Preparation

```bash
# Build the application
npm run build

# Start the production server
npm run start

# Verify build artifacts exist
ls -la dist/client/_astro/
```

### 2. Browser Setup

- Use Chrome/Chromium for consistent testing
- Clear all browser cache and storage
- Disable browser extensions
- Ensure stable network connection

### 3. Testing Tools

- Chrome DevTools (Performance, Network, Lighthouse tabs)
- Network throttling options (Fast/Slow 3G for mobile testing)
- Browser cache controls (disable cache for initial tests)

## Testing Procedures

### A. Database Caching Performance Tests

#### A1. Cache Hit Rate Verification

**Objective**: Verify 80% query reduction and cache effectiveness

**Steps**:
1. Open browser DevTools and go to Console tab
2. Navigate to homepage: `http://localhost:3000/`
3. Run cache metrics check:
   ```javascript
   // Check if cache utils are exposed (development only)
   if (window.cacheMetrics) {
     console.log('Cache Metrics:', window.cacheMetrics);
   }
   ```
4. Refresh page 5 times rapidly
5. Check server logs for database query counts

**Expected Results**:
- Initial page load: 3-5 database queries
- Subsequent loads: 0-1 database queries (80%+ reduction)
- Page load time improvement on cached requests

**Manual Verification**:
- First visit: Note load time
- Second visit: Should be 30-50% faster
- Third+ visits: Consistently fast

#### A2. TTL (Time To Live) Testing

**Objective**: Verify cache expiration and refresh behavior

**Steps**:
1. Load homepage and note initial load time
2. Wait 6 minutes (beyond 5-minute TTL)
3. Refresh page and observe if new data is fetched
4. Check for cache invalidation behavior

**Expected Results**:
- Content updates after TTL expiration
- Fresh data fetched from database
- Cache metrics reset appropriately

### B. Image Preloading Tests

#### B1. Critical Image Preloading

**Objective**: Verify above-the-fold images are preloaded

**Steps**:
1. Open DevTools Network tab
2. Filter to show only Images
3. Navigate to homepage
4. Check for preload requests in Network timeline

**Expected Results**:
- Hero image preloaded before page render
- WebP format prioritized
- Mobile/desktop responsive preloading
- Preload headers: `rel="preload" as="image" type="image/webp"`

**Manual Check**:
```html
<!-- In page source, look for: -->
<link rel="preload" as="image" href="/images/optimized/homepage/homepage-montessori-children-autumn-hero-seasonal-learning-1920x1080.webp" type="image/webp" media="(min-width: 768px)" fetchpriority="high" />
```

#### B2. Image Format Optimization

**Objective**: Verify WebP format usage and fallbacks

**Steps**:
1. Load homepage with DevTools Network tab open
2. Filter network requests to Images only
3. Observe image formats being loaded
4. Test on WebP-unsupported browser if available

**Expected Results**:
- Primary images served as WebP format
- JPEG/PNG fallbacks for unsupported browsers
- Responsive sizing (320w, 640w, 1280w, etc.)
- Proper `<picture>` element usage

### C. Bundle Size Compliance Tests

#### C1. JavaScript Bundle Analysis

**Objective**: Verify bundle sizes meet targets

**Steps**:
1. Run bundle analysis script:
   ```bash
   node scripts/bundle-analysis.js
   ```
2. Review output for size compliance
3. Check individual bundle sizes in `dist/client/_astro/`

**Expected Results**:
- React bundle: < 200KB
- General vendor bundle: < 150KB
- Total JavaScript: < 1MB
- Appropriate code splitting (5-30 chunks)

**Manual Verification**:
```bash
# Check bundle sizes
ls -lah dist/client/_astro/*.js | head -10

# Look for specific patterns
ls -1 dist/client/_astro/*.js | grep -E "(react|vendor)" | xargs ls -lah
```

#### C2. Loading Performance

**Objective**: Verify bundles load efficiently

**Steps**:
1. Open DevTools Performance tab
2. Start recording
3. Navigate to homepage
4. Stop recording after full load
5. Analyze JavaScript execution time

**Expected Results**:
- Main thread blocking < 300ms
- Bundle parsing time < 100ms per chunk  
- No long tasks > 50ms during initial load

### D. HTTP Caching Headers Tests

#### D1. Static Asset Caching

**Objective**: Verify aggressive caching for static assets

**Steps**:
1. Open DevTools Network tab
2. Navigate to homepage
3. Check response headers for `/_astro/` assets
4. Verify caching directives

**Expected Headers**:
```
Cache-Control: public, max-age=31536000, immutable
X-Content-Type-Options: nosniff
```

**Test Command**:
```bash
curl -I http://localhost:3000/_astro/main.js
```

#### D2. HTML Page Caching

**Objective**: Verify short-term caching with revalidation

**Steps**:
1. Check HTML page response headers
2. Verify stale-while-revalidate behavior
3. Test cache invalidation

**Expected Headers**:
```
Cache-Control: public, max-age=300, stale-while-revalidate=3600
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
```

#### D3. Image Asset Caching

**Objective**: Verify image caching (1-month TTL)

**Expected Headers for Images**:
```
Cache-Control: public, max-age=2592000
X-Content-Type-Options: nosniff
```

### E. Performance Metrics Tests

#### E1. Lighthouse Audit

**Objective**: Achieve Lighthouse score > 90 in all categories

**Steps**:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Desktop" or "Mobile"
4. Click "Generate report"
5. Review all categories

**Target Scores**:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

**Key Metrics**:
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Speed Index: < 3.4s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1

#### E2. Core Web Vitals

**Objective**: Meet Google's Core Web Vitals thresholds

**Manual Test Steps**:
1. Use Chrome DevTools Performance tab
2. Record page load with CPU throttling (4x slowdown)
3. Check Web Vitals in the Performance timeline

**Or use online tools**:
- PageSpeed Insights: https://pagespeed.web.dev/
- Web.dev Measure: https://web.dev/measure/

### F. Mobile Performance Tests

#### F1. Mobile Viewport Testing

**Objective**: Verify mobile optimization

**Steps**:
1. Open DevTools Device Mode
2. Select "iPhone SE" or similar
3. Test with Network throttling (Fast 3G)
4. Run Lighthouse mobile audit

**Expected Results**:
- Mobile Lighthouse score > 85
- Responsive images load correctly
- Touch targets are appropriately sized
- Text remains readable

#### F2. Network Throttling Tests

**Test Scenarios**:
- Fast 3G: Page should load in < 5 seconds
- Slow 3G: Page should be usable in < 8 seconds
- Offline: Service worker caching (if implemented)

## Automated Test Execution

### Running All Performance Tests

```bash
# Run unit tests for performance modules
npm run test:performance

# Run E2E performance tests
npm run test:e2e -- performance-metrics.spec.ts

# Run bundle analysis
node scripts/bundle-analysis.js

# Run image audit
node scripts/image-audit.js
```

### Continuous Performance Monitoring

```bash
# Add to CI/CD pipeline
npm run build
npm run test:performance
lighthouse --chrome-flags="--headless" --output=json --output-path=./lighthouse-report.json http://localhost:3000
```

## Performance Regression Detection

### Baseline Measurements

Record baseline measurements after optimization:

```bash
# Bundle sizes
ls -lah dist/client/_astro/*.js > baseline-bundles.txt

# Lighthouse scores
lighthouse --output=json --output-path=baseline-lighthouse.json http://localhost:3000

# Load times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000 > baseline-timing.txt
```

### Regular Monitoring

Set up alerts for:
- Bundle size increases > 10%
- Lighthouse score drops > 5 points
- Page load time increases > 20%
- Cache hit rate drops below 70%

## Troubleshooting Common Issues

### Poor Cache Performance

**Symptoms**: High database query counts, slow page loads
**Solutions**: 
- Check cache TTL settings
- Verify cache invalidation logic
- Monitor memory usage

### Large Bundle Sizes

**Symptoms**: Bundles exceed size targets
**Solutions**:
- Review dependency imports
- Implement dynamic imports
- Check for duplicate dependencies

### Slow Image Loading

**Symptoms**: Images load slowly, poor LCP scores
**Solutions**:
- Verify image optimization
- Check preload implementation
- Review responsive image sizing

### Cache Headers Not Applied

**Symptoms**: Resources not cached by browser
**Solutions**:
- Check middleware implementation
- Verify deployment configuration
- Test with different browsers

## Reporting and Documentation

### Performance Test Report Template

```markdown
# Performance Test Report - [Date]

## Summary
- All tests: [PASS/FAIL]
- Performance targets met: [YES/NO]
- Critical issues found: [NUMBER]

## Test Results

### Database Caching
- Cache hit rate: [X]%
- Query reduction: [X]%
- TTL behavior: [PASS/FAIL]

### Bundle Sizes
- React bundle: [X]KB (target: <200KB)
- Vendor bundles: [X]KB (target: <500KB each)
- Total JS: [X]KB (target: <1MB)

### Performance Metrics
- Page load time: [X]s (target: <3s)
- First Contentful Paint: [X]s (target: <1.8s)
- Lighthouse Score: [X]/100 (target: >90)

### Recommendations
- [List any optimization recommendations]

### Next Steps
- [Action items for addressing any issues]
```

## Conclusion

This manual testing approach ensures comprehensive verification of all performance optimizations. Regular execution of these tests will maintain performance standards and catch regressions early.

For automated testing, refer to the test files in `/src/test/performance/` and `/e2e/performance-metrics.spec.ts`.