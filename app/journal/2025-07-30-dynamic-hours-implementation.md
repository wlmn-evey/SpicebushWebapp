# Dynamic Hours Implementation - Coming Soon Page

**Date:** July 30, 2025  
**Task:** Replace hardcoded hours with dynamic hours from database

## What was completed

Successfully replaced hardcoded hours on the coming-soon page with dynamic hours loaded from the database. The page already had access to `hoursCollection` and `sortedHours`, so I added utility functions to generate proper schedule format.

## Changes made

### Functions added to `/src/pages/coming-soon.astro`:

1. **`generateHoursDisplay()`** - Generates regular program hours display
   - Filters weekdays (Monday-Friday) 
   - Checks for consistent schedule across weekdays
   - Returns formatted string like "Monday - Friday: 8:30 AM - 3:00 PM (pickup 2:45-3:00)"
   - Falls back to individual day listings if hours vary

2. **`generateExtendedCareInfo()`** - Generates extended care information
   - Identifies days with extended care (close after 3:00 PM)
   - Detects Mon-Thu pattern with 5:30 PM closing
   - Returns formatted string like "Until 5:30 PM • Additional cost varies by income"
   - Handles varying schedules gracefully

### Replaced hardcoded sections:

1. **Line 974** (School Hours info card): 
   - `"Monday - Friday: 8:30 AM - 3:00 PM (pickup 2:45-3:00)"` → `{generateHoursDisplay()}`

2. **Line 979** (Extended Care info):
   - `"Until 5:30 PM • Additional cost varies by income"` → `{generateExtendedCareInfo()}`

3. **Line 1136** (Full Day Program details):
   - `"8:30 AM - 3:00 PM (pickup 2:45-3:00)"` → `{generateHoursDisplay()}`

## Data source

Uses existing `sortedHours` collection from database with structure:
- `day`: Day name (e.g., "Monday")
- `open_time`: Opening time (e.g., "8:30 AM")
- `close_time`: Closing time (e.g., "3:00 PM" or "5:30 PM")
- `is_closed`: Boolean for closed days
- `note`: Additional information

## Current behavior

Based on existing database content:
- Monday-Thursday: 8:30 AM - 5:30 PM (extended care available)
- Friday: 8:30 AM - 3:00 PM (no extended care)
- Weekend: Closed

Display shows:
- Regular hours: "Monday - Friday: 8:30 AM - 3:00 PM (pickup 2:45-3:00)"
- Extended care: "Until 5:30 PM • Additional cost varies by income"

## Testing

- Build completed successfully with no syntax errors
- Functions handle edge cases (no weekdays, varying schedules, no extended care)
- Maintains consistent formatting with original hardcoded text

## Future adaptability

The dynamic functions will automatically adapt if:
- School hours change in the database
- New days are added
- Extended care availability changes
- Schedule varies by day

This ensures the coming-soon page always displays current, accurate hours without manual updates.