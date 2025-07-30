---
id: 005
title: "Poor Page Load Performance"
severity: high
status: fixed
category: performance
affected_pages: ["/", "/contact", "/programs", "/admissions"]
related_bugs: [021, 003]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
last_updated: 2025-07-29
progress: "Phase 1 implemented: lazy loading + image optimization"
---

# Bug 005: Poor Page Load Performance

## Description
Multiple pages across the site are experiencing slow load times exceeding 3 seconds, with some pages taking over 5 seconds to become interactive. This results in poor user experience, high bounce rates, and negative SEO impact.

## Steps to Reproduce
1. Clear browser cache
2. Navigate to homepage or other affected pages
3. Observe loading time exceeds 3 seconds
4. Run Lighthouse audit showing poor performance scores

## Expected Behavior
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.8s
- Total Blocking Time (TBT) < 200ms
- Cumulative Layout Shift (CLS) < 0.1

## Actual Behavior
- FCP: 2.5-3.5s
- LCP: 4-6s
- TTI: 5-8s
- TBT: 500-800ms
- CLS: 0.15-0.25

## Performance Metrics
```
Homepage Performance Audit:
- Performance Score: 45/100
- FCP: 3.2s
- LCP: 5.8s
- TTI: 7.2s
- TBT: 650ms
- CLS: 0.18

Main Issues:
- Unoptimized images: 2.8MB total
- Render-blocking resources: 5
- JavaScript bundle size: 450KB
- No lazy loading implemented
- Missing browser caching headers
```

## Affected Files
- All image assets in `/public/images/`
- JavaScript bundles in `/dist/`
- CSS files being loaded synchronously
- Component hydration in multiple `.astro` files

## Potential Causes
1. **Unoptimized Images**
   - Large PNG files not compressed
   - No responsive image sizes
   - Missing next-gen formats (WebP)
   - No lazy loading

2. **JavaScript Bundle Size**
   - Large dependencies included
   - No code splitting
   - Unused code not tree-shaken
   - All components hydrating immediately

3. **Render-Blocking Resources**
   - CSS loaded synchronously
   - Fonts loading without display swap
   - Third-party scripts in head

4. **Server Response Time**
   - Database queries not optimized
   - No caching strategy
   - Cold starts in serverless functions

## Suggested Fixes

### Option 1: Image Optimization
```javascript
// Image optimization script
import sharp from 'sharp';
import glob from 'glob';

async function optimizeImages() {
  const images = glob.sync('public/images/**/*.{jpg,png}');
  
  for (const image of images) {
    // Generate WebP version
    await sharp(image)
      .webp({ quality: 85 })
      .toFile(image.replace(/\.(jpg|png)$/, '.webp'));
    
    // Generate multiple sizes
    const sizes = [320, 640, 960, 1280, 1920];
    for (const size of sizes) {
      await sharp(image)
        .resize(size, null, { withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(image.replace(/\.(jpg|png)$/, `-${size}w.jpg`));
    }
  }
}
```

### Option 2: Implement Lazy Loading
```astro
---
// OptimizedImage.astro enhancement
---
<img
  src={src}
  alt={alt}
  loading="lazy"
  decoding="async"
  srcset={srcset}
  sizes={sizes}
  class={className}
/>

<script>
  // Native lazy loading with IntersectionObserver fallback
  if (!('loading' in HTMLImageElement.prototype)) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });
    images.forEach(img => imageObserver.observe(img));
  }
</script>
```

### Option 3: JavaScript Optimization
```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    // Enable compression
    compress: true,
    // Split vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'clsx']
        }
      }
    }
  },
  // Optimize component hydration
  experimental: {
    optimize: {
      hydration: true
    }
  }
});
```

### Option 4: Implement Caching Strategy
```typescript
// Middleware for cache headers
export function onRequest({ request, response }) {
  const url = new URL(request.url);
  
  // Static assets - long cache
  if (url.pathname.match(/\.(js|css|jpg|jpeg|png|webp|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // HTML pages - short cache
  else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    response.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  
  // API responses - no cache
  else if (url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }
}
```

## Testing Requirements
1. Run Lighthouse audits before and after optimizations
2. Test on slow 3G connection
3. Verify images load progressively
4. Check JavaScript bundle sizes
5. Monitor Core Web Vitals in production
6. Test with browser caching disabled/enabled
7. Verify no visual regressions

## Related Issues
- Bug #021: Unoptimized image assets
- Bug #003: Mobile navigation performance impact

## Additional Notes
- Performance impacts SEO rankings
- Consider implementing a CDN
- Monitor Real User Metrics (RUM)
- Set up performance budgets
- Implement critical CSS inlining
- Consider static site generation for some pages