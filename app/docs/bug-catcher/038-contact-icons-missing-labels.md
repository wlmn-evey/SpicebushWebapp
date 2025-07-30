---
bug_id: 038
title: "Contact Form Icons Missing Accessibility Labels"
severity: medium
category: accessibility
status: open
reported_date: 2025-07-29
reported_by: "UX Advocate Review"
assigned_to: null
components: ["Contact Form", "Icons"]
affected_pages: ["/contact"]
related_bugs: ["011", "036", "037", "039"]
---

# Contact Form Icons Missing Accessibility Labels

## Bug Summary
Icons in the contact form (Phone, Mail, MapPin) lack aria-labels, making their purpose unclear to screen reader users. This violates WCAG 2.1 success criterion 1.1.1 (Non-text Content).

## Description
The Lucide React icons used in the contact information section have no accessible labels. Screen reader users cannot understand what type of contact information is being presented.

## Steps to Reproduce
1. Navigate to /contact page with screen reader
2. Navigate to the contact information section
3. Notice icons are either skipped or announced as generic "image"
4. Context of phone, email, and address is lost

## Expected Behavior
- Each icon should have a descriptive aria-label
- Icons should provide context for the information they represent
- Screen readers should announce "Phone number:", "Email address:", etc.

## Actual Behavior
- Icons have no aria-labels
- Screen readers skip icons or announce them generically
- Users miss important context about contact methods

## Affected Files
- `src/components/ContactForm.tsx`
- Any other components using Lucide icons without labels

## Potential Solutions

### Solution 1: Add aria-label to Icons
```tsx
// In ContactForm.tsx
<Phone 
  className="h-5 w-5 text-primary" 
  aria-label="Phone number"
/>
<span>(555) 123-4567</span>

<Mail 
  className="h-5 w-5 text-primary" 
  aria-label="Email address"
/>
<span>info@spicebush.org</span>

<MapPin 
  className="h-5 w-5 text-primary" 
  aria-label="Location"
/>
<span>123 Main St, Boston, MA</span>
```

### Solution 2: Use Descriptive Text Instead
```tsx
// Replace icons with accessible text
<div className="flex items-center space-x-3">
  <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
  <span>
    <span className="sr-only">Phone: </span>
    (555) 123-4567
  </span>
</div>
```

### Solution 3: Create Accessible Icon Component
```tsx
// New component: AccessibleIcon.tsx
interface AccessibleIconProps {
  Icon: React.ComponentType<any>;
  label: string;
  className?: string;
}

export function AccessibleIcon({ Icon, label, className }: AccessibleIconProps) {
  return (
    <span role="img" aria-label={label}>
      <Icon className={className} aria-hidden="true" />
    </span>
  );
}

// Usage
<AccessibleIcon 
  Icon={Phone} 
  label="Phone number" 
  className="h-5 w-5 text-primary" 
/>
```

## Testing Requirements
- [ ] Test with NVDA - verify labels are announced
- [ ] Test with JAWS - verify labels are announced
- [ ] Test with VoiceOver - verify labels are announced
- [ ] Ensure visual appearance unchanged
- [ ] Check all icon instances across the site
- [ ] Run automated accessibility scan

## Notes
- This pattern should be applied site-wide
- Consider creating a standardized accessible icon component
- Document the pattern for future development
- Low hanging fruit for accessibility improvement