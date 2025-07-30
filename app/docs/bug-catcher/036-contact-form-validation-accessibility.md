---
bug_id: 036
title: "Contact Form Validation Missing Accessible Error Messages"
severity: high
category: accessibility
status: open
reported_date: 2025-07-29
reported_by: "UX Advocate Review"
assigned_to: null
components: ["Contact Form", "Form Validation"]
affected_pages: ["/contact"]
related_bugs: ["011", "037", "038", "039"]
---

# Contact Form Validation Missing Accessible Error Messages

## Bug Summary
Form validation on the contact page only provides visual feedback (red borders) without accessible error messages for screen reader users. This violates WCAG 2.1 success criterion 3.3.1 (Error Identification).

## Description
When form validation fails, users who rely on screen readers receive no indication of what went wrong. The only feedback is a visual red border which is inaccessible to blind users.

## Steps to Reproduce
1. Navigate to /contact page
2. Submit the form with invalid data (empty required fields)
3. Use a screen reader to check for error announcements
4. Note that no error messages are read aloud

## Expected Behavior
- Each field with an error should have an associated error message
- Error messages should be linked via aria-describedby
- Fields should have aria-invalid="true" when in error state
- Error messages should be announced to screen readers

## Actual Behavior
- Only visual feedback (border-red-500 class) is provided
- No error messages exist in the DOM
- No ARIA attributes indicate field validity
- Screen reader users have no way to know what's wrong

## Affected Files
- `src/components/ContactForm.tsx`
- `src/lib/validation.ts`

## Potential Solutions

### Solution 1: Add Error Message Elements
```tsx
// In ContactForm.tsx
{errors.name && (
  <span 
    id="name-error" 
    className="text-red-600 text-sm mt-1"
    role="alert"
  >
    Name is required
  </span>
)}

<input
  id="name"
  aria-describedby={errors.name ? "name-error" : undefined}
  aria-invalid={errors.name ? "true" : "false"}
  className={cn(
    "w-full px-4 py-2 border rounded-lg",
    errors.name ? "border-red-500" : "border-gray-300"
  )}
/>
```

### Solution 2: Create Reusable Error Component
```tsx
// New component: ErrorMessage.tsx
export function ErrorMessage({ 
  id, 
  error 
}: { 
  id: string; 
  error?: string 
}) {
  if (!error) return null;
  
  return (
    <span 
      id={`${id}-error`}
      className="text-red-600 text-sm mt-1 block"
      role="alert"
      aria-live="polite"
    >
      {error}
    </span>
  );
}
```

### Solution 3: Enhance Validation System
```tsx
// Update validation to include accessible attributes
const getFieldProps = (fieldName: string) => ({
  "aria-describedby": errors[fieldName] ? `${fieldName}-error` : undefined,
  "aria-invalid": errors[fieldName] ? "true" : "false",
  "aria-required": "true"
});
```

## Testing Requirements
- [ ] Test with NVDA on Windows
- [ ] Test with JAWS on Windows  
- [ ] Test with VoiceOver on macOS
- [ ] Verify error announcements work
- [ ] Confirm aria-describedby associations
- [ ] Check aria-invalid states
- [ ] Run axe DevTools scan
- [ ] Test keyboard navigation

## Notes
- This is a WCAG 2.1 Level A violation
- Affects all users relying on assistive technology
- Should be fixed before public launch
- Consider adding a general error summary at form top