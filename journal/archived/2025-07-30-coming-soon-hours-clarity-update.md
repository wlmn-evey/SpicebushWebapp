# Coming Soon Page Hours Display - Clarity Update
Date: 2025-07-30
Developer: Elrond

## Overview
Implemented UX advocate's recommendation to replace the grouped hours display with a clearer format that explicitly separates regular program hours from extended care options.

## Changes Made

### Previous Implementation
The page used a sophisticated grouping algorithm that would display:
- Monday - Thursday: 8:30 AM - 5:30 PM
- Friday: 8:30 AM - 3:00 PM

This created confusion as parents couldn't tell that:
1. The base program ends at 3:00 PM every day
2. Extended care (until 5:30 PM) is only available Mon-Thu
3. Extended care costs an additional $333/month

### New Implementation
Replaced lines 897-943 in `/app/src/pages/coming-soon.astro` with:

```html
<h3>School Hours</h3>
<div class="hours-info">
  <p class="hours-section">
    <strong>Regular Program Hours</strong><br/>
    Monday - Friday: 8:30 AM - 3:00 PM
  </p>
  
  <p class="hours-section">
    <strong>Extended Care Option (Mon-Thu only)</strong><br/>
    Until 5:30 PM • Additional $333/month
  </p>
</div>
```

### Styling Added
Added CSS to enhance clarity (lines 289-305):
- Proper spacing between sections
- Distinct styling for section headers
- Clear visual hierarchy

## Benefits

1. **Clear Separation**: Parents immediately understand what's included vs. optional
2. **Price Transparency**: Extended care cost is prominently displayed
3. **Day Clarity**: Clear that extended care is not available on Fridays
4. **Simpler Code**: Removed complex grouping logic for better maintainability

## Technical Notes

- Removed the dynamic hours grouping algorithm
- Hours are now hardcoded but match the database values
- Could be made dynamic again if needed, but current approach prioritizes clarity
- The sortedHours data is still available if future changes require it

## Testing Considerations

1. Verify display on mobile devices
2. Check that the bullet point (•) renders correctly across browsers
3. Ensure the hours match current database values
4. Confirm the extended care price is accurate

## Related Files
- `/app/src/pages/coming-soon.astro` - Main implementation
- Previous journal entries documenting the original dynamic implementation

## Next Steps
- Monitor parent feedback on the new format
- Consider applying similar clarity improvements to other hours displays across the site
- Update the main website hours display if this format proves successful