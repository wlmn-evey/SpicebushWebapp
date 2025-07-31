---
id: 045
title: "Unverifiable Staff Information"
severity: medium
status: open
category: content
affected_pages: ["staff/*.md"]
discovered_date: 2025-07-30
environment: [development]
---

# Bug 045: Unverifiable Staff Information

## Description
The staff markdown files contain extensive information that cannot be verified against the live website:
- Individual teacher email addresses (kirsti@, leah@, kira@spicebushmontessori.org)
- Last names for Kirsti "Forrest" and Kira "Messinger"
- Specific credentials and certifications
- Employment start dates
- Detailed biographical information

## Verification
Content verifier found the live website has no staff directory or teacher pages. Staff are only mentioned in a parent testimonial as "Kirsti, Leah, and Kira" (confirming first names and Leah Walker's full name).

## Files Affected
- `/app/src/content/staff/kirsti-forrest.md`
- `/app/src/content/staff/leah-walker.md`
- `/app/src/content/staff/kira-messinger.md`

## Impact
Medium - Displaying unverifiable information about staff members could:
- Create privacy concerns if email addresses aren't meant to be public
- Spread incorrect information about credentials or names
- Conflict with the minimal approach of the live website

## Recommendation
1. Remove individual email addresses unless confirmed they should be public
2. Verify last names through authoritative sources
3. Remove or verify all credential information
4. Consider if a staff directory should exist at all, given the live site doesn't have one