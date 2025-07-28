# Journal Entry: Debugging HoursWidget After Content Collection Migration
Date: 2025-07-27

## Problem Description and Symptoms
The HoursWidget component was recently migrated from reading data from Supabase to using Astro's content collection system (reading from `src/content/hours/*.md` files). After the migration, the widget stopped working properly - it wasn't displaying the color-coded bars for before care, regular hours, and after care periods.

## Debugging Steps Taken
1. **Started dev server** - Confirmed the server was running properly on port 4321
2. **Verified HTML rendering** - The widget's HTML structure was being rendered correctly in the page
3. **Checked script inclusion** - No JavaScript errors were found in the console
4. **Analyzed data passing mechanism** - Discovered that Astro's `define:vars` directive was not working with module scripts
5. **Implemented solution** - Changed from `define:vars` to using data attributes for passing data
6. **Verified fix** - Confirmed data was being properly serialized and passed to the client

## Root Cause Identified
The issue was with Astro's `define:vars` directive, which doesn't properly work with module scripts (`<script type="module">`). The `hoursData` variable from the content collection was not being serialized and made available to the client-side JavaScript code. This is a known limitation in Astro when using module scripts with define:vars.

## Solution Implemented
1. **Removed define:vars** - Changed from `<script define:vars={{ hoursData }}>` to `<script type="module">`
2. **Added data attribute** - Added `data-hours={JSON.stringify(hoursData)}` to the widget's main div element
3. **Updated client code** - Modified the JavaScript to read and parse the data from the data attribute:
   ```javascript
   const widget = document.getElementById('sbms-hours-widget');
   let hoursData = [];
   try {
     const dataAttr = widget.getAttribute('data-hours');
     if (dataAttr) {
       hoursData = JSON.parse(dataAttr);
     }
   } catch (error) {
     console.error('Error parsing hours data:', error);
   }
   ```

## Lessons Learned
1. **Astro's define:vars limitations** - When using module scripts in Astro, define:vars doesn't work as expected. Data attributes are a more reliable way to pass server-side data to client-side scripts.
2. **Always verify data passing** - When migrating from one data source to another, ensure the data passing mechanism is compatible with the framework's constraints.
3. **Module scripts require different handling** - Module scripts in Astro have different scoping and data passing requirements compared to regular scripts.

## Follow-up Recommendations
1. **Document this pattern** - Consider adding a note in the project documentation about using data attributes instead of define:vars for module scripts
2. **Review other components** - Check if other components in the codebase are using define:vars with module scripts and might have similar issues
3. **Consider a utility function** - Create a utility function for safely passing data from server to client in Astro components

## Files Modified
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/HoursWidget.astro` - Updated data passing mechanism

## Debug Files Created (to be cleaned up)
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/issue-2025-07-27-hours-widget-not-working.md`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/test-hours-widget.html`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/check-console.html`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/debug/test-widget-final.html`