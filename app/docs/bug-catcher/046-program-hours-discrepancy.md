---
id: 046
title: "Program Hours Dismissal Time Discrepancy"
severity: low
status: open
category: content
affected_pages: ["coming-soon.astro", "insert-critical-data.sql"]
discovered_date: 2025-07-30
environment: [development]
---

# Bug 046: Program Hours Dismissal Time Discrepancy

## Description
The program hours show dismissal at 3:00 PM, but the live website indicates dismissal is actually 2:45 PM - 3:00 PM (a 15-minute window).

## Verification
Content verifier found the live website states:
- Core program starts at 8:30 AM (verified)
- Dismissal window is 2:45 PM - 3:00 PM (not a fixed 3:00 PM)

## Files Affected
- `/app/src/pages/coming-soon.astro` (lines showing "8:30 AM - 3:00 PM")
- `/app/scripts/insert-critical-data.sql` (line 57: "8:30 AM - 3:00 PM")

## Impact
Low - This is a minor accuracy issue. Parents need to know about the 15-minute pickup window.

## Recommendation
Update program hours to show "8:30 AM - 2:45-3:00 PM" or "8:30 AM - 3:00 PM (pickup 2:45-3:00)" to accurately reflect the dismissal window.