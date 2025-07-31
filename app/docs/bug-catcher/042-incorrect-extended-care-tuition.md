---
id: 042
title: "Incorrect Extended Care Tuition Rates"
severity: high
status: partially-resolved
category: content
affected_pages: ["tuition rate files", "coming soon page", "tuition calculator"]
discovered_date: 2025-07-30
environment: [development, production]
---

# Bug 042: Incorrect Extended Care Tuition Rates

## Description
The extended care tuition rates in the database are incorrect. The database shows $4,000/year ($333/month) for Tuition A, but the live website shows $3,800/year ($316.67/month).

## Verification
Content verifier confirmed against live site at https://spicebushmontessori.org/financial-accessibility/

## Incorrect Data (Current)
- Tuition A Extended Care: $4,000/year ($333/month)
- Tuition B Extended Care: Unknown (needs checking)
- Tuition C Extended Care: Unknown (needs checking)
- Tuition D Extended Care: Unknown (needs checking)

## Correct Data (From Live Site)
- Tuition A Extended Care: $3,800/year ($316.67/month)
- Tuition B Extended Care: $3,600/year ($300/month)
- Tuition C Extended Care: $3,400/year ($283.33/month)
- Tuition D Extended Care: $0/year (free)

## Impact
High - Parents are seeing incorrect pricing information that's $200/year higher than actual rates.

## Resolution Status (2025-07-30)
**Partially Resolved**: 
- ✅ All tuition content markdown files have been updated with correct rates
- ✅ Annual rates match live website exactly
- ❌ Coming-soon.astro still shows incorrect flat $333/month for all tiers
- ❌ Should show tier-specific monthly rates: A=$316.67, B=$300, C=$283.33, D=$0

## Files Updated
- `/app/src/content/tuition/tuition-a-full-day-5-days.md` - $3,800
- `/app/src/content/tuition/tuition-b-full-day-5-days.md` - $3,600
- `/app/src/content/tuition/tuition-c-full-day-5-days.md` - $3,400
- `/app/src/content/tuition/tuition-d-full-day-5-days.md` - $0

## Still Needs Update
- `/app/src/pages/coming-soon.astro` - Lines 923, 1102, 1109-1110