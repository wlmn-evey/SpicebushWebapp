---
id: 025
title: "CSS Specificity Conflicts"
severity: low
status: open
category: ux
affected_pages: ["various components"]
related_bugs: []
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 025: CSS Specificity Conflicts

## Description
CSS styles have specificity conflicts causing inconsistent styling, with some components requiring `!important` flags and styles being overridden unexpectedly. This makes maintenance difficult and causes visual inconsistencies.

## Steps to Reproduce
1. Inspect styled components
2. Notice `!important` usage
3. Find overridden styles
4. See inconsistent spacing/colors

## Expected Behavior
- Consistent styling
- No `!important` needed
- Predictable cascade
- Maintainable CSS

## Actual Behavior
- Styles randomly override
- 15+ `!important` flags
- Inconsistent component styles
- Hard to debug styling

## CSS Analysis
```
Specificity Issues Found:

1. Overuse of !important
   - Button styles: 5 instances
   - Form inputs: 3 instances  
   - Layout classes: 4 instances
   - Typography: 3 instances

2. Conflicting Selectors
   - .btn vs button.btn
   - #header a vs .nav-link
   - div.container vs .container
   - Multiple utility classes

3. Global vs Component Styles
   - Global styles too specific
   - Component styles too generic
   - Inheritance issues
   - Cascade conflicts

4. CSS Organization
   - No clear naming convention
   - Mixed methodologies (BEM + utility)
   - Duplicate declarations
   - No CSS architecture

Example Conflicts:
/* Global CSS */
button { padding: 10px 20px; }
.btn { padding: 8px 16px !important; }

/* Component CSS */
.header button { padding: 12px 24px; }
.nav .btn { padding: 6px 12px !important; }
```

## Suggested Fixes

### Fix 1: CSS Architecture
```css
/* Adopt BEM methodology */
.button {
  padding: 12px 24px;
  border: none;
  cursor: pointer;
}

.button--primary {
  background: var(--color-primary);
  color: white;
}

.button--small {
  padding: 8px 16px;
  font-size: 14px;
}

/* Component namespacing */
.c-header {}
.c-header__nav {}
.c-header__button {}

/* Utility classes with consistent specificity */
.u-mt-1 { margin-top: 8px; }
.u-mt-2 { margin-top: 16px; }
```

### Fix 2: CSS Custom Properties
```css
/* Define design tokens */
:root {
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Colors */
  --color-primary: #2c5282;
  --color-secondary: #38a169;
  
  /* Typography */
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  
  /* Components */
  --button-padding: var(--spacing-sm) var(--spacing-md);
  --button-radius: 4px;
}

/* Use consistently */
.button {
  padding: var(--button-padding);
  border-radius: var(--button-radius);
}
```

### Fix 3: Scoped Styles with CSS Modules
```astro
---
// Button.astro
---
<button class="button primary">
  <slot />
</button>

<style>
  /* Scoped to this component only */
  .button {
    padding: 12px 24px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .button.primary {
    background: var(--color-primary);
    color: white;
  }
  
  .button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
</style>
```

### Fix 4: Remove !important
```javascript
// Script to find and fix !important usage
const findImportant = () => {
  const sheets = document.styleSheets;
  const important = [];
  
  for (let sheet of sheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      for (let rule of rules) {
        if (rule.style) {
          for (let prop of rule.style) {
            if (rule.style.getPropertyPriority(prop) === 'important') {
              important.push({
                selector: rule.selectorText,
                property: prop,
                value: rule.style.getPropertyValue(prop)
              });
            }
          }
        }
      }
    } catch (e) {
      // Cross-origin stylesheets
    }
  }
  
  console.table(important);
};
```

## Testing Requirements
1. Visual regression testing
2. Check all components render correctly
3. Verify no broken layouts
4. Test responsive behavior
5. Cross-browser testing

## Additional Notes
- Consider CSS-in-JS solution
- Document CSS architecture
- Add stylelint for consistency
- Regular CSS audits needed
- Train team on CSS best practices