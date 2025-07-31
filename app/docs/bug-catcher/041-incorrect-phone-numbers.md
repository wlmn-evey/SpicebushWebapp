---
id: 041
title: "Incorrect Phone Numbers in Multiple Files"
severity: high
status: resolved
category: content
affected_pages: ["Header.astro", "500.astro", "insert-critical-data.sql", "insert-critical-data.js", "migrate-content-to-supabase.js"]
discovered_date: 2025-07-30
environment: [development, production]
---

# Bug 041: Incorrect Phone Numbers in Multiple Files

## Description
Multiple files contain an incorrect phone number (484) 356-6728 instead of the correct number (484) 202-0712. The database has the correct number, but several hardcoded instances use the wrong one.

## Verification
The live Spicebush website confirms the correct phone number is (484) 202-0712.

## Files with Incorrect Phone Number
- `/src/components/Header.astro` (line ~phone: '(484) 356-6728')
- `/src/pages/500.astro` (tel:4843566728)
- `/scripts/insert-critical-data.sql` (phone": "(484) 356-6728")
- `/scripts/insert-critical-data.js` (phone: '(484) 356-6728')
- `/scripts/migrate-content-to-supabase.js` (phone: '(484) 356-6728')

## Files with Correct Phone Number
- `/src/content/school-info/general.md` ✓
- `/src/pages/contact.astro` ✓
- `/src/pages/admissions.astro` ✓
- Coming soon page (uses database) ✓

## Impact
Critical - customers calling the wrong number cannot reach the school.

## Resolution
2025-07-30: Updated all hardcoded phone numbers to the correct value (484) 202-0712. The Header.astro component already pulls from the database but now has the correct fallback value. This ensures customers always see the correct phone number even if the database is unavailable.