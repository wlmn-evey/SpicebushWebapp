---
id: 018
title: "Missing Meta Descriptions"
severity: medium
status: open
category: accessibility
affected_pages: ["most pages"]
related_bugs: [017]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 018: Missing Meta Descriptions

## Description
Most pages lack proper meta descriptions or have descriptions that are too short/generic. This impacts search engine rankings and click-through rates from search results as users see poor or missing page summaries.

## Steps to Reproduce
1. View page source or use SEO tool
2. Check `<meta name="description">` tag
3. Find missing or inadequate descriptions
4. View in Google search results preview

## Expected Behavior
- Every page has unique meta description
- Descriptions 150-160 characters
- Compelling, keyword-rich content
- Accurate page summaries

## Actual Behavior
- Many pages have no description
- Some have generic descriptions
- Length often too short
- Poor search result previews

## Meta Description Audit
```
Pages Missing Descriptions:
- /programs
- /about
- /contact
- /admissions/schedule-tour
- All blog posts

Pages with Poor Descriptions:
- Homepage: "Welcome to Spicebush" (too short)
- Admissions: "Admissions" (not descriptive)

SEO Impact:
- Lower click-through rates
- Missed keyword opportunities
- Google generates snippets (unpredictable)
- Competitor advantage
```

## Affected Files
- All page files in `/src/pages/`
- Layout components
- Blog post template
- SEO configuration

## Suggested Fixes

### Option 1: SEO Component
```astro
---
// SEOHead.astro
export interface Props {
  title: string;
  description: string;
  image?: string;
  article?: boolean;
}

const { 
  title, 
  description, 
  image = '/default-og-image.jpg',
  article = false 
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!-- Primary Meta Tags -->
<title>{title}</title>
<meta name="title" content={title} />
<meta name="description" content={description} />
<link rel="canonical" href={canonicalURL} />

<!-- Open Graph / Facebook -->
<meta property="og:type" content={article ? 'article' : 'website'} />
<meta property="og:url" content={canonicalURL} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={new URL(image, Astro.site)} />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content={canonicalURL} />
<meta property="twitter:title" content={title} />
<meta property="twitter:description" content={description} />
<meta property="twitter:image" content={new URL(image, Astro.site)} />
```

### Option 2: Page-Specific Descriptions
```astro
---
// Homepage
import SEOHead from '@components/SEOHead.astro';
---

<Layout>
  <SEOHead 
    title="Spicebush Montessori - Authentic Montessori Education in [City]"
    description="Discover authentic Montessori education for ages 18 months to 12 years. Nurturing independence, creativity, and a love of learning in a prepared environment. Schedule a tour today!"
  />
  <!-- page content -->
</Layout>

---
// Programs page
---
<SEOHead 
  title="Montessori Programs - Toddler, Primary & Elementary | Spicebush"
  description="Explore our Montessori programs for toddlers (18mo-3yr), primary (3-6yr), and elementary (6-12yr) students. Small classes, certified teachers, and individualized learning paths."
/>

---
// Blog post template
---
<SEOHead 
  title={`${post.title} | Spicebush Montessori Blog`}
  description={post.excerpt || `${post.content.substring(0, 150)}...`}
  image={post.featuredImage}
  article={true}
/>
```

### Option 3: Automated Description Generation
```typescript
// src/utils/generate-meta-description.ts
export function generateMetaDescription(
  content: string, 
  maxLength: number = 160
): string {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  
  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Find first meaningful sentence
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  
  let description = '';
  for (const sentence of sentences) {
    if (description.length + sentence.length <= maxLength - 3) {
      description += sentence;
    } else {
      break;
    }
  }
  
  // Truncate if needed
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 3) + '...';
  }
  
  return description || cleaned.substring(0, maxLength - 3) + '...';
}
```

## Testing Requirements
1. Verify all pages have descriptions
2. Check character length (150-160)
3. Test search result previews
4. Ensure uniqueness
5. Validate with SEO tools

## Related Issues
- Bug #017: Multiple H1s (overall SEO)

## Additional Notes
- Critical for SEO performance
- Affects click-through rates significantly
- Consider hiring SEO copywriter
- Regular audits needed
- Track search console data