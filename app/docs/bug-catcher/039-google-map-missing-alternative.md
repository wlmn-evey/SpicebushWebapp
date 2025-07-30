---
bug_id: 039
title: "Google Map Embed Missing Text Alternative"
severity: medium
category: accessibility
status: open
reported_date: 2025-07-29
reported_by: "UX Advocate Review"
assigned_to: null
components: ["Contact Form", "Map Embed"]
affected_pages: ["/contact"]
related_bugs: ["011", "036", "037", "038"]
---

# Google Map Embed Missing Text Alternative

## Bug Summary
The Google Maps iframe embed on the contact page lacks a text alternative for users who cannot see or interact with the map. This violates WCAG 2.1 success criterion 1.1.1 (Non-text Content).

## Description
Users who rely on screen readers or have visual impairments cannot access the location information provided by the embedded map. There's no text alternative describing the location or providing directions.

## Steps to Reproduce
1. Navigate to /contact page
2. Locate the Google Maps embed
3. Note there's no title attribute on iframe
4. No text alternative or directions provided
5. Screen reader users only hear "iframe" or nothing

## Expected Behavior
- Map should have a descriptive title attribute
- Text alternative with address and basic directions should be provided
- Link to open map in new window for better accessibility
- Consider providing written directions

## Actual Behavior
- iframe has no title attribute
- No text alternative exists
- Screen reader users cannot access location information
- No way to get directions without seeing the map

## Affected Files
- `src/components/ContactForm.tsx`

## Potential Solutions

### Solution 1: Add Title and Text Alternative
```tsx
// In ContactForm.tsx
<div className="map-container">
  <iframe
    src="https://maps.google.com/..."
    width="100%"
    height="450"
    style={{ border: 0 }}
    allowFullScreen
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    title="Spicebush Montessori School location map"
    aria-label="Map showing Spicebush Montessori School at 123 Main Street, Boston"
  />
  
  <div className="sr-only">
    <h3>Directions to Spicebush Montessori School</h3>
    <p>
      We are located at 123 Main Street, Boston, MA 02101.
      The school is on the corner of Main and Oak Streets,
      across from City Park. Parking is available on site.
    </p>
  </div>
  
  <a 
    href="https://maps.google.com/..." 
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline mt-2 inline-block"
  >
    Open map in new window
  </a>
</div>
```

### Solution 2: Provide Detailed Directions Section
```tsx
// Add a separate directions section
<section className="mt-8">
  <h3 className="text-xl font-semibold mb-4">How to Find Us</h3>
  
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <h4 className="font-medium mb-2">By Car</h4>
      <ul className="space-y-1 text-sm">
        <li>From I-90: Take exit 24B toward Downtown</li>
        <li>Turn right on Main Street</li>
        <li>School is on the left after Oak Street</li>
        <li>Free parking available in our lot</li>
      </ul>
    </div>
    
    <div>
      <h4 className="font-medium mb-2">By Public Transit</h4>
      <ul className="space-y-1 text-sm">
        <li>Take the Green Line to Park Station</li>
        <li>Transfer to Bus #39</li>
        <li>Get off at Main & Oak stop</li>
        <li>School is across the street</li>
      </ul>
    </div>
  </div>
</section>
```

### Solution 3: Interactive Accessible Map
```tsx
// Consider using an accessible map library
import { AccessibleMap } from '@accessible/maps';

<AccessibleMap
  center={{ lat: 42.3601, lng: -71.0589 }}
  zoom={15}
  marker={{
    position: { lat: 42.3601, lng: -71.0589 },
    title: "Spicebush Montessori School"
  }}
  textAlternative="Located at 123 Main Street, Boston, MA"
/>
```

## Testing Requirements
- [ ] Verify iframe has descriptive title
- [ ] Check screen readers announce map properly
- [ ] Ensure text alternative is available
- [ ] Test "open in new window" link works
- [ ] Verify directions are accurate and helpful
- [ ] Test on mobile devices
- [ ] Check with keyboard navigation

## Notes
- Consider if embedded map is necessary at all
- Text directions may be more useful than a map
- Ensure any solution works on mobile devices
- This improves SEO as well as accessibility