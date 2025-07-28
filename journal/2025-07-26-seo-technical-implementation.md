# SEO Technical Implementation Guide
## Astro Framework Implementation for Spicebush Montessori

### 1. Redirect Implementation

#### Option A: Netlify _redirects File
Create `/public/_redirects`:
```
# WordPress to Astro URL redirects
/about-us                /about                      301
/our-principles         /our-principles             301
/apply                  /admissions                 301
/schedule-a-tour        /admissions/schedule-tour   301
/financial-accessibility /admissions/tuition-calculator 301
/summer-camp-2024       /programs/summer-camp       301
/testimonials           /about#testimonials         301
/wp-admin               /admin                      301
/wp-login.php           /auth/login                 301

# Preserve blog URLs
/blog/*                 /blog/:splat                301

# Handle WordPress patterns
/category/*             /blog                       301
/tag/*                  /blog                       301
/author/*               /about#our-team             301
/*.php                  /                           301
```

#### Option B: Vercel vercel.json
```json
{
  "redirects": [
    {
      "source": "/about-us",
      "destination": "/about",
      "permanent": true
    },
    {
      "source": "/apply",
      "destination": "/admissions",
      "permanent": true
    },
    {
      "source": "/schedule-a-tour",
      "destination": "/admissions/schedule-tour",
      "permanent": true
    },
    {
      "source": "/financial-accessibility",
      "destination": "/admissions/tuition-calculator",
      "permanent": true
    }
  ]
}
```

#### Option C: Astro Middleware (for complex logic)
Create `/src/middleware.ts`:
```typescript
import type { MiddlewareResponseHandler } from 'astro';

const redirectMap = {
  '/about-us': '/about',
  '/apply': '/admissions',
  '/schedule-a-tour': '/admissions/schedule-tour',
  '/financial-accessibility': '/admissions/tuition-calculator',
  '/summer-camp-2024': '/programs/summer-camp',
  '/testimonials': '/about#testimonials'
};

export const onRequest: MiddlewareResponseHandler = async ({ url, redirect }, next) => {
  const pathname = url.pathname;
  
  // Check redirect map
  if (redirectMap[pathname]) {
    return redirect(redirectMap[pathname], 301);
  }
  
  // Handle WordPress patterns
  if (pathname.endsWith('.php')) {
    return redirect('/', 301);
  }
  
  if (pathname.startsWith('/wp-')) {
    return redirect('/', 301);
  }
  
  return next();
};
```

### 2. Meta Tags & SEO Component

Create `/src/components/SEO.astro`:
```astro
---
export interface Props {
  title: string;
  description: string;
  image?: string;
  canonicalURL?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
  keywords?: string;
  noindex?: boolean;
}

const {
  title,
  description,
  image = '/images/og/default.jpg',
  canonicalURL = new URL(Astro.url.pathname, Astro.site).toString(),
  type = 'website',
  publishedTime,
  author,
  keywords,
  noindex = false
} = Astro.props;

const imageURL = new URL(image, Astro.site).toString();
---

<!-- Primary Meta Tags -->
<title>{title}</title>
<meta name="title" content={title} />
<meta name="description" content={description} />
{keywords && <meta name="keywords" content={keywords} />}
{noindex && <meta name="robots" content="noindex, nofollow" />}

<!-- Canonical URL -->
<link rel="canonical" href={canonicalURL} />

<!-- Open Graph / Facebook -->
<meta property="og:type" content={type} />
<meta property="og:url" content={canonicalURL} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={imageURL} />
<meta property="og:site_name" content="Spicebush Montessori School" />
<meta property="og:locale" content="en_US" />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content={canonicalURL} />
<meta property="twitter:title" content={title} />
<meta property="twitter:description" content={description} />
<meta property="twitter:image" content={imageURL} />

<!-- Article specific -->
{type === 'article' && publishedTime && (
  <meta property="article:published_time" content={publishedTime} />
)}
{type === 'article' && author && (
  <meta property="article:author" content={author} />
)}
```

### 3. Schema Markup Component

Create `/src/components/SchemaMarkup.astro`:
```astro
---
export interface Props {
  type: 'School' | 'LocalBusiness' | 'BlogPosting' | 'FAQPage';
  data?: any;
}

const { type, data = {} } = Astro.props;

let schema = {};

if (type === 'School' || type === 'LocalBusiness') {
  schema = {
    "@context": "https://schema.org",
    "@type": ["School", "LocalBusiness"],
    "name": "Spicebush Montessori School",
    "description": "Inclusive Montessori education for ages 3-6 in Glen Mills, PA",
    "url": "https://spicebushmontessori.org",
    "telephone": "(484) 202-0712",
    "email": "information@spicebushmontessori.org",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "827 Concord Road",
      "addressLocality": "Glen Mills",
      "addressRegion": "PA",
      "postalCode": "19342",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 39.8968,
      "longitude": -75.5118
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:30",
      "closes": "17:30"
    },
    "priceRange": "$2,600 - $16,000",
    "servesCuisine": "Montessori Education",
    "areaServed": [
      "Glen Mills",
      "Media",
      "West Chester",
      "Chadds Ford",
      "Chester County",
      "Delaware County"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Educational Programs",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Primary Program (Ages 3-6)",
            "description": "Full-day Montessori program"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Summer Discovery Camp",
            "description": "Montessori-based summer program"
          }
        }
      ]
    },
    ...data
  };
} else if (type === 'BlogPosting' && data) {
  schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": data.title,
    "description": data.description,
    "image": data.image,
    "datePublished": data.publishedDate,
    "dateModified": data.modifiedDate || data.publishedDate,
    "author": {
      "@type": "Person",
      "name": data.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Spicebush Montessori School",
      "logo": {
        "@type": "ImageObject",
        "url": "https://spicebushmontessori.org/images/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": data.url
    }
  };
} else if (type === 'FAQPage' && data.questions) {
  schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": data.questions.map(q => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer
      }
    }))
  };
}
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

### 4. Sitemap Configuration

Update `/astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    sitemap({
      filter: (page) => 
        !page.includes('/admin/') && 
        !page.includes('/auth/') &&
        !page.includes('/api/'),
      customPages: [
        'https://spicebushmontessori.org/montessori-school-glen-mills',
      ],
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Boost priority for key pages
        if (item.url === 'https://spicebushmontessori.org/') {
          item.priority = 1.0;
        } else if (
          item.url.includes('/admissions') ||
          item.url.includes('/about') ||
          item.url.includes('/contact')
        ) {
          item.priority = 0.9;
        }
        return item;
      }
    })
  ]
});
```

### 5. Layout with SEO Components

Update `/src/layouts/Layout.astro`:
```astro
---
import SEO from '../components/SEO.astro';
import SchemaMarkup from '../components/SchemaMarkup.astro';

export interface Props {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
  schema?: {
    type: 'School' | 'LocalBusiness' | 'BlogPosting' | 'FAQPage';
    data?: any;
  };
  noindex?: boolean;
}

const {
  title,
  description,
  keywords,
  image,
  type = 'website',
  publishedTime,
  author,
  schema = { type: 'School' },
  noindex = false
} = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    
    <!-- SEO Meta Tags -->
    <SEO
      title={title}
      description={description}
      keywords={keywords}
      image={image}
      type={type}
      publishedTime={publishedTime}
      author={author}
      noindex={noindex}
    />
    
    <!-- Schema Markup -->
    <SchemaMarkup type={schema.type} data={schema.data} />
    
    <!-- Preconnect to external domains -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    
    <!-- Font loading optimization -->
    <link
      rel="preload"
      href="/fonts/montserrat-v25-latin-regular.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### 6. Image Optimization Component

Create `/src/components/OptimizedImage.astro`:
```astro
---
import { Image } from 'astro:assets';

export interface Props {
  src: string;
  alt: string;
  widths?: number[];
  sizes?: string;
  loading?: 'lazy' | 'eager';
  class?: string;
  priority?: boolean;
}

const {
  src,
  alt,
  widths = [640, 768, 1024, 1280],
  sizes = '100vw',
  loading = 'lazy',
  class: className,
  priority = false
} = Astro.props;

// Set loading to eager for priority images
const actualLoading = priority ? 'eager' : loading;
---

<Image
  src={src}
  alt={alt}
  widths={widths}
  sizes={sizes}
  loading={actualLoading}
  decoding={priority ? 'sync' : 'async'}
  class={className}
  format="webp"
/>
```

### 7. robots.txt

Create `/public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
Disallow: /test-db

Sitemap: https://spicebushmontessori.org/sitemap-index.xml
```

### 8. Performance Optimization

Update `/astro.config.mjs` with compression and optimization:
```javascript
import { defineConfig } from 'astro/config';
import compress from 'astro-compress';

export default defineConfig({
  site: 'https://spicebushmontessori.org',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  },
  integrations: [
    compress({
      css: true,
      html: {
        removeAttributeQuotes: false,
      },
      img: false, // Handle images separately
      js: true,
      svg: true,
    })
  ],
  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          }
        }
      }
    },
    ssr: {
      noExternal: ['@astrojs/image']
    }
  }
});
```

### 9. Analytics & Tracking Setup

Create `/src/components/Analytics.astro`:
```astro
---
const GA_ID = import.meta.env.PUBLIC_GA_ID;
const GTM_ID = import.meta.env.PUBLIC_GTM_ID;
---

{GA_ID && (
  <!-- Google Analytics 4 -->
  <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_ID);
  </script>
)}

{GTM_ID && (
  <!-- Google Tag Manager -->
  <script>{`
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${GTM_ID}');
  `}</script>
)}

<!-- Local Business Schema Event Tracking -->
<script>
  // Track form submissions
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.tagName === 'FORM') {
      const formName = form.getAttribute('name') || 'unknown';
      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
          form_name: formName,
          form_id: form.id
        });
      }
    }
  });
  
  // Track phone clicks
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'phone_click', {
          phone_number: link.href.replace('tel:', '')
        });
      }
    });
  });
</script>
```

### 10. Local Business Markup for Footer

Create `/src/components/FooterSchema.astro`:
```astro
---
// Footer with local business structured data
---

<footer class="bg-moss-green text-light-stone" itemscope itemtype="https://schema.org/School">
  <div class="container mx-auto px-4 py-12">
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Contact Information -->
      <div>
        <h3 class="font-bold text-xl mb-4">Visit Us</h3>
        <address class="not-italic" itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
          <span itemprop="streetAddress">827 Concord Road</span><br>
          <span itemprop="addressLocality">Glen Mills</span>,
          <span itemprop="addressRegion">PA</span>
          <span itemprop="postalCode">19342</span>
        </address>
        <p class="mt-4">
          <a href="tel:+14842020712" itemprop="telephone" class="hover:underline">
            (484) 202-0712
          </a>
        </p>
        <p>
          <a href="mailto:information@spicebushmontessori.org" itemprop="email" class="hover:underline">
            information@spicebushmontessori.org
          </a>
        </p>
      </div>
      
      <!-- Hours -->
      <div>
        <h3 class="font-bold text-xl mb-4">School Hours</h3>
        <meta itemprop="openingHours" content="Mo-Fr 07:30-17:30">
        <p>Monday - Friday</p>
        <p>7:30 AM - 5:30 PM</p>
        <p class="mt-4 text-sm">
          Core Program: 8:30 AM - 3:30 PM<br>
          Extended Care Available
        </p>
      </div>
      
      <!-- Quick Links -->
      <div>
        <h3 class="font-bold text-xl mb-4">Quick Links</h3>
        <nav aria-label="Footer navigation">
          <ul class="space-y-2">
            <li><a href="/admissions" class="hover:underline">Admissions</a></li>
            <li><a href="/admissions/tuition-calculator" class="hover:underline">Tuition Calculator</a></li>
            <li><a href="/admissions/schedule-tour" class="hover:underline">Schedule a Tour</a></li>
            <li><a href="/about" class="hover:underline">About Us</a></li>
            <li><a href="/blog" class="hover:underline">Blog</a></li>
          </ul>
        </nav>
      </div>
    </div>
    
    <!-- Copyright and Legal -->
    <div class="mt-8 pt-8 border-t border-light-stone/20 text-center text-sm">
      <p>&copy; {new Date().getFullYear()} <span itemprop="name">Spicebush Montessori School</span>. All rights reserved.</p>
      <p class="mt-2">
        <a href="/privacy-policy" class="hover:underline">Privacy Policy</a> |
        <a href="/non-discrimination-policy" class="hover:underline">Non-Discrimination Policy</a>
      </p>
    </div>
  </div>
</footer>
```

### 11. Environment Variables

Create `.env.example`:
```
# Analytics
PUBLIC_GA_ID=G-XXXXXXXXXX
PUBLIC_GTM_ID=GTM-XXXXXXX

# Site Configuration
PUBLIC_SITE_URL=https://spicebushmontessori.org
PUBLIC_SITE_NAME="Spicebush Montessori School"

# Local SEO
PUBLIC_BUSINESS_PHONE=(484) 202-0712
PUBLIC_BUSINESS_EMAIL=information@spicebushmontessori.org
PUBLIC_BUSINESS_ADDRESS="827 Concord Road, Glen Mills, PA 19342"

# Social Media
PUBLIC_FACEBOOK_URL=https://facebook.com/spicebushmontessori
PUBLIC_INSTAGRAM_URL=https://instagram.com/spicebushmontessori
```

### 12. Page Implementation Example

Example implementation for homepage:
```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import OptimizedImage from '../components/OptimizedImage.astro';

const faqs = [
  {
    question: "What ages do you serve?",
    answer: "We serve children ages 3-6 in our primary Montessori program."
  },
  {
    question: "What is your tuition range?",
    answer: "Our Family Individualized Tuition model ranges from $2,600 to $16,000 per year, based on each family's financial situation."
  },
  {
    question: "Do you offer financial aid?",
    answer: "Yes! Our FIT model is designed to make Montessori accessible to all families. We work with each family individually to determine sustainable tuition."
  }
];
---

<Layout
  title="Montessori School Glen Mills PA | Ages 3-6 | Spicebush Montessori"
  description="Discover inclusive Montessori education in Glen Mills, PA. Spicebush offers individualized learning, flexible tuition from $2,600/year, and neurodiversity support for ages 3-6. Schedule a tour today!"
  keywords="Montessori school Glen Mills PA, preschool Glen Mills, inclusive preschool, Montessori Chester County, affordable Montessori"
  image="/images/og/homepage.jpg"
  schema={{
    type: 'School',
    data: { 
      // Additional schema data specific to homepage
      sameAs: [
        'https://facebook.com/spicebushmontessori',
        'https://instagram.com/spicebushmontessori'
      ]
    }
  }}
>
  <main>
    <!-- Hero section with optimized image -->
    <section class="hero">
      <OptimizedImage
        src="/images/hero/children-learning.jpg"
        alt="Children engaged in Montessori learning at Spicebush"
        priority={true}
        sizes="100vw"
        class="w-full h-auto"
      />
      <h1>Inclusive Montessori Education in Glen Mills, PA</h1>
      <!-- Rest of hero content -->
    </section>
    
    <!-- FAQ Schema -->
    <section class="faq">
      <h2>Frequently Asked Questions</h2>
      <!-- FAQ content -->
    </section>
    
    <!-- Include FAQ schema -->
    <SchemaMarkup 
      type="FAQPage" 
      data={{ questions: faqs }} 
    />
  </main>
</Layout>
```

This comprehensive technical implementation ensures all SEO best practices are properly integrated into the Astro framework, providing a solid foundation for excellent search performance.