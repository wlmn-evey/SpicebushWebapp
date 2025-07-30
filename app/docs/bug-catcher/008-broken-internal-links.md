---
id: 008
title: "Broken Internal Links"
severity: high
status: open
category: functionality
affected_pages: ["/contact", "/admissions", "navigation components"]
related_bugs: [004, 002]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 008: Broken Internal Links

## Description
Multiple internal links throughout the site return 404 errors, creating dead ends for users and damaging the site's credibility. This includes critical navigation paths and call-to-action links.

## Steps to Reproduce
1. Navigate to Contact page
2. Click "Donate" link - returns 404
3. Check other internal links throughout site
4. Many links lead to non-existent pages

## Expected Behavior
- All internal links should resolve to valid pages
- No 404 errors for site navigation
- Clear user pathways through the site
- Proper redirects for moved content

## Actual Behavior
- Multiple links return 404 errors
- Users encounter dead ends
- Navigation becomes frustrating
- SEO penalties for broken links

## Broken Links Inventory
```
Confirmed Broken Links:
1. /donate (from Contact page)
2. /admissions/schedule-tour (from multiple pages)
3. /resources/parent-handbook
4. /programs/summer-camp
5. /about/our-philosophy
6. /events/upcoming
7. /gallery/campus-tour
8. /admissions/application

Redirect Issues:
- /tour -> should redirect to /admissions/schedule-tour
- /apply -> should redirect to /admissions
- /calendar -> should redirect to /events

Link Text Mismatches:
- "View Our Programs" links to /program (should be /programs)
- "Meet the Teachers" links to /staff (should be /about#teachers)
```

## Affected Files
- `/src/components/Header.astro` - Navigation links
- `/src/components/Footer.astro` - Footer navigation
- `/src/pages/contact.astro` - Donate link
- `/src/components/CallToAction.astro` - CTA links
- Various content pages with inline links

## Potential Causes
1. **Incomplete Development**
   - Pages planned but not created
   - Features removed but links remain
   - Different naming conventions used

2. **Migration Issues**
   - URLs changed from previous site
   - Content not fully migrated
   - Inconsistent URL structure

3. **Lack of Link Validation**
   - No automated link checking
   - Manual content updates missed links
   - No build-time validation

## Suggested Fixes

### Option 1: Implement Link Validation
```javascript
// scripts/validate-links.js
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { parse } from 'node-html-parser';

async function validateLinks() {
  const htmlFiles = await glob('dist/**/*.html');
  const validPaths = new Set(htmlFiles.map(f => 
    f.replace('dist', '').replace('/index.html', '').replace('.html', '')
  ));
  
  const brokenLinks = [];
  
  for (const file of htmlFiles) {
    const content = await readFile(file, 'utf-8');
    const root = parse(content);
    const links = root.querySelectorAll('a[href^="/"]');
    
    for (const link of links) {
      const href = link.getAttribute('href').split('#')[0].split('?')[0];
      if (!validPaths.has(href) && !href.endsWith('/')) {
        brokenLinks.push({
          file: file.replace('dist', ''),
          href,
          text: link.textContent.trim()
        });
      }
    }
  }
  
  if (brokenLinks.length > 0) {
    console.error('Broken links found:', brokenLinks);
    process.exit(1);
  }
}
```

### Option 2: Create Missing Pages
```astro
---
// /src/pages/donate.astro
import Layout from '@layouts/Layout.astro';
import DonationForm from '@components/DonationForm.astro';
---

<Layout title="Donate - Support Spicebush Montessori">
  <main>
    <section class="hero-section">
      <h1>Support Our Mission</h1>
      <p>Your donation helps provide quality Montessori education</p>
    </section>
    
    <section class="donation-section">
      <DonationForm />
    </section>
  </main>
</Layout>
```

### Option 3: Implement Redirects
```javascript
// astro.config.mjs
export default defineConfig({
  redirects: {
    '/tour': '/admissions/schedule-tour',
    '/apply': '/admissions',
    '/calendar': '/events',
    '/staff': '/about#teachers',
    '/donate': {
      status: 302,
      destination: '/support-us'
    }
  }
});

// Or in _redirects file for Netlify
/tour              /admissions/schedule-tour  301
/apply             /admissions                301
/calendar          /events                    301
/staff             /about#teachers            301
```

### Option 4: Create Link Component with Validation
```astro
---
// InternalLink.astro
export interface Props {
  href: string;
  class?: string;
}

const { href, class: className } = Astro.props;

// In development, validate links exist
if (import.meta.env.DEV) {
  const validPaths = await getValidPaths();
  if (!validPaths.includes(href.split('#')[0])) {
    console.warn(`Broken link detected: ${href}`);
  }
}
---

<a href={href} class={className}>
  <slot />
</a>

<style>
  /* Visual indicator for broken links in dev */
  a[href*="undefined"], 
  a[href=""], 
  a:not([href]) {
    border: 2px dashed red !important;
    background-color: #ffeeee !important;
  }
</style>
```

## Testing Requirements
1. Crawl entire site for broken links
2. Test all navigation menu items
3. Verify all CTAs lead to valid pages
4. Check footer links functionality
5. Test redirect rules work properly
6. Validate links in production build
7. Set up monitoring for 404 errors

## Related Issues
- Bug #004: Tour scheduling page is primary broken link
- Bug #002: Some 500 errors may be from broken link attempts

## Additional Notes
- Broken links significantly impact user trust
- Google penalizes sites with many 404s
- Consider implementing a custom 404 page
- Add sitemap.xml for search engines
- Monitor 404 errors in analytics
- Create automated tests for critical user paths