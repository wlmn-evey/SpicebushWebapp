# Manual Accessibility Testing Guide
## Critical Fixes Validation

This guide provides step-by-step instructions for manually testing the four critical accessibility fixes that were implemented.

---

## 🎯 Overview of Fixes Tested

1. **Bug 036**: Contact form validation with accessible error messages (aria-live announcements)
2. **Bug 037**: Honeypot field hidden from screen readers (aria-hidden="true") 
3. **Bug 006**: Complete alt text audit - all images have descriptive alt text
4. **Bug 017**: Fixed heading hierarchy - proper H1 → H2 → H3 structure

---

## 🛠️ Testing Tools You'll Need

### Browser Extensions (Install These)
- **axe DevTools** (Chrome/Firefox) - Free accessibility scanner
- **WAVE Web Accessibility Evaluator** - Visual accessibility feedback  
- **Lighthouse** (Built into Chrome DevTools) - Accessibility auditing
- **HeadingsMap** - Visualizes heading structure

### Screen Reader Testing (Choose One)
- **NVDA** (Windows - Free) - Download from nvaccess.org
- **JAWS** (Windows - Trial available) - freedomscientific.com
- **VoiceOver** (Mac - Built-in) - Enable in System Preferences > Accessibility
- **Orca** (Linux - Free) - Usually pre-installed

### Keyboard Testing
- Just your keyboard! No additional tools needed.

---

## 📋 Test 1: Contact Form Validation Accessibility (Bug 036)

### What We Fixed
- Added aria-live announcements for validation errors
- Implemented proper aria-invalid and aria-describedby relationships
- Made error messages screen reader friendly

### Manual Testing Steps

#### 1. Screen Reader Testing
1. **Turn on your screen reader** (VoiceOver: Cmd+F5, NVDA: Ctrl+Alt+N)
2. **Navigate to:** http://localhost:4321/contact
3. **Find the contact form** and navigate to the Name field
4. **Leave Name field empty** and tab to the next field
5. **Listen for announcement** - Should hear something like: "Name field, required, invalid, please enter your name"

**✅ Expected Results:**
- Error announced immediately when field loses focus
- Clear, instructional error message (not just "invalid")
- Field marked as "invalid" or "has error"

#### 2. Visual Testing
1. **Open contact page** in browser
2. **Submit form without filling required fields**
3. **Look for error messages** that appear near each field
4. **Right-click** on Name field → **Inspect Element**
5. **Check HTML attributes:**
   - `aria-invalid="true"`
   - `aria-describedby="name-error"` (or similar)

**✅ Expected Results:**
- Visual error messages appear
- ARIA attributes present in HTML
- Error messages have proper IDs matching aria-describedby

#### 3. Keyboard Navigation Testing
1. **Tab through form** using only Tab key
2. **Submit with errors** present
3. **Use Tab/Shift+Tab** to navigate between error fields
4. **Verify focus** remains manageable and logical

**✅ Expected Results:**
- Can navigate to all form fields with keyboard
- Error fields remain accessible via Tab
- Focus doesn't get trapped or lost

---

## 🕳️ Test 2: Honeypot Field Invisibility (Bug 037)

### What We Fixed
- Added aria-hidden="true" to honeypot container
- Set tabindex="-1" to prevent keyboard access
- Maintained visual invisibility with display:none

### Manual Testing Steps

#### 1. Screen Reader Testing
1. **Turn on screen reader**
2. **Navigate to contact form**
3. **Use screen reader navigation** (arrow keys, Tab key)
4. **Listen for any mention** of "bot-field" or similar spam-detection field

**✅ Expected Results:**
- Honeypot field completely ignored by screen reader
- No announcement of hidden form field
- Form navigation flows naturally

#### 2. Keyboard Testing
1. **Navigate contact form** using only Tab key
2. **Tab through every field** from start to finish
3. **Count the fields** you can reach

**✅ Expected Results:**
- Can reach: Name, Email, Phone, Child Age, Subject, Message, Checkbox, Submit
- Cannot reach: Any hidden "bot-field" or spam detection field

#### 3. Developer Tools Inspection
1. **Right-click contact form** → **Inspect Element**
2. **Search for "bot-field"** (Ctrl+F in DevTools)
3. **Check the attributes** on the honeypot field container

**✅ Expected Results:**
```html
<div style="display: none;" aria-hidden="true">
  <input name="bot-field" tabindex="-1" autocomplete="off" />
</div>
```

---

## 🖼️ Test 3: Alt Text Audit (Bug 006)

### What We Fixed
- Added descriptive alt text to all images
- Ensured educational context is preserved
- Eliminated missing alt attributes

### Manual Testing Steps

#### 1. Screen Reader Testing
1. **Turn on screen reader**
2. **Navigate through these pages:**
   - Homepage (/)
   - About (/about)
   - Programs (/programs)
   - Admissions (/admissions)
   - Contact (/contact)
3. **Listen to image descriptions** as screen reader encounters them

**✅ Expected Results:**
- Every image has meaningful description
- Descriptions explain educational context (e.g., "Child using Montessori pink tower materials to develop spatial reasoning")
- No generic descriptions like "image" or "photo"

#### 2. Browser Extension Testing
1. **Install WAVE extension** (wave.webaim.org/extension)
2. **Visit each page** and click WAVE icon
3. **Look for red error icons** indicating missing alt text
4. **Click on image icons** to see alt text content

**✅ Expected Results:**
- No red "missing alt text" errors
- All images show descriptive alt text in WAVE popup
- Alt text relates to educational content

#### 3. Manual Inspection
1. **Right-click on images** → **Inspect Element**
2. **Look for alt attribute** on `<img>` tags
3. **Check OptimizedImage components** for alt prop

**✅ Expected Results:**
```html
<!-- Good alt text examples -->
<img src="..." alt="Child concentrating while using Montessori golden beads to learn decimal system concepts" />
<img src="..." alt="Mixed-age classroom with older child helping younger student with practical life pouring exercise" />
```

---

## 📑 Test 4: Heading Hierarchy (Bug 017)

### What We Fixed
- Ensured only one H1 per page
- Created logical H1 → H2 → H3 progression
- Made heading structure navigable for screen readers

### Manual Testing Steps

#### 1. Screen Reader Heading Navigation
1. **Turn on screen reader**
2. **Navigate to any page**
3. **Use heading navigation:**
   - VoiceOver: VO + Cmd + H
   - NVDA: H key
   - JAWS: H key
4. **Navigate through all headings** on the page

**✅ Expected Results:**
- Can jump between headings easily
- Heading levels make sense (H1 → H2 → H3, no skipping)
- Only one H1 per page

#### 2. HeadingsMap Extension Testing
1. **Install HeadingsMap** browser extension
2. **Visit each page** and click HeadingsMap icon
3. **Review the heading outline** structure

**✅ Expected Results:**
```
H1 Page Title
  H2 Section Title
    H3 Subsection
    H3 Another Subsection
  H2 Another Section
    H3 Subsection
```

#### 3. Developer Tools Inspection
1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Run this JavaScript:**
```javascript
// Check heading structure
const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
headings.forEach((h, i) => {
  console.log(`${i + 1}. ${h.tagName}: "${h.textContent.trim()}"`);
});

// Count H1s
const h1Count = document.querySelectorAll('h1').length;
console.log(`\nH1 count: ${h1Count} (should be 1)`);
```

**✅ Expected Results:**
- Only 1 H1 per page
- Logical progression of heading levels
- No skipped levels (H1 → H3 without H2)

---

## ♿ WCAG 2.1 Level A Compliance Testing

### Keyboard Navigation Test
1. **Use only Tab, Shift+Tab, Enter, Space, Arrow keys**
2. **Navigate entire site** without using mouse
3. **Test all interactive elements:**
   - Navigation menu
   - Form fields
   - Buttons
   - Links

**✅ Expected Results:**
- All interactive elements reachable by keyboard
- Visible focus indicators on focused elements
- Logical tab order throughout site

### Color Contrast Test
1. **Install axe DevTools** extension
2. **Run accessibility scan** on each page
3. **Check for color contrast failures**

**✅ Expected Results:**
- No color contrast violations in axe report
- Text readable against backgrounds
- Interactive elements have sufficient contrast

---

## 📱 Mobile Accessibility Testing

### Touch Target Testing
1. **Open site on mobile device** (or Chrome DevTools mobile view)
2. **Try tapping all buttons and links**
3. **Check form field interactions**

**✅ Expected Results:**
- All touch targets at least 44px × 44px
- Easy to tap without accidentally hitting other elements
- Form fields work with mobile keyboards

### Mobile Screen Reader Testing
1. **Enable VoiceOver (iOS)** or **TalkBack (Android)**
2. **Navigate through contact form**
3. **Test image descriptions**

**✅ Expected Results:**
- Same accessibility features work on mobile
- Touch + screen reader gestures work properly
- Mobile keyboard types appropriate for field types

---

## 🚨 Common Issues to Watch For

### Red Flags (Fix Immediately)
- ❌ Screen reader announces "image" or "graphic" without description
- ❌ Form fields not announced or missing labels
- ❌ Error messages not announced when they appear
- ❌ Multiple H1 tags on same page
- ❌ Honeypot field reachable by Tab key
- ❌ Color contrast below 4.5:1 ratio

### Yellow Flags (Monitor)
- ⚠️ Alt text that's just filename ("IMG_1234.jpg")
- ⚠️ Generic error messages ("Error" instead of "Please enter your name")
- ⚠️ Heading levels that skip (H1 → H3)
- ⚠️ Form fields without visible labels

---

## 🎉 Success Criteria

Your accessibility fixes are working correctly if:

✅ **Contact Form (Bug 036)**
- Screen reader announces validation errors clearly
- Form fields have proper ARIA attributes
- Error messages are instructional, not generic

✅ **Honeypot Field (Bug 037)**  
- Completely invisible to screen readers
- Not reachable by keyboard navigation
- Still functions for spam protection

✅ **Alt Text (Bug 006)**
- Every image has descriptive alt text
- Descriptions provide educational context
- No missing alt attributes anywhere

✅ **Heading Hierarchy (Bug 017)**
- Only one H1 per page
- Logical heading progression (H1→H2→H3)
- Screen reader heading navigation works perfectly

✅ **WCAG Level A Compliance**
- Full keyboard navigation support
- Adequate color contrast ratios
- Proper form labels and associations
- Mobile accessibility maintained

---

## 🛟 Quick Fix Reference

If you find issues during testing:

**Screen Reader Not Announcing Errors:**
```html
<!-- Add aria-live region -->
<div aria-live="polite" id="form-errors"></div>

<!-- Associate with field -->
<input aria-describedby="field-error" aria-invalid="true" />
```

**Missing Alt Text:**
```html
<!-- Instead of -->
<img src="image.jpg" alt="image" />

<!-- Use -->
<img src="image.jpg" alt="Child using Montessori materials to develop fine motor skills" />
```

**Multiple H1s:**
```html
<!-- Fix this -->
<h1>Page Title</h1>
<h1>Section Title</h1>

<!-- To this -->
<h1>Page Title</h1>
<h2>Section Title</h2>
```

---

## 📞 Need Help?

If you encounter issues during testing:

1. **Check automated test results** first: `./test-accessibility-fixes.sh`
2. **Review browser console** for accessibility warnings
3. **Compare with working examples** from other pages
4. **Use axe DevTools** for detailed violation explanations

Remember: Good accessibility benefits everyone, not just users with disabilities!