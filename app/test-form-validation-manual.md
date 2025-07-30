# Manual Form Validation Testing Checklist

## Quick Manual Test Guide

This checklist helps verify the form validation enhancements are working correctly in a real browser.

### 🧪 Contact Form Testing (/contact)

#### Basic Validation Flow
- [ ] **Empty Required Fields**
  1. Click on "Your Name" field
  2. Click elsewhere (blur) without typing
  3. ✓ Red error "This field is required" appears below field
  4. ✓ Field border turns red
  5. ✓ Error has proper spacing and styling

- [ ] **Email Validation**
  1. Type "invalid" in email field
  2. Click elsewhere
  3. ✓ Error "Please enter a valid email address" appears
  4. Clear and type "test@example.com"
  5. ✓ Error disappears immediately

- [ ] **Phone Formatting**
  1. Type "1234567890" in phone field
  2. ✓ Automatically formats to "(123) 456-7890"
  3. Clear and type "123" 
  4. Click elsewhere
  5. ✓ Error "Please enter a 10-digit phone number" appears

- [ ] **Message Length**
  1. Type "Short" in message field
  2. Click elsewhere
  3. ✓ Error "Must be at least 10 characters" appears
  4. Add more text to make it longer
  5. ✓ Error clears when you start typing

#### Submission Testing
- [ ] **Block Invalid Submission**
  1. Leave all fields empty
  2. Click "Send Message"
  3. ✓ Form doesn't submit
  4. ✓ All required field errors appear
  5. ✓ Focus moves to first error field (name)

- [ ] **Allow Valid Submission**
  1. Fill all required fields correctly
  2. Click "Send Message"
  3. ✓ Button shows "Sending..." and is disabled
  4. ✓ Form submits successfully

### 📧 Newsletter Form Testing (Footer)

- [ ] **Email Validation**
  1. Scroll to footer
  2. Leave email empty and press Tab
  3. ✓ Error appears below field
  4. Type valid email
  5. ✓ Error clears
  6. ✓ Can submit with valid email

### 💳 Donation Form Testing (/donate)

- [ ] **Amount Selection**
  1. Click different donation amounts
  2. ✓ Selected amount highlights
  3. ✓ Submit button updates with amount

- [ ] **Donor Info Validation**  
  1. Try to submit without filling fields
  2. ✓ Submit button is disabled
  3. Fill first name with "J" only
  4. ✓ Still disabled (needs 2+ characters)
  5. Complete all fields
  6. ✓ Submit button enables

- [ ] **Anonymous Donation**
  1. Check "Make this donation anonymous"
  2. ✓ Name fields become disabled
  3. ✓ Only email is required
  4. ✓ Can submit with just email

### ♿ Accessibility Testing

- [ ] **Keyboard Navigation**
  1. Press Tab to navigate through form
  2. ✓ Can reach all fields with keyboard
  3. ✓ Can submit with Enter key
  4. ✓ Focus indicators are visible

- [ ] **Screen Reader (if available)**
  1. Enable screen reader
  2. Navigate to form field
  3. ✓ Label is announced
  4. Create an error
  5. ✓ Error is announced
  6. ✓ Field marked as invalid

### 📱 Mobile Testing

- [ ] **Touch Interaction**
  1. Open on mobile device/emulator
  2. Tap form fields
  3. ✓ Keyboard appears appropriately
  4. ✓ Error messages are readable
  5. ✓ Can scroll to see all errors

- [ ] **Responsive Layout**
  1. Rotate device
  2. ✓ Form adapts to orientation
  3. ✓ Errors remain visible
  4. ✓ Submit button stays accessible

### 🔌 No JavaScript Test

- [ ] **Fallback Behavior**
  1. Disable JavaScript in browser
  2. Try to submit empty form
  3. ✓ Browser shows HTML5 validation messages
  4. ✓ Form still works (though less enhanced)

## Common Issues to Check

### Visual Issues
- Error messages overlapping other content
- Inconsistent spacing between fields
- Border colors not changing
- Text too small on mobile

### Functional Issues  
- Errors not clearing when fixed
- Multiple errors for same field
- Form submitting despite errors
- Focus not moving to error field

### Accessibility Issues
- Missing error announcements
- No keyboard access to fields
- Poor color contrast
- Touch targets too small

## Browser-Specific Tests

### Chrome/Edge
- [ ] Autofill doesn't break validation
- [ ] Dev tools form inspection works

### Firefox
- [ ] Form validation styling applies
- [ ] No console errors

### Safari
- [ ] iOS keyboard behavior correct
- [ ] Zoom not disabled

## Quick Regression Check

After any changes:
1. ✓ Required field validation works
2. ✓ Email validation works
3. ✓ Phone formatting works
4. ✓ Errors clear on input
5. ✓ Form submission blocked/allowed correctly
6. ✓ Keyboard navigation works
7. ✓ Mobile experience acceptable

---

**Testing Complete?** 
- Run automated tests: `npm run test`
- Check browser console for errors
- Verify no accessibility warnings