---
id: 021
title: "Unoptimized Image Assets"
severity: medium
status: open
category: performance
affected_pages: ["all pages with images"]
related_bugs: [005]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 021: Unoptimized Image Assets

## Description
Many images throughout the site are not optimized, using large PNG files where JPEG would suffice, missing responsive sizes, and lacking next-gen formats like WebP. This significantly impacts page load times and bandwidth usage.

## Steps to Reproduce
1. Analyze network tab on page load
2. Check image file sizes
3. Note missing srcset attributes
4. Observe no WebP alternatives

## Expected Behavior
- Images under 100KB where possible
- Multiple sizes for responsive design
- WebP format with fallbacks
- Lazy loading implemented
- Proper compression

## Actual Behavior
- PNG files over 1MB
- Single size for all viewports
- No modern format alternatives
- All images load immediately
- Minimal compression

## Image Optimization Analysis
```
Current State:
- Total images: 127
- Average size: 385KB
- Largest image: 2.3MB
- Total page weight: 4.8MB

Issues Found:
1. Format Problems
   - PNG used for photos: 45 files
   - No WebP versions: 100%
   - Uncompressed images: 30

2. Sizing Issues
   - No responsive images: 95%
   - Serving desktop size to mobile
   - No thumbnail generation

3. Loading Strategy
   - No lazy loading: 100%
   - Loading below-fold images
   - No progressive enhancement

Potential Savings:
- Format optimization: 60% reduction
- Responsive images: 40% on mobile
- Lazy loading: 50% initial load
- Total potential: 70% reduction
```

## Affected Files
- All images in `/public/images/`
- Gallery images particularly large
- Hero images not optimized
- No image processing pipeline

## Suggested Fixes

### Option 1: Image Processing Pipeline
```javascript
// scripts/optimize-images.js
import sharp from 'sharp';
import glob from 'glob';
import path from 'path';

const sizes = [320, 640, 960, 1280, 1920];
const formats = ['webp', 'jpg'];

async function optimizeImage(inputPath) {
  const outputDir = path.join('public/images/optimized', 
    path.dirname(inputPath).replace('public/images/', '')
  );
  
  const filename = path.basename(inputPath, path.extname(inputPath));
  
  for (const size of sizes) {
    for (const format of formats) {
      const outputPath = path.join(
        outputDir, 
        `${filename}-${size}w.${format}`
      );
      
      await sharp(inputPath)
        .resize(size, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .toFormat(format, {
          quality: format === 'webp' ? 85 : 80,
          progressive: true,
          mozjpeg: true
        })
        .toFile(outputPath);
    }
  }
}

// Process all images
const images = glob.sync('public/images/**/*.{jpg,jpeg,png}');
for (const image of images) {
  await optimizeImage(image);
}
```

### Option 2: Responsive Image Component
```astro
---
// ResponsiveImage.astro
export interface Props {
  src: string;
  alt: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  className?: string;
}

const { 
  src, 
  alt, 
  sizes = '100vw',
  loading = 'lazy',
  className 
} = Astro.props;

// Generate srcset
const basePath = src.replace(/\.[^.]+$/, '');
const srcset = {
  webp: [320, 640, 960, 1280, 1920]
    .map(w => `${basePath}-${w}w.webp ${w}w`)
    .join(', '),
  jpg: [320, 640, 960, 1280, 1920]
    .map(w => `${basePath}-${w}w.jpg ${w}w`)
    .join(', ')
};
---

<picture>
  <source
    type="image/webp"
    srcset={srcset.webp}
    sizes={sizes}
  />
  <source
    type="image/jpeg"
    srcset={srcset.jpg}
    sizes={sizes}
  />
  <img
    src={`${basePath}-960w.jpg`}
    alt={alt}
    loading={loading}
    decoding="async"
    class={className}
  />
</picture>

<style>
  img {
    max-width: 100%;
    height: auto;
  }
</style>
```

### Option 3: Build-Time Optimization
```javascript
// vite-plugin-image-optimizer.js
import sharp from 'sharp';

export function imageOptimizer() {
  return {
    name: 'image-optimizer',
    async transform(code, id) {
      if (!/\.(jpg|jpeg|png)$/.test(id)) return;
      
      const optimized = await sharp(id)
        .jpeg({ 
          quality: 80, 
          progressive: true,
          mozjpeg: true 
        })
        .toBuffer();
      
      return {
        code: optimized,
        map: null
      };
    }
  };
}

// In vite.config.js
import { imageOptimizer } from './vite-plugin-image-optimizer';

export default {
  plugins: [imageOptimizer()]
};
```

## Testing Requirements
1. Measure page load improvements
2. Test on slow connections
3. Verify image quality acceptable
4. Check responsive behavior
5. Test lazy loading
6. Monitor bandwidth savings

## Related Issues
- Bug #005: Overall performance issues

## Additional Notes
- Consider CDN for image delivery
- Implement image caching strategy
- Monitor Core Web Vitals impact
- Document image requirements
- Regular audits needed