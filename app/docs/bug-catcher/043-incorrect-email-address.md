---
id: 043
title: "Incorrect Email Address in SQL Script"
severity: low
status: open
category: content
affected_pages: ["insert-critical-data.sql"]
discovered_date: 2025-07-30
environment: [development]
---

# Bug 043: Incorrect Email Address in SQL Script

## Description
The insert-critical-data.sql script uses "info@spicebushmontessori.org" instead of the correct email "information@spicebushmontessori.org".

## Verification
Content verifier confirmed the live website only displays information@spicebushmontessori.org.

## Files Affected
- `/scripts/insert-critical-data.sql` (line with "email": "info@spicebushmontessori.org")

## Impact
Low - This is only in a migration script, not user-facing content.