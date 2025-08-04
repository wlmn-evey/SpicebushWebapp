# UX Review: Coming Soon Page Hours Display
Date: 2025-07-30
Reviewer: Spicebush UX Advocate

## Overview
The coming soon page now displays school hours using a dynamic grouping system that consolidates consecutive days with the same hours. This review evaluates the implementation from the perspective of parents and school administrators.

## Current Implementation Analysis

### What's Working Well
1. **Smart Grouping**: The system successfully groups Monday-Thursday as "8:30 AM - 5:30 PM"
2. **Clear Friday Distinction**: Friday's different hours (8:30 AM - 3:00 PM) are displayed separately
3. **Professional Time Format**: Uses standard 12-hour format with AM/PM notation
4. **Visual Hierarchy**: Bold day ranges with times on the next line

### Areas of Concern

#### 1. Missing Context About Extended Care
**Issue**: The display shows "8:30 AM - 5:30 PM" for Monday-Thursday without explaining this includes extended care.

**Impact**: Parents might assume:
- All students stay until 5:30 PM (not true - base program ends at 3:00 PM)
- Extended care is free/included (it's actually $333/month extra)
- Friday has shorter hours for everyone (actually, it just doesn't offer extended care)

**Recommendation**: Add contextual information to clarify the hours structure.

#### 2. Confusing Day Range Format
**Issue**: "Monday - Thursday" could be misread as "Monday through Thursday" implying Tuesday/Wednesday might be different.

**Impact**: Parents scanning quickly might not realize all four days have identical hours.

**Recommendation**: Consider "Mon-Thu" abbreviated format or spell out more clearly.

#### 3. No Visual Cues for Different Hour Types
**Issue**: Base hours vs. extended care hours are not distinguished visually.

**Impact**: Parents planning their work schedules need to understand what's standard vs. optional.

## Recommended Improvements

### Immediate Fix (High Priority)
Replace the current hours display with a more informative structure:

```html
<h3>School Hours</h3>
<p><strong>Regular Program</strong><br/>
Monday - Friday: 8:30 AM - 3:00 PM</p>

<p><strong>Extended Care Option</strong><br/>
Monday - Thursday: Until 5:30 PM<br/>
<small style="color: var(--text-secondary)">Additional $333/month</small></p>

<p><strong>Note:</strong> No extended care on Fridays</p>
```

### Alternative Approach
If keeping the grouped display, add clarifying context:

```html
<p>
  <strong>Monday - Thursday</strong><br/>
  8:30 AM - 3:00 PM (Regular)<br/>
  8:30 AM - 5:30 PM (With Extended Care)
</p>
<p>
  <strong>Friday</strong><br/>
  8:30 AM - 3:00 PM<br/>
  <small style="color: var(--text-secondary); font-style: italic;">No extended care available</small>
</p>
```

### Long-term Enhancement
Consider a visual schedule component that shows:
- Color-coded blocks for regular vs. extended hours
- Clear pricing indicators
- Visual calendar grid showing the week at a glance

## Additional Observations

### Related Issues Found
1. **Extended Care Information**: The extended care details are buried in the Programs section. Parents looking at hours might not realize it's an option.

2. **Contact Hours Mismatch**: The contact section says "Monday-Friday: 8:30 AM - 5:00 PM" for phone availability, which doesn't match the school hours (5:30 PM).

3. **Mobile Responsiveness**: The hours card maintains good readability on mobile devices - this is working well.

## Conclusion
While the technical implementation of dynamic hour grouping is clever and reduces code duplication, it creates confusion about the school's actual operating model. The current display prioritizes code elegance over parent clarity.

**Priority Recommendation**: Revert to a clearer, more explicit hours display that separates regular program hours from extended care options. Parents need transparency about what they're paying for and when care is available.

The grouped display would work better for businesses with uniform hours (like "Mon-Fri: 9 AM - 5 PM, Closed weekends") but creates ambiguity for a school with optional extended programs.

## Action Items for Developer
1. Implement the immediate fix suggested above
2. Ensure hours information aligns with extended care pricing details
3. Fix the phone availability hours inconsistency
4. Consider adding the hours notes from the data files (like "Extended care available until 5:30 PM")