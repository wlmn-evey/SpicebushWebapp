# Comprehensive Coming Soon Page - Architectural Blueprint
Date: 2025-07-27
Architect: Claude (Project Architect)

## Executive Summary

This blueprint outlines the design and implementation of a comprehensive "Coming Soon" page that serves as a complete one-page summary of the Spicebush Montessori School website. Unlike a simple placeholder, this page will contain all essential information parents need while the main site is being updated.

## Project Scope and Objectives

### Primary Requirements
1. **Essential School Information**
   - School logo and name
   - Ages served (3-6 years)
   - Complete program listings
   - Tuition information with ranges
   - Financial disclosure and 501(c)(3) status
   - Application link integration
   - Contact form functionality
   - Full contact details
   - School hours display
   - Philosophy statement
   - Key differentiators

2. **Design Goals**
   - Professional, welcoming aesthetic
   - Mobile-responsive layout
   - Fully accessible design
   - Complete, not placeholder feel
   - Animated, beautiful presentation
   - Clear information hierarchy

3. **Technical Requirements**
   - Single page architecture
   - Data integration from content collections
   - Working contact form (Netlify Forms)
   - Accurate content from existing collections
   - Performance optimized

## Architectural Overview

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                 Coming Soon Page                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Header Section                                 │   │
│  │    - Logo + School Name                          │   │
│  │    - Tagline/Message                             │   │
│  │    - Expected Launch Date                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Quick Info Cards                              │   │
│  │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │   │
│  │    │ Ages │ │Hours │ │ Phone│ │ Apply│         │   │
│  │    └──────┘ └──────┘ └──────┘ └──────┘        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    About & Philosophy                            │   │
│  │    - Brief introduction                          │   │
│  │    - Core values                                 │   │
│  │    - Key differentiators                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Programs & Tuition                            │   │
│  │    ┌────────────┐    ┌────────────┐            │   │
│  │    │ Full Day   │    │ Half Day   │            │   │
│  │    │ Program    │    │ Program    │            │   │
│  │    │ Details    │    │ Details    │            │   │
│  │    └────────────┘    └────────────┘            │   │
│  │    - Extended Care Info                         │   │
│  │    - FIT Model Explanation                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Contact Section                               │   │
│  │    ┌──────────────┐  ┌──────────────┐          │   │
│  │    │ Contact Form │  │ Contact Info │          │   │
│  │    │              │  │ - Address    │          │   │
│  │    │              │  │ - Phone      │          │   │
│  │    │              │  │ - Email      │          │   │
│  │    └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Footer                                        │   │
│  │    - 501(c)(3) Status                           │   │
│  │    - Non-discrimination Policy                  │   │
│  │    - Copyright                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Sources and Integration

```yaml
Content Collections:
  - school-info/general.md: Basic school information
  - hours/: School hours data
  - staff/: Teacher information
  - tuition/: Program and pricing data
  - settings/: Configuration including coming soon settings
  - photos/: Optimized images for visual appeal
  - testimonials/: Parent testimonials
```

## Detailed Implementation Plan

### Phase 1: Page Structure and Layout

#### 1.1 Enhanced Coming Soon Page Component

Location: `/src/pages/coming-soon.astro`

```astro
---
import { getCollection, getEntry } from 'astro:content';
import OptimizedImage from '../components/OptimizedImage.astro';

// Fetch all necessary data
const schoolInfo = await getEntry('school-info', 'general');
const hoursData = await getCollection('hours');
const tuitionPrograms = await getCollection('tuition', ({ data }) => data.type === 'program');
const tuitionRates = await getCollection('tuition', ({ data }) => data.type === 'rate');
const comingSoonConfig = await getEntry('coming-soon', 'config');
const testimonials = await getCollection('testimonials');

// Process data for display
const programsWithRates = tuitionPrograms.map(program => ({
  ...program,
  rates: tuitionRates.filter(rate => rate.data.program_id === program.id)
}));
---

<!DOCTYPE html>
<html lang="en">
<!-- Full implementation... -->
</html>
```

### Phase 2: Component Development

#### 2.1 Quick Info Cards Component

Location: `/src/components/coming-soon/QuickInfoCards.astro`

```astro
---
const { schoolInfo, applicationLink } = Astro.props;
---

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
  <!-- Ages Served Card -->
  <div class="info-card">
    <div class="icon">👶</div>
    <h3>Ages Served</h3>
    <p>{schoolInfo.data.agesServed}</p>
  </div>
  
  <!-- Hours Card -->
  <div class="info-card">
    <div class="icon">🕐</div>
    <h3>School Hours</h3>
    <p>Mon-Fri<br/>8:00 AM - 5:30 PM</p>
  </div>
  
  <!-- Phone Card -->
  <div class="info-card">
    <div class="icon">📞</div>
    <h3>Call Us</h3>
    <a href={`tel:${schoolInfo.data.phone}`}>{schoolInfo.data.phone}</a>
  </div>
  
  <!-- Apply Card -->
  <div class="info-card featured">
    <div class="icon">📝</div>
    <h3>Apply Now</h3>
    <a href={applicationLink} class="apply-button">Start Application</a>
  </div>
</div>
```

#### 2.2 Programs and Tuition Section

Location: `/src/components/coming-soon/ProgramsTuition.astro`

```astro
---
const { programs } = Astro.props;
---

<section class="programs-section">
  <h2>Our Programs</h2>
  
  <div class="programs-grid">
    {programs.map(program => (
      <div class="program-card">
        <h3>{program.data.name}</h3>
        <p>{program.data.description}</p>
        
        <div class="tuition-info">
          <h4>Tuition Range:</h4>
          <p class="range">
            ${Math.min(...program.rates.map(r => r.data.tuition_price)).toLocaleString()} - 
            ${Math.max(...program.rates.map(r => r.data.tuition_price)).toLocaleString()}
          </p>
          <p class="note">Based on our Family Income Tuition (FIT) model</p>
        </div>
        
        {program.data.extended_care_available && (
          <p class="extended-care">
            ✓ Extended care available until 5:30 PM
          </p>
        )}
      </div>
    ))}
  </div>
  
  <div class="fit-explanation">
    <h3>Our FIT Model</h3>
    <p>
      We use a sliding scale tuition model based on family income, 
      making quality Montessori education accessible to diverse families.
    </p>
  </div>
</section>
```

#### 2.3 Contact Form Component

Location: `/src/components/coming-soon/ContactForm.astro`

```astro
---
// Simplified contact form for coming soon page
---

<form 
  name="coming-soon-contact" 
  method="POST" 
  data-netlify="true"
  data-netlify-honeypot="bot-field"
  class="contact-form"
>
  <input type="hidden" name="form-name" value="coming-soon-contact" />
  
  <div class="form-grid">
    <div class="form-group">
      <label for="name">Name *</label>
      <input type="text" id="name" name="name" required />
    </div>
    
    <div class="form-group">
      <label for="email">Email *</label>
      <input type="email" id="email" name="email" required />
    </div>
    
    <div class="form-group">
      <label for="phone">Phone</label>
      <input type="tel" id="phone" name="phone" />
    </div>
    
    <div class="form-group">
      <label for="interest">I'm interested in:</label>
      <select id="interest" name="interest">
        <option value="tour">Schedule a Tour</option>
        <option value="apply">Application Information</option>
        <option value="tuition">Tuition Questions</option>
        <option value="general">General Information</option>
      </select>
    </div>
  </div>
  
  <div class="form-group full-width">
    <label for="message">Message</label>
    <textarea id="message" name="message" rows="4"></textarea>
  </div>
  
  <button type="submit" class="submit-button">
    Send Message
  </button>
</form>
```

### Phase 3: Styling and Animations

#### 3.1 Enhanced Styles

```css
/* Base styles maintaining existing aesthetic */
.coming-soon-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  position: relative;
  overflow-x: hidden;
}

/* Animated background elements */
.nature-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.floating-leaf {
  position: absolute;
  opacity: 0.1;
  animation: float-leaf 20s infinite ease-in-out;
}

@keyframes float-leaf {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(50px, -30px) rotate(90deg); }
  50% { transform: translate(-30px, 40px) rotate(180deg); }
  75% { transform: translate(40px, 20px) rotate(270deg); }
}

/* Section animations */
.fade-in-section {
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.8s ease-out forwards;
}

.fade-in-section:nth-child(1) { animation-delay: 0.2s; }
.fade-in-section:nth-child(2) { animation-delay: 0.4s; }
.fade-in-section:nth-child(3) { animation-delay: 0.6s; }
.fade-in-section:nth-child(4) { animation-delay: 0.8s; }

/* Info cards with hover effects */
.info-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid rgba(104, 160, 99, 0.2);
}

.info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-color: rgba(104, 160, 99, 0.4);
}

.info-card.featured {
  background: linear-gradient(135deg, #68a063 0%, #5a8c55 100%);
  color: white;
}

/* Program cards */
.program-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.program-card:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

/* Responsive grid layouts */
@media (max-width: 768px) {
  .programs-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
```

### Phase 4: Interactive Features

#### 4.1 Hours Display Widget Integration

```javascript
// Simplified hours display for coming soon page
class HoursDisplay {
  constructor(hoursData) {
    this.hours = hoursData;
    this.render();
  }
  
  getCurrentStatus() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour + minute / 60;
    
    const todayHours = this.hours.find(h => 
      h.data.order === day + 1
    );
    
    if (!todayHours || todayHours.data.is_closed) {
      return { status: 'closed', message: 'Closed today' };
    }
    
    const openTime = this.parseTime(todayHours.data.open_time);
    const closeTime = this.parseTime(todayHours.data.close_time);
    
    if (currentTime < openTime) {
      return { status: 'closed', message: `Opens at ${todayHours.data.open_time}` };
    } else if (currentTime > closeTime) {
      return { status: 'closed', message: 'Closed for today' };
    } else {
      return { status: 'open', message: `Open until ${todayHours.data.close_time}` };
    }
  }
  
  parseTime(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes = 0] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours + minutes / 60;
  }
  
  render() {
    const status = this.getCurrentStatus();
    const element = document.getElementById('current-status');
    
    if (element) {
      element.innerHTML = `
        <span class="status-indicator ${status.status}"></span>
        ${status.message}
      `;
    }
  }
}
```

### Phase 5: Data Integration

#### 5.1 Content Collection Schema Updates

Location: `/src/content/config.ts`

```typescript
// Add coming soon collection if not exists
const comingSoonCollection = defineCollection({
  type: 'content',
  schema: z.object({
    enabled: z.boolean(),
    launchDate: z.date().optional(),
    headline: z.string(),
    message: z.string(),
    showNewsletter: z.boolean().default(false),
    showContact: z.boolean().default(true),
    showPrograms: z.boolean().default(true),
    showTestimonials: z.boolean().default(true),
  }),
});
```

### Phase 6: Quality Assurance

#### 6.1 Testing Checklist

1. **Content Accuracy**
   - [ ] All school information displays correctly
   - [ ] Tuition ranges calculate properly
   - [ ] Hours display accurately
   - [ ] Contact information is current

2. **Functionality**
   - [ ] Contact form submits successfully
   - [ ] Application link works
   - [ ] Phone/email links function
   - [ ] All animations perform smoothly

3. **Responsive Design**
   - [ ] Mobile layout (320px - 768px)
   - [ ] Tablet layout (768px - 1024px)
   - [ ] Desktop layout (1024px+)
   - [ ] All content remains readable

4. **Accessibility**
   - [ ] Keyboard navigation works
   - [ ] Screen reader compatible
   - [ ] Color contrast passes WCAG AA
   - [ ] Focus indicators visible

5. **Performance**
   - [ ] Page loads under 3 seconds
   - [ ] Animations don't cause jank
   - [ ] Images are optimized
   - [ ] Fonts load efficiently

## Implementation Roadmap

### Task Breakdown

1. **Update Coming Soon Page Structure** (3 hours)
   - Implement new layout structure
   - Add all content sections
   - Integrate data from collections

2. **Component Development** (4 hours)
   - Create QuickInfoCards component
   - Build ProgramsTuition component
   - Develop simplified ContactForm
   - Add HoursDisplay widget

3. **Styling and Animations** (3 hours)
   - Implement responsive grid layouts
   - Add hover effects and transitions
   - Create background animations
   - Ensure mobile optimization

4. **Data Integration** (2 hours)
   - Connect all content collections
   - Process tuition data for ranges
   - Format hours information
   - Pull testimonials

5. **Testing and Polish** (2 hours)
   - Cross-browser testing
   - Mobile device testing
   - Form submission testing
   - Performance optimization

### Total Estimated Time: 14 hours

## Success Metrics

1. **User Experience**
   - All essential information available without scrolling on desktop
   - Contact form completion rate > 40%
   - Mobile users can access all features easily

2. **Performance**
   - Lighthouse score > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3s

3. **Functionality**
   - Zero broken links or features
   - Form submissions process correctly
   - All data displays accurately

## Architecture Benefits

- **Complete Information**: Parents get all essential details in one place
- **Professional Presentation**: Maintains school's professional image
- **Easy Maintenance**: Pulls from existing content collections
- **Scalable Design**: Easy to add/remove sections as needed
- **Consistent Branding**: Uses existing design system

## Risk Mitigation

1. **Content Overload**
   - Risk: Too much information on one page
   - Mitigation: Progressive disclosure, collapsible sections

2. **Performance Impact**
   - Risk: Slow load times with all content
   - Mitigation: Lazy loading, optimized images, minimal JavaScript

3. **Mobile Usability**
   - Risk: Difficult to navigate on small screens
   - Mitigation: Accordion patterns, prioritized content order

## Next Steps

1. Review and approve the architectural design
2. Create feature branch for implementation
3. Begin with page structure updates
4. Implement components incrementally
5. Test thoroughly before deployment

---

This comprehensive coming soon page will serve as an effective bridge while the main site is being updated, ensuring parents have access to all critical information about Spicebush Montessori School.