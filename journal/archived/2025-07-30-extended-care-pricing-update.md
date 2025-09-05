# Extended Care Pricing Update - 2025-07-30

## Overview
Updated hardcoded extended care pricing on the coming soon page to reflect the income-based tuition model.

## Changes Made
Updated `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/coming-soon.astro`:

1. **Line 923**: Changed "Until 5:30 PM • Additional $333/month" → "Until 5:30 PM • Additional cost varies by income"
2. **Line 1102**: Changed "Additional: $333/month" → "Additional: Cost varies by income tier"

## Rationale
- Aligns with the school's Family Income Tuition (FIT) model
- Prevents misleading fixed pricing information
- Ensures consistent messaging about income-based pricing throughout the site

## Context
This update ensures that families understand the extended care pricing follows the same income-based approach as the regular tuition, rather than being a fixed add-on cost.

## Related Files
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/coming-soon.astro` (updated)
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/coming-soon-comprehensive.astro` (no changes needed)