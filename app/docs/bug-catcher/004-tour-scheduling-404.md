---
id: 004
title: "Tour Scheduling Page Missing"
severity: critical
status: open
category: functionality
affected_pages: ["/admissions/schedule-tour"]
related_bugs: [008, 009, 010]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 004: Tour Scheduling Page Missing

## Description
The tour scheduling page (`/admissions/schedule-tour`) returns a 404 error. This is a critical conversion path for prospective parents who want to visit the school. Without this functionality, the school loses potential enrollments.

## Steps to Reproduce
1. Navigate to `/admissions/schedule-tour`
2. Page returns 404 Not Found error
3. Users cannot schedule tours online

## Expected Behavior
- Tour scheduling page should load successfully
- Form should allow parents to:
  - Select preferred tour dates/times
  - Enter contact information
  - Submit tour requests
  - Receive confirmation

## Actual Behavior
- Page returns 404 error
- No tour scheduling functionality available
- Parents must call or email to schedule tours
- Lost conversion opportunity

## Error Messages/Stack Traces
```
404 Not Found
The requested page /admissions/schedule-tour could not be found.
```

## Affected Files
- Missing: `/src/pages/admissions/schedule-tour.astro`
- `/src/pages/admissions.astro` - Contains broken link to tour page
- Navigation components linking to tour scheduling

## Potential Causes
1. **Page Never Created**
   - Feature planned but not implemented
   - Page deleted accidentally
   - Migration issue from previous site

2. **Routing Issue**
   - Incorrect route configuration
   - File in wrong location
   - Build process not including page

3. **Feature Removed**
   - Intentionally removed but links remain
   - Replaced with different solution
   - Temporary removal during development

## Suggested Fixes

### Option 1: Implement Full Tour Scheduling (Recommended)
```astro
---
// /src/pages/admissions/schedule-tour.astro
import Layout from '@layouts/Layout.astro';
import TourSchedulingForm from '@components/forms/TourSchedulingForm.astro';
import { getAvailableTourSlots } from '@lib/tour-scheduling';

const availableSlots = await getAvailableTourSlots();
---

<Layout title="Schedule a Tour - Spicebush Montessori">
  <main>
    <section class="hero-section">
      <h1>Schedule Your School Tour</h1>
      <p>Discover the Spicebush Montessori difference with a personalized tour</p>
    </section>
    
    <section class="tour-info">
      <h2>What to Expect</h2>
      <ul>
        <li>45-minute guided tour of our facilities</li>
        <li>Meet our teachers and staff</li>
        <li>Q&A session about our programs</li>
        <li>Enrollment information packet</li>
      </ul>
    </section>
    
    <section class="scheduling-form">
      <TourSchedulingForm slots={availableSlots} />
    </section>
  </main>
</Layout>
```

### Option 2: Simple Contact Form (Quick Fix)
```astro
---
// Redirect to contact page with tour parameter
return Astro.redirect('/contact?purpose=tour');
---
```

### Option 3: Calendly Integration
```html
<!-- Embed Calendly widget -->
<div class="calendly-inline-widget" 
     data-url="https://calendly.com/spicebush-tours/school-tour"
     style="min-width:320px;height:630px;">
</div>
<script type="text/javascript" 
        src="https://assets.calendly.com/assets/external/widget.js" 
        async>
</script>
```

### Option 4: Database-Driven Solution
```typescript
// Tour scheduling API endpoint
export async function post({ request }) {
  const data = await request.json();
  
  // Validate tour request
  const validation = validateTourRequest(data);
  if (!validation.valid) {
    return new Response(JSON.stringify({ 
      error: validation.errors 
    }), { status: 400 });
  }
  
  // Check availability
  const isAvailable = await checkTimeSlotAvailability(data.datetime);
  if (!isAvailable) {
    return new Response(JSON.stringify({ 
      error: 'Time slot not available' 
    }), { status: 409 });
  }
  
  // Save tour request
  const tour = await saveTourRequest({
    ...data,
    status: 'pending',
    createdAt: new Date()
  });
  
  // Send confirmation emails
  await sendTourConfirmationEmail(tour);
  await notifyAdminOfTourRequest(tour);
  
  return new Response(JSON.stringify({ 
    success: true, 
    tourId: tour.id 
  }));
}
```

## Testing Requirements
1. Verify page loads without 404 error
2. Test form submission and validation
3. Check email notifications work
4. Verify calendar availability logic
5. Test on mobile devices
6. Confirm accessibility compliance
7. Load test with multiple concurrent submissions

## Related Issues
- Bug #008: Broken internal links pointing to this page
- Bug #009: Contact info not prominent (alternative to online scheduling)
- Bug #010: Missing CTAs that should link here

## Additional Notes
- This is a critical conversion feature
- Consider implementing automated reminder emails
- Add Google Calendar integration for staff
- Include virtual tour option
- Track conversion metrics
- May need SMS notifications for last-minute changes