# Component Migration Notes - July 26, 2025

## Critical Requirement
**The UX and visual appearance must remain EXACTLY the same**. Only the data source changes from Supabase to JSON files.

## HoursWidget Migration ✅
- Successfully migrated to use JSON data
- Preserved all animations and visual features
- Maintained time indicator, staggered animations, debug mode
- Friday "Closes at 3:00 PM" message retained

## TuitionCalculator Migration (In Progress)
The TuitionCalculator is complex with multiple features that must be preserved:

### Key Features to Maintain:
1. **Three-part form**: Family size, annual income, children attending
2. **Income-based tier calculation** using thresholds by family size
3. **Pre-rendered program cards** that show/hide based on calculation
4. **Tuition D special notice** for families qualifying for assistance
5. **Payment options display** (full year discount, extended care)
6. **Reference table** with family size highlighting
7. **All visual styling and animations**

### Data Structure Needed:
The calculator uses complex rate calculations based on:
- Program type (Full Day, Three Day, etc.)
- Family size (2-8+ people)
- Income thresholds per family size
- Different tuition tiers (A, B, C, D)

### Migration Strategy:
1. Convert rate calculation logic to use tuition-rates.json
2. Pre-calculate thresholds for each family size
3. Maintain exact UI components and styling
4. Keep all error handling and validation

## Other Components to Migrate:
1. **DonationForm** - Already has Stripe integration
2. **Contact Forms** - Convert to Netlify Forms
3. **TeachersSection** - Use MDX teacher profiles
4. **Blog System** - Already using MDX

## Important Notes:
- Client is happy with current design
- No visual changes allowed
- Only backend data sources change
- Must maintain all current functionality