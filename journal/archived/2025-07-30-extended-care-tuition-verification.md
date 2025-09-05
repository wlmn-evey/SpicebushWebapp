# Extended Care Tuition Verification Report
**Date**: 2025-07-30
**Verifier**: Content Verification Specialist

## Executive Summary
The complexity guardian has updated the extended care tuition rates. This report verifies these rates against the live website and identifies all files requiring updates.

## Live Website Verification
**Source**: https://spicebushmontessori.org/financial-accessibility/

### Confirmed Extended Care Rates (Per Year):
- **Tuition A**: $3,800/year
- **Tuition B**: $3,600/year
- **Tuition C**: $3,400/year
- **Tuition D**: $0/year (free)

### Monthly Calculations:
- **Tuition A**: $3,800 ÷ 12 = $316.67/month
- **Tuition B**: $3,600 ÷ 12 = $300.00/month
- **Tuition C**: $3,400 ÷ 12 = $283.33/month
- **Tuition D**: $0 ÷ 12 = $0/month

## Files Successfully Updated
✅ `/app/src/content/tuition/tuition-a-full-day-5-days.md` - Correctly shows $3,800
✅ `/app/src/content/tuition/tuition-b-full-day-5-days.md` - Correctly shows $3,600
✅ `/app/src/content/tuition/tuition-c-full-day-5-days.md` - Correctly shows $3,400
✅ `/app/src/content/tuition/tuition-d-full-day-5-days.md` - Correctly shows $0

## Files Still Requiring Updates
❌ `/app/src/pages/coming-soon.astro`:
   - Line 923: Shows "$333/month" - should be variable based on tuition tier
   - Line 1102: Shows "$333/month" - should be variable based on tuition tier
   - Lines 1109-1110: Adds flat $333 to all calculations - should use tier-specific amounts

## Issues Identified

### 1. Incorrect Flat Rate Application
The coming-soon page incorrectly applies a flat $333/month extended care fee to all tuition tiers. This contradicts the live website's tiered structure:
- It should show $316.67/month for Tuition A
- It should show $300/month for Tuition B
- It should show $283.33/month for Tuition C
- It should show $0/month for Tuition D

### 2. Missing Context
The coming-soon page doesn't explain that extended care pricing varies by tuition tier, potentially misleading families about actual costs.

## Recommendations

1. **Immediate Action**: Update coming-soon.astro to:
   - Remove hardcoded $333/month references
   - Implement dynamic pricing based on tuition tiers
   - Add clarifying text that extended care varies by tuition level

2. **Content Accuracy**: Add a note explaining:
   "Extended care pricing varies by tuition tier. Contact us for specific rates based on your family's tuition level."

3. **Database Verification**: Ensure any database entries or calculations also reflect the correct tiered extended care pricing.

## Verification Status
- **Annual Rates**: ✅ All verified and correct
- **Monthly Calculations**: ⚠️ Need updates in coming-soon page
- **Content Files**: ✅ All tuition markdown files are correct
- **User-Facing Pages**: ❌ Coming-soon page needs corrections

## Next Steps
1. Update coming-soon.astro to use dynamic extended care pricing
2. Review any other pages or components that might reference extended care pricing
3. Ensure all monthly calculations use the correct divisor (12 months)
4. Add clarifying language about tiered extended care pricing where appropriate