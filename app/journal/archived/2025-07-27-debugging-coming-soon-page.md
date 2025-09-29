# Debug Session: Coming Soon Page Issues
Date: 2025-07-27

## Problem Description and Symptoms
The comprehensive coming soon page at `/src/pages/coming-soon-comprehensive.astro` had multiple issues:
- Logo wasn't showing up
- Buttons weren't working
- Information wasn't displaying properly (school hours, contact info, programs)
- Other functionality issues

## Debugging Steps Taken

### 1. Initial File Structure Examination
- Discovered logo file path was incorrect: `/images/spicebush-logo-optimized.webp` didn't exist
- Found actual logo files at `/images/optimized/homepage/homepage-spicebush-logo-brand-identity-800x800.webp`

### 2. Content Collection Investigation
- Found school-info entry was referenced as 'main' but actual file was 'general'
- Discovered JSX syntax was being used correctly in Astro (not an issue)

### 3. Program-Rate Matching Analysis
- Initially thought the issue was matching program names vs IDs
- Changed filter from `r.data.program_id === program.data.name` to `r.data.program_id === program.id`
- Discovered some program files have "-program" suffix in filenames while others don't
- This causes ID mismatches since content collection IDs are based on filenames

### 4. Prerender Configuration
- Page had `export const prerender = false` without an adapter configured
- Changed to `export const prerender = true` to fix build issues

## Root Causes Identified
1. **Incorrect logo path**: Referenced non-existent file
2. **Wrong content collection reference**: 'main' vs 'general'
3. **Program ID inconsistency**: Some files have "-program" suffix, others don't
4. **Prerender misconfiguration**: SSR enabled without adapter

## Solutions Implemented
1. ✅ Fixed logo path to use correct optimized image
2. ✅ Fixed school-info reference from 'main' to 'general'
3. ✅ Changed program ID matching logic to use `program.id`
4. ✅ Fixed prerender setting to true

## Results
- Logo now displays correctly
- School information loads properly
- School hours show correctly
- Contact information displays
- Programs render (though tuition ranges still show $0 due to ID mismatch)
- Contact form renders correctly
- Page loads without errors

## Lessons Learned
1. **Always verify asset paths**: Check that referenced images actually exist
2. **Content collection IDs**: Remember that IDs are based on filenames, not frontmatter
3. **Consistent naming**: Program files should have consistent naming convention
4. **Prerender configuration**: Match SSR settings with project configuration

## Follow-up Recommendations
1. **Standardize program file naming**: Either all files should have "-program" suffix or none should
2. **Update rate files**: Ensure program_id references match actual program file IDs
3. **Add validation**: Consider adding build-time validation for program-rate relationships
4. **Documentation**: Document the content collection structure and naming conventions

## Technical Details
- **Files Modified**: `/src/pages/coming-soon-comprehensive.astro`
- **Content Collections Used**: school-info, hours, tuition
- **Key Fix**: Changed logo path and content collection references
- **Remaining Issue**: Program-rate ID matching needs consistent file naming