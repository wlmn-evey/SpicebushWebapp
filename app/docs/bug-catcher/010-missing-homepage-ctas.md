---
id: 010
title: "Missing Homepage CTAs"
severity: high
status: open
category: ux
affected_pages: ["/"]
related_bugs: [004, 009, 012]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 010: Missing Homepage CTAs

## Description
The homepage lacks prominent call-to-action (CTA) buttons for critical conversion actions like "Schedule a Tour" or "Contact Us". This results in reduced conversion rates as visitors don't have clear next steps.

## Steps to Reproduce
1. Visit homepage
2. Look for prominent CTAs above the fold
3. Scroll through entire homepage
4. No clear action buttons for key conversions

## Expected Behavior
- Primary CTA "Schedule a Tour" above the fold
- Secondary CTA "Contact Us" visible
- Multiple CTAs throughout page journey
- Mobile-optimized CTA placement
- Clear visual hierarchy for actions

## Actual Behavior
- No prominent CTAs on homepage
- Visitors unsure of next steps
- High bounce rate
- Low conversion to tour scheduling
- Missed enrollment opportunities

## Current State Analysis
```
Homepage Section Analysis:
1. Hero Section
   - Current: Only has heading and image
   - Missing: "Schedule Tour" and "Learn More" CTAs

2. Programs Section
   - Current: Text descriptions only
   - Missing: "Explore Programs" CTA

3. About Section
   - Current: Philosophy text
   - Missing: "Meet Our Teachers" CTA

4. End of Page
   - Current: Just footer
   - Missing: Final conversion CTA

Conversion Funnel Issues:
- No clear path from interest to action
- No urgency or incentive to act
- Multiple clicks required to convert
- No value proposition with CTA
```

## Affected Files
- `/src/pages/index.astro` - Homepage
- `/src/components/HeroSection.astro` - Missing CTAs
- `/src/components/CallToAction.astro` - Underutilized
- `/src/components/ProgramsOverview.astro` - No CTAs
- Homepage section components

## Potential Causes
1. **Design Philosophy**
   - Minimalist approach taken too far
   - Fear of being "too salesy"
   - Prioritizing aesthetics over conversion

2. **Missing Strategy**
   - No defined conversion goals
   - Unclear user journey mapping
   - No A/B testing culture

3. **Development Priorities**
   - CTAs planned for later phase
   - Focus on content over conversion
   - Limited marketing input

## Suggested Fixes

### Option 1: Enhanced Hero Section with CTAs
```astro
---
// HeroSection.astro enhancement
---
<section class="hero">
  <div class="hero-content">
    <h1 class="hero-title">
      Nurturing Young Minds Through Montessori Education
    </h1>
    <p class="hero-subtitle">
      Join our community where children develop independence, creativity, and a lifelong love of learning
    </p>
    <div class="hero-ctas">
      <a href="/admissions/schedule-tour" class="btn btn-primary btn-large">
        Schedule a Tour
        <svg class="icon-arrow" aria-hidden="true"><!-- Arrow icon --></svg>
      </a>
      <a href="/programs" class="btn btn-secondary btn-large">
        Explore Our Programs
      </a>
    </div>
    <p class="hero-urgency">
      <svg class="icon-info" aria-hidden="true"><!-- Info icon --></svg>
      Limited spots available for Fall 2025
    </p>
  </div>
  <div class="hero-image">
    <!-- Existing image -->
  </div>
</section>

<style>
  .hero-ctas {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    flex-wrap: wrap;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    font-weight: 600;
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .btn-large {
    padding: 16px 32px;
    font-size: 18px;
  }
  
  .btn-primary {
    background-color: var(--primary-color);
    color: white;
    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
  }
  
  .btn-primary:hover {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }
  
  .btn-secondary {
    background-color: white;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
  }
  
  .btn-secondary:hover {
    background-color: var(--primary-color);
    color: white;
  }
  
  .hero-urgency {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    color: var(--accent-color);
    font-weight: 500;
  }
  
  @media (max-width: 768px) {
    .hero-ctas {
      flex-direction: column;
    }
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
```

### Option 2: Floating CTA Bar
```astro
---
// FloatingCTABar.astro
---
<div class="cta-bar" data-cta-bar>
  <div class="container">
    <p class="cta-message">
      Ready to see our school in action?
    </p>
    <div class="cta-actions">
      <a href="/admissions/schedule-tour" class="cta-btn-primary">
        Schedule Your Visit
      </a>
      <a href="tel:+1234567890" class="cta-btn-secondary">
        <svg class="icon-phone"><!-- Phone icon --></svg>
        <span>Call Now</span>
      </a>
    </div>
  </div>
</div>

<script>
  // Show after scrolling 30% of page
  const ctaBar = document.querySelector('[data-cta-bar]');
  let hasShown = false;
  
  window.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY / document.body.scrollHeight) * 100;
    
    if (scrollPercent > 30 && !hasShown) {
      ctaBar.classList.add('show');
      hasShown = true;
    }
  });
  
  // Hide on close
  const closeBtn = ctaBar.querySelector('[data-close]');
  closeBtn?.addEventListener('click', () => {
    ctaBar.classList.add('hidden');
    sessionStorage.setItem('ctaBarHidden', 'true');
  });
</script>

<style>
  .cta-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--primary-color);
    color: white;
    padding: 16px 0;
    transform: translateY(100%);
    transition: transform 0.3s;
    z-index: 1000;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
  }
  
  .cta-bar.show {
    transform: translateY(0);
  }
  
  .cta-bar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }
  
  @media (max-width: 768px) {
    .cta-bar .container {
      flex-direction: column;
      text-align: center;
      gap: 12px;
    }
  }
</style>
```

### Option 3: Section-Specific CTAs
```astro
---
// Add to each homepage section
---
<!-- Programs Section -->
<section class="programs-section">
  <!-- Existing content -->
  <div class="section-cta">
    <h3>Find the Perfect Program for Your Child</h3>
    <a href="/programs" class="btn btn-primary">
      View All Programs
      <svg class="icon-arrow"><!-- Arrow --></svg>
    </a>
  </div>
</section>

<!-- Testimonials Section -->
<section class="testimonials-section">
  <!-- Existing testimonials -->
  <div class="section-cta">
    <h3>Join Our Community of Happy Families</h3>
    <a href="/admissions/schedule-tour" class="btn btn-primary">
      Schedule Your Tour Today
    </a>
  </div>
</section>

<!-- About Section -->
<section class="about-section">
  <!-- Existing content -->
  <div class="section-cta">
    <h3>Learn More About Our Approach</h3>
    <div class="cta-group">
      <a href="/about" class="btn btn-secondary">
        Our Philosophy
      </a>
      <a href="/about#teachers" class="btn btn-secondary">
        Meet Our Teachers
      </a>
    </div>
  </div>
</section>
```

## Testing Requirements
1. A/B test different CTA texts and colors
2. Track click-through rates on all CTAs
3. Monitor conversion funnel from CTA to tour
4. Test CTA visibility on all devices
5. Verify CTAs are keyboard accessible
6. Heat map analysis of CTA interactions
7. Test with different user personas

## Related Issues
- Bug #004: Tour scheduling page (CTA destination)
- Bug #009: Contact info should accompany CTAs
- Bug #012: Tuition info might reduce CTA anxiety

## Additional Notes
- Best practices suggest 1 primary CTA above fold
- Use action-oriented text ("Schedule Tour" not "Learn More")
- Create urgency without being pushy
- Consider seasonal CTA variations
- Track micro-conversions (CTA hovers, scroll depth)
- Implement CTA analytics for optimization