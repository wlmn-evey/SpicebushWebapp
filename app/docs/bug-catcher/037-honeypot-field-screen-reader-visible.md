---
bug_id: 037
title: "Honeypot Field Visible to Screen Readers"
severity: high
category: accessibility
status: open
reported_date: 2025-07-29
reported_by: "UX Advocate Review"
assigned_to: null
components: ["Contact Form", "Anti-Spam"]
affected_pages: ["/contact"]
related_bugs: ["011", "036", "038", "039"]
---

# Honeypot Field Visible to Screen Readers

## Bug Summary
The honeypot anti-spam field in the contact form is announced by screen readers, potentially confusing users with visual impairments who don't understand why there's an extra field they shouldn't fill out.

## Description
The honeypot field designed to catch bots is not properly hidden from assistive technology. Screen reader users will hear this field announced and may attempt to fill it out, which would cause their legitimate submission to be rejected as spam.

## Steps to Reproduce
1. Navigate to /contact page with a screen reader enabled
2. Tab through the form fields
3. Notice the honeypot field is announced
4. Field may be confusing as it has no visible label

## Expected Behavior
- Honeypot field should be completely invisible to screen readers
- Field should not be in the tab order
- Should only trap bot submissions, not legitimate users

## Actual Behavior
- Field is announced by screen readers
- Can be reached via keyboard navigation
- May confuse or trap legitimate users with disabilities

## Affected Files
- `src/components/ContactForm.tsx`

## Potential Solutions

### Solution 1: Add Proper ARIA Attributes
```tsx
// In ContactForm.tsx
<div 
  className="absolute -left-[9999px]"
  aria-hidden="true"
>
  <label htmlFor="website">
    Website
    <input
      type="text"
      id="website"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
    />
  </label>
</div>
```

### Solution 2: Use CSS Visibility
```tsx
// Better approach using CSS
<div className="sr-only-reverse"> {/* visually present but hidden from screen readers */}
  <input
    type="text"
    name="email_confirm"
    tabIndex={-1}
    autoComplete="off"
    aria-hidden="true"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />
</div>

// CSS
.sr-only-reverse {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Solution 3: Alternative Anti-Spam Method
```tsx
// Consider time-based validation instead
const [formLoadTime] = useState(Date.now());

const handleSubmit = (e) => {
  e.preventDefault();
  
  // Reject if form submitted too quickly (likely a bot)
  if (Date.now() - formLoadTime < 3000) {
    console.warn('Form submitted too quickly');
    return;
  }
  
  // Process legitimate submission
};
```

## Testing Requirements
- [ ] Verify field is not announced by NVDA
- [ ] Verify field is not announced by JAWS
- [ ] Verify field is not announced by VoiceOver
- [ ] Confirm field cannot be reached via Tab key
- [ ] Test that bot detection still works
- [ ] Ensure legitimate users aren't affected

## Notes
- This could cause legitimate users to be flagged as spam
- Accessibility should never be compromised for security
- Consider alternative anti-spam methods that don't impact accessibility
- May need to implement reCAPTCHA or similar solution