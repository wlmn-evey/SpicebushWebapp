---
id: 009
title: "Contact Information Not Prominent"
severity: high
status: open
category: ux
affected_pages: ["/contact", "/", "header", "footer"]
related_bugs: [004, 010]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 009: Contact Information Not Prominent

## Description
The school's phone number and email address are not prominently displayed on the website, making it difficult for prospective parents to contact the school. This critical information should be immediately visible, especially on mobile devices.

## Steps to Reproduce
1. Visit homepage - no contact info visible above fold
2. Navigate to Contact page - info buried below form
3. Check header/footer - contact info missing or too small
4. Mobile view - requires scrolling to find contact details

## Expected Behavior
- Phone number visible in header on all pages
- Click-to-call functionality on mobile
- Email address easily accessible
- Contact info above the fold on Contact page
- Emergency contact info clearly marked

## Actual Behavior
- Contact info only on Contact page
- Information below the fold
- No click-to-call links
- Parents must search for contact details
- Lost conversion opportunities

## Current State Analysis
```
Contact Information Placement:
- Homepage: Not visible
- Header: Not present
- Footer: Not present or too small
- Contact Page: Below form (below fold)
- Mobile: Requires significant scrolling

User Journey Issues:
1. Parent visits site wanting to call
2. No phone number visible
3. Clicks through multiple pages
4. Finally finds Contact page
5. Still has to scroll down
6. May give up and leave site
```

## Affected Files
- `/src/components/Header.astro` - Should include contact
- `/src/components/Footer.astro` - Missing contact section
- `/src/pages/contact.astro` - Info not prominent
- `/src/components/ContactInfo.astro` - Needs enhancement
- Homepage components - Missing contact CTAs

## Potential Causes
1. **Design Priorities**
   - Aesthetic choices over functionality
   - Assumption users will find Contact page
   - Mobile experience not prioritized

2. **Information Architecture**
   - Contact info treated as secondary
   - No clear contact strategy
   - Missing from global elements

3. **Conversion Optimization**
   - No focus on lead generation
   - Missing immediate contact options
   - No urgency created

## Suggested Fixes

### Option 1: Add Contact Bar to Header
```astro
---
// ContactBar.astro
---
<div class="contact-bar">
  <div class="container">
    <a href="tel:+1234567890" class="contact-item phone">
      <svg class="icon" aria-hidden="true"><!-- Phone icon --></svg>
      <span class="desktop-only">Call us:</span>
      <span>(123) 456-7890</span>
    </a>
    <a href="mailto:info@spicebushmontessori.org" class="contact-item email desktop-only">
      <svg class="icon" aria-hidden="true"><!-- Email icon --></svg>
      info@spicebushmontessori.org
    </a>
    <a href="/admissions/schedule-tour" class="contact-item cta">
      <span>Schedule Tour</span>
    </a>
  </div>
</div>

<style>
  .contact-bar {
    background-color: var(--primary-color);
    color: white;
    padding: 8px 0;
    font-size: 14px;
  }
  
  .container {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .contact-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: white;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  
  .contact-item:hover {
    opacity: 0.8;
  }
  
  .phone {
    font-weight: 600;
  }
  
  .cta {
    background-color: rgba(255,255,255,0.2);
    padding: 4px 12px;
    border-radius: 4px;
  }
  
  @media (max-width: 768px) {
    .desktop-only {
      display: none;
    }
    
    .container {
      justify-content: center;
    }
    
    .contact-bar {
      position: sticky;
      top: 0;
      z-index: 100;
    }
  }
</style>
```

### Option 2: Floating Contact Button (Mobile)
```astro
---
// FloatingContact.astro
---
<div class="floating-contact">
  <a href="tel:+1234567890" class="fab-button" aria-label="Call us">
    <svg class="icon"><!-- Phone icon --></svg>
  </a>
  <div class="fab-menu">
    <a href="tel:+1234567890" class="fab-item">
      <svg class="icon"><!-- Phone icon --></svg>
      <span>Call</span>
    </a>
    <a href="mailto:info@spicebushmontessori.org" class="fab-item">
      <svg class="icon"><!-- Email icon --></svg>
      <span>Email</span>
    </a>
    <a href="/admissions/schedule-tour" class="fab-item">
      <svg class="icon"><!-- Calendar icon --></svg>
      <span>Tour</span>
    </a>
  </div>
</div>

<style>
  @media (max-width: 768px) {
    .floating-contact {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }
    
    .fab-button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--primary-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      text-decoration: none;
    }
    
    .fab-menu {
      position: absolute;
      bottom: 70px;
      right: 0;
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    
    .floating-contact:focus-within .fab-menu,
    .floating-contact:hover .fab-menu {
      display: flex;
    }
  }
</style>
```

### Option 3: Enhanced Contact Page Hero
```astro
---
// Contact page hero section
---
<section class="contact-hero">
  <div class="container">
    <h1>Get in Touch</h1>
    <div class="quick-contact">
      <div class="contact-method">
        <h2>Call Us</h2>
        <a href="tel:+1234567890" class="phone-number">
          (123) 456-7890
        </a>
        <p class="hours">Monday-Friday, 8:00 AM - 5:00 PM</p>
      </div>
      <div class="contact-method">
        <h2>Email Us</h2>
        <a href="mailto:info@spicebushmontessori.org" class="email">
          info@spicebushmontessori.org
        </a>
        <p class="response-time">We respond within 24 hours</p>
      </div>
      <div class="contact-method">
        <h2>Visit Us</h2>
        <address>
          123 Montessori Way<br>
          Education City, ST 12345
        </address>
        <a href="/map" class="directions">Get Directions</a>
      </div>
    </div>
  </div>
</section>

<style>
  .contact-hero {
    background-color: var(--light-bg);
    padding: 60px 0;
  }
  
  .quick-contact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 40px;
    margin-top: 40px;
  }
  
  .contact-method h2 {
    font-size: 20px;
    margin-bottom: 12px;
    color: var(--primary-color);
  }
  
  .phone-number, .email {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-color);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 8px;
  }
  
  .phone-number:hover, .email:hover {
    color: var(--primary-color);
  }
  
  .hours, .response-time {
    font-size: 14px;
    color: var(--muted-text);
  }
</style>
```

## Testing Requirements
1. Verify contact info visible without scrolling
2. Test click-to-call on mobile devices
3. Ensure email links open mail client
4. Check visibility on all screen sizes
5. Verify accessibility of contact information
6. Test with users to ensure findability
7. Monitor contact form submissions

## Related Issues
- Bug #004: Schedule tour functionality missing
- Bug #010: Missing CTAs that should include contact

## Additional Notes
- Studies show 88% of mobile users want click-to-call
- Contact info in header increases conversions by 35%
- Consider adding WhatsApp or SMS options
- Add schema markup for contact info (SEO)
- Track phone call conversions with analytics
- Consider live chat as additional contact method