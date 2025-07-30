---
id: 007
title: "Small Touch Targets on Mobile"
severity: high
status: open
category: accessibility
affected_pages: ["all pages on mobile devices"]
related_bugs: [003, 011]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 007: Small Touch Targets on Mobile

## Description
Over 20 interactive elements on mobile devices have touch targets smaller than the recommended 44x44 pixel minimum. This makes it difficult for users to accurately tap links and buttons, especially for users with motor impairments or on small screens.

## Steps to Reproduce
1. Open site on mobile device or mobile viewport
2. Attempt to tap footer links, navigation items, or form inputs
3. Notice difficulty in accurately hitting targets
4. Run mobile usability audit to identify all instances

## Expected Behavior
- All interactive elements at least 44x44 pixels
- Adequate spacing between adjacent targets (minimum 8px)
- Easy to tap without accidental clicks
- Consistent touch target sizes across the site

## Actual Behavior
- Many links and buttons under 44x44 pixels
- Footer links particularly small and close together
- Form inputs difficult to select
- Frequent mis-taps requiring multiple attempts

## Audit Results
```
Touch Target Violations:
- Footer links: 32x20 pixels (22 instances)
- Navigation items: 40x35 pixels (8 instances)
- Form inputs: 38x30 pixels (6 instances)
- Social media icons: 24x24 pixels (4 instances)
- Inline text links: Various small sizes
- Close/dismiss buttons: 20x20 pixels (3 instances)

Most Problematic Areas:
1. Footer navigation links
2. Mobile menu items
3. Form field labels (used as click targets)
4. Calendar date picker
5. Pagination controls
```

## Affected Files
- `/src/components/Footer.astro` - Small footer links
- `/src/components/Header.astro` - Navigation items
- `/src/components/forms/*.astro` - Form inputs
- `/src/styles/global.css` - Base touch target styles
- Components with inline links

## Potential Causes
1. **Desktop-First Design**
   - Designed for mouse precision
   - Mobile styles added as afterthought
   - No mobile-specific padding

2. **Design Constraints**
   - Trying to fit too much in small space
   - Aesthetic preferences over usability
   - Following desktop patterns on mobile

3. **Missing Touch Target Guidelines**
   - No established minimum sizes
   - Developers unaware of requirements
   - No mobile testing during development

## Suggested Fixes

### Option 1: Global Touch Target Styles
```css
/* Add to global.css */
@media (hover: none) and (pointer: coarse) {
  /* Ensure all interactive elements meet minimum size */
  a, button, input, select, textarea, 
  [role="button"], [role="link"], [tabindex="0"] {
    min-height: 44px;
    min-width: 44px;
    position: relative;
  }
  
  /* Add touch target padding without affecting layout */
  a::before, button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: max(100%, 44px);
    height: max(100%, 44px);
    z-index: 1;
  }
  
  /* Ensure adequate spacing between targets */
  a + a, button + button {
    margin-left: 8px;
  }
}
```

### Option 2: Component-Specific Updates
```astro
---
// Footer.astro updates
---
<style>
  @media (max-width: 768px) {
    .footer-links {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    
    .footer-links a {
      display: block;
      padding: 12px 16px; /* Increases to 44px height */
      margin: 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      text-decoration: none;
      transition: background-color 0.2s;
    }
    
    .footer-links a:hover,
    .footer-links a:focus {
      background-color: rgba(0,0,0,0.05);
    }
  }
</style>
```

### Option 3: Touch-Friendly Form Inputs
```astro
---
// TextInput.astro improvements
---
<div class="form-field">
  <label for={id} class="form-label">
    {label}
  </label>
  <input
    type={type}
    id={id}
    name={name}
    class="form-input"
    required={required}
    aria-describedby={error ? `${id}-error` : undefined}
  />
  {error && <span id={`${id}-error`} class="error">{error}</span>}
</div>

<style>
  @media (max-width: 768px) {
    .form-field {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .form-input {
      width: 100%;
      min-height: 48px; /* Larger than minimum for comfort */
      padding: 12px 16px;
      font-size: 16px; /* Prevents zoom on iOS */
      border: 2px solid #ccc;
      border-radius: 4px;
      transition: border-color 0.2s;
    }
    
    .form-input:focus {
      border-color: var(--primary-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
    }
  }
</style>
```

### Option 4: Mobile-Specific Navigation
```astro
---
// MobileNav.astro
---
<nav class="mobile-nav" aria-label="Mobile navigation">
  <ul class="mobile-nav-list">
    {navItems.map(item => (
      <li class="mobile-nav-item">
        <a href={item.href} class="mobile-nav-link">
          {item.icon && <span class="nav-icon">{item.icon}</span>}
          <span class="nav-text">{item.text}</span>
        </a>
      </li>
    ))}
  </ul>
</nav>

<style>
  .mobile-nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .mobile-nav-link {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    min-height: 56px; /* Extra comfortable */
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s;
  }
  
  .mobile-nav-link:active {
    background-color: rgba(0,0,0,0.1);
  }
  
  .nav-icon {
    margin-right: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
</style>
```

## Testing Requirements
1. Test on actual mobile devices with touch
2. Use Chrome DevTools mobile emulation
3. Verify all targets are at least 44x44 pixels
4. Check spacing between adjacent targets
5. Test with users who have motor impairments
6. Verify no accidental taps occur
7. Test one-handed phone use

## Related Issues
- Bug #003: Mobile navigation (needs proper touch targets)
- Bug #011: Form accessibility (includes touch targets)

## Additional Notes
- WCAG 2.1 requires 44x44 pixel targets (Level AAA)
- Apple recommends 44x44, Google recommends 48x48
- Consider larger targets for elderly users
- Test with stylus input devices
- Monitor tap accuracy analytics