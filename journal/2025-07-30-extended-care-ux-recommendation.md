# Extended Care Pricing Display - UX Recommendation
**Date**: 2025-07-30
**Role**: Spicebush UX Advocate

## The Question
The coming soon page currently shows a flat $333/month for extended care, but the actual rates vary by income tier:
- Tuition A: $316.67/month
- Tuition B: $300/month  
- Tuition C: $283.33/month
- Tuition D: Free

Should we show tier-specific rates, a range, or keep it simple?

## UX Recommendation: "Additional cost varies by income"

### Rationale

1. **Consistency with FIT Model Philosophy**
   - Reinforces that ALL costs at Spicebush are income-based
   - Maintains message consistency across the site
   - Strengthens the equity-focused brand

2. **Reduces Cognitive Load**
   - Parents are already processing program options, hours, and base tuition
   - Complex pricing tiers add unnecessary confusion at the exploration stage
   - Simple message: "It's available and affordable for you"

3. **Prevents Sticker Shock**
   - Showing $317 might deter lower-income families
   - Showing $0 might seem too good to be true
   - "Varies by income" sets appropriate expectations

4. **Encourages Personal Connection**
   - Prompts families to contact the school
   - Creates opportunity for staff to explain the model
   - Builds relationships before enrollment

5. **Focuses on Value, Not Price**
   - Emphasizes the service (extended hours for working families)
   - Avoids making cost the primary consideration
   - Aligns with Montessori values of meeting family needs

## Implementation Recommendations

### Primary Changes:
- Line 923: "Until 5:30 PM • Additional cost varies by income"
- Line 1102: "Additional: Cost varies by income tier"
- Remove all hardcoded $333 references

### Supporting Text Options:
- "Like all our programs, extended care pricing is based on your family's income"
- "Many families qualify for reduced or free extended care"
- "Extended care ensures all working families can access our full program"

### What NOT to Do:
- Don't show all four tier prices (too complex)
- Don't show just the range (still focuses on numbers)
- Don't use the highest price as a flat rate (inaccurate and potentially exclusionary)

## User Journey Consideration
1. Parent sees extended care is available
2. Understands it's income-based like everything else
3. Feels welcomed regardless of financial situation
4. Contacts school to learn their specific rate
5. Discovers it's affordable for their family
6. Feels the school truly understands their needs

## Conclusion
The best UX choice is to mirror how you handle base tuition - acknowledge it varies by income without getting into specifics. This maintains simplicity while reinforcing your core values of accessibility and inclusion.