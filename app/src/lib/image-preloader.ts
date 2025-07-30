/**
 * Image preloading utilities for performance optimization
 * Implements preload hints for critical hero images and above-the-fold content
 */

export interface PreloadImage {
  src: string;
  type?: 'image/webp' | 'image/jpeg' | 'image/png';
  media?: string;
  fetchpriority?: 'high' | 'low' | 'auto';
}

// Critical images that should be preloaded for above-the-fold content
export const CRITICAL_IMAGES: PreloadImage[] = [
  {
    src: '/images/optimized/homepage/homepage-montessori-children-autumn-hero-seasonal-learning-1920x1080.webp',
    type: 'image/webp',
    fetchpriority: 'high',
    media: '(min-width: 768px)'
  },
  {
    src: '/images/optimized/homepage/homepage-montessori-children-autumn-hero-seasonal-learning-1280w.webp',
    type: 'image/webp',
    fetchpriority: 'high',
    media: '(max-width: 767px)'
  },
  {
    src: '/images/optimized/homepage/homepage-spicebush-logo-brand-identity-320w.webp',
    type: 'image/webp',
    fetchpriority: 'high'
  }
];

// Generate preload link tags for HTML head
export function generatePreloadLinks(images: PreloadImage[]): string {
  return images
    .map(img => {
      const attrs = [
        'rel="preload"',
        'as="image"',
        `href="${img.src}"`,
        img.type ? `type="${img.type}"` : '',
        img.media ? `media="${img.media}"` : '',
        img.fetchpriority ? `fetchpriority="${img.fetchpriority}"` : ''
      ].filter(Boolean).join(' ');
      
      return `<link ${attrs} />`;
    })
    .join('\n');
}

// Preload images programmatically in JavaScript
export function preloadImages(images: PreloadImage[]): Promise<void[]> {
  return Promise.all(
    images.map(img => {
      return new Promise<void>((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src;
        if (img.type) link.type = img.type;
        if (img.media) link.media = img.media;
        if (img.fetchpriority) link.fetchPriority = img.fetchpriority;
        
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to preload ${img.src}`));
        
        document.head.appendChild(link);
      });
    })
  );
}

// Generate responsive image srcset for WebP with fallback
export function generateResponsiveSrcSet(basePath: string, imageName: string): {
  webp: string;
  fallback: string;
  sizes: string;
} {
  const optimizedPath = `/images/optimized/${basePath}`;
  
  return {
    webp: [
      `${optimizedPath}/${imageName}-320w.webp 320w`,
      `${optimizedPath}/${imageName}-640w.webp 640w`,
      `${optimizedPath}/${imageName}-960w.webp 960w`,
      `${optimizedPath}/${imageName}-1280w.webp 1280w`,
      `${optimizedPath}/${imageName}-1920w.webp 1920w`
    ].join(', '),
    fallback: [
      `${optimizedPath}/${imageName}-640w.jpg 640w`,
      `${optimizedPath}/${imageName}-1280w.jpg 1280w`
    ].join(', '),
    sizes: '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
  };
}

// Get optimized image path for a photo slug
export function getOptimizedImagePath(photoSlug: string, size = '1280w', format = 'webp'): string {
  // Determine the category from the slug
  let category = 'gallery';
  if (photoSlug.includes('homepage-')) category = 'homepage';
  else if (photoSlug.includes('about-')) category = 'about';
  else if (photoSlug.includes('admissions-')) category = 'admissions';
  else if (photoSlug.includes('programs-')) category = 'programs';
  else if (photoSlug.includes('teachers-')) category = 'teachers';
  else if (photoSlug.includes('gallery-')) category = 'gallery';
  
  return `/images/optimized/${category}/${photoSlug}-${size}.${format}`;
}

// Create responsive image element with lazy loading
export function createResponsiveImage(
  photoSlug: string,
  alt: string,
  className = '',
  loading: 'lazy' | 'eager' = 'lazy'
): string {
  const srcSet = generateResponsiveSrcSet('', photoSlug);
  const primarySrc = getOptimizedImagePath(photoSlug, '1280w', 'webp');
  const fallbackSrc = getOptimizedImagePath(photoSlug, '1280w', 'jpg');
  
  return `
    <picture>
      <source 
        srcset="${srcSet.webp}" 
        sizes="${srcSet.sizes}" 
        type="image/webp"
      />
      <source 
        srcset="${srcSet.fallback}" 
        sizes="${srcSet.sizes}" 
        type="image/jpeg"
      />
      <img 
        src="${fallbackSrc}"
        alt="${alt}"
        class="${className}"
        loading="${loading}"
        decoding="async"
      />
    </picture>
  `;
}