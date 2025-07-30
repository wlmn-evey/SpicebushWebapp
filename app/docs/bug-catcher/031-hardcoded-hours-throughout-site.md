---
id: 031
title: "Hardcoded Hours Instead of Dynamic Data"
severity: high
status: open
category: data-consistency
affected_pages: ["header", "footer", "about", "admissions", "programs"]
related_bugs: []
discovered_date: 2025-07-29
environment: [development, production]
browser: all
---

# Bug 031: Hardcoded Hours Instead of Dynamic Data

## Description
School hours are hardcoded in multiple locations throughout the site instead of consistently using the dynamic hours data from the database. This creates maintenance issues and potential inconsistencies when hours change.

## Current Instances Found

### 1. Header.astro (Line 50)
```astro
<span class="text-earth-brown hidden md:inline">Ages 3-6 • Mon-Fri 8:00 AM - 5:30 PM</span>
```
Should use: `${weekdayHours?.data.open_time} - ${weekdayHours?.data.close_time}`

### 2. Mobile Menu in Header.astro (Line 151)
```astro
<p>Monday - Friday: 8:00 AM - 5:30 PM</p>
```
Should use dynamic data like desktop version

### 3. Default Values
Multiple locations have fallback hours that don't match:
- Some show "8:30 AM - 3:30 PM"
- Others show "8:00 AM - 5:30 PM"
- Extended care shows different times

## Expected Behavior
- All hours should be pulled from the `hours` collection in the database
- Consistent fallback values when database is unavailable
- Single source of truth for all time-related information
- Hours should update site-wide when changed in admin

## Actual Behavior
- Hours are hardcoded in multiple templates
- Different hardcoded values in different locations
- Changes require manual updates in multiple files
- Risk of displaying incorrect information

## Impact
- **User Confusion**: Parents may see different hours on different pages
- **Maintenance Burden**: Staff must update multiple files when hours change
- **Data Integrity**: No guarantee all locations show correct hours
- **SEO**: Inconsistent information could hurt search rankings

## Affected Files
- `/src/components/Header.astro` - Multiple hardcoded instances
- `/src/components/Footer.astro` - Via HoursWidget (check implementation)
- `/src/pages/about.astro` - May have hardcoded hours
- `/src/pages/admissions/index.astro` - Likely has hours information
- `/src/pages/programs/*.astro` - Program-specific hours
- Any other templates mentioning hours

## Root Cause
- Initial development used hardcoded values for speed
- Dynamic data integration was incomplete
- No centralized hours management component

## Suggested Fix

### Option 1: Create Hours Context Provider
```typescript
// src/lib/hours-context.ts
export async function getSchoolHours() {
  try {
    const hours = await getCollection('hours');
    const weekdayHours = hours.find(h => h.data.day === 'Monday');
    return {
      openTime: weekdayHours?.data.open_time || '8:30 AM',
      closeTime: weekdayHours?.data.close_time || '3:30 PM',
      extendedCareUntil: '5:30 PM' // This should also be dynamic
    };
  } catch (error) {
    console.error('Error loading hours:', error);
    return {
      openTime: '8:30 AM',
      closeTime: '3:30 PM',
      extendedCareUntil: '5:30 PM'
    };
  }
}
```

### Option 2: Hours Display Component
```astro
---
// src/components/HoursDisplay.astro
import { getSchoolHours } from '@lib/hours-context';

interface Props {
  format?: 'full' | 'short' | 'inline';
  showDays?: boolean;
  showExtendedCare?: boolean;
}

const { format = 'full', showDays = true, showExtendedCare = false } = Astro.props;
const hours = await getSchoolHours();
---

<span class="hours-display">
  {showDays && 'Mon-Fri'} {hours.openTime} - {hours.closeTime}
  {showExtendedCare && ` • Extended care until ${hours.extendedCareUntil}`}
</span>
```

## Implementation Steps
1. Audit all files for hardcoded hours
2. Create centralized hours management
3. Replace all hardcoded instances
4. Add hours to school-info database table
5. Update admin interface to manage hours
6. Test across all pages
7. Verify SEO structured data uses dynamic hours

## Testing Requirements
1. Change hours in database
2. Verify all pages reflect new hours
3. Test fallback behavior when database unavailable
4. Check mobile and desktop displays
5. Verify structured data updates
6. Test extended care hours display

## Additional Notes
- This is critical for maintaining accurate information
- Should be fixed before school year schedule changes
- Consider adding holiday hours management
- May need timezone handling for consistency
- Could impact SEO if hours are wrong in structured data