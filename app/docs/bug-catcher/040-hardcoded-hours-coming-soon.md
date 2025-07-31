---
id: 040
title: "Hardcoded Hours on Coming Soon Page"
severity: medium
status: open
category: content
affected_pages: ["coming-soon.astro"]
discovered_date: 2025-07-30
environment: [development, production]
---

# Bug 040: Hardcoded Hours on Coming Soon Page

## Description
The coming soon page has hardcoded school hours instead of using the database values from the hours collection. This means any updates to hours in the admin panel won't be reflected on this page.

## Current Implementation
```astro
<!-- Lines 896-899 in coming-soon.astro -->
<p><strong>Monday - Thursday</strong><br>8:30 AM - 5:30 PM</p>
<p><strong>Friday</strong><br>8:30 AM - 3:00 PM</p>
```

## Expected Behavior
Hours should be dynamically pulled from the hours collection, similar to how the HoursWidget component works.

## Fix Required
Replace hardcoded hours with dynamic data from the hours collection that's already being fetched on line 9.