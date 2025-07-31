---
id: 044
title: "Unverifiable EIN and Licensing Information"
severity: medium
status: open
category: content
affected_pages: ["general.md"]
discovered_date: 2025-07-30
environment: [development]
---

# Bug 044: Unverifiable EIN and Licensing Information

## Description
The general.md file contains EIN and licensing/accreditation information that cannot be verified against the live website:
- EIN: "88-0565930"
- Accreditation: ["AMI Certified Teachers", "PA Licensed Child Care Center"]

## Verification
Content verifier checked the entire live website and found:
- No EIN displayed anywhere on public pages
- No licensing information mentioned
- No AMI certification claims

## Files Affected
- `/app/src/content/school-info/general.md` (lines 16-17)

## Impact
Medium - Including unverifiable legal/compliance information could lead to:
- Inaccuracy in public-facing content
- Potential legal issues if incorrect
- Confusion if this data is used in the webapp

## Recommendation
Remove the unverifiable information until it can be confirmed through:
1. Direct confirmation from school administration
2. Official state licensing databases
3. IRS nonprofit records