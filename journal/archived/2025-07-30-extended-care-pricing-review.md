# Extended Care Pricing Change Review - 2025-07-30
**Role**: Project Architect & Code Quality Guardian

## Change Summary
Reviewed the replacement of "$333/month" with "Additional cost varies by income" on the coming soon page for extended care pricing.

## Files Reviewed
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/coming-soon.astro`
- Related journal entries documenting the rationale

## Changes Analyzed

### Line 923 (Quick Info Card)
**Before**: "Until 5:30 PM • Additional $333/month"
**After**: "Until 5:30 PM • Additional cost varies by income"

### Line 1102 (Extended Care Program Card)
**Before**: "Additional: $333/month"
**After**: "Additional: Cost varies by income tier"

## Assessment

### ✅ Positive Aspects

1. **Content Accuracy**: The change fixes misleading pricing information. The hardcoded $333/month was inaccurate for most families under the FIT model.

2. **Consistency with School Values**: Aligns with the Family Income Tuition (FIT) model that makes all costs income-based.

3. **User Experience**: Reduces cognitive load and prevents potential sticker shock that could deter families from inquiring.

4. **Encourages Engagement**: Prompts families to contact the school for personalized information.

### ⚠️ Potential Issues Identified

1. **JavaScript Calculation Inconsistency**: 
   - Lines 1109-1110 still use hardcoded `+ 333` in the calculation for extended care totals
   - This creates a disconnect between the displayed text and calculated ranges
   - The "Total with Extended Care" section still shows fixed calculations

2. **Mixed Messages**: The page says "cost varies by income" but then shows calculated totals using fixed amounts.

### 🔧 Technical Issues

**Line 1109**: `const extendedMin = range.min + 333;`
**Line 1110**: `const extendedMax = range.max + 333;`

These hardcoded calculations contradict the messaging change and should be updated to reflect variable pricing or removed entirely.

## Recommendations

### Immediate Fix Needed
1. **Remove or Update Calculations**: Either remove the "Total with Extended Care" calculation section or update it to show ranges that reflect the actual variable pricing structure.

2. **Consider Adding Explanatory Text**: Add a small note like "Contact us to learn your family's extended care rate" to reinforce the personalized approach.

### Alternative Approaches
1. **Show Range**: Display the actual range ($0-$317/month) with explanation
2. **Remove Totals**: Focus on base program pricing and handle extended care separately in conversations
3. **Add CTA**: Include a specific call-to-action for extended care pricing information

## Impact Assessment

**Display Issues**: ❌ No significant display problems
**User Understanding**: ⚠️ Potential confusion due to mixed messaging
**Technical Debt**: ⚠️ Hardcoded calculations remain that contradict the text changes

## Next Steps Recommended
1. Update the JavaScript calculations to either remove fixed pricing or implement proper variable pricing logic
2. Test the page to ensure the messaging is consistent throughout
3. Consider adding supporting text to clarify the income-based approach

## Overall Assessment
The text changes improve accuracy and user experience, but the implementation is incomplete due to remaining hardcoded calculations. This creates a technical debt that should be addressed for full consistency.