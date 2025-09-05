# Review: Removal of EIN and Accreditation Fields

## Date: 2025-07-30

## Summary
Reviewed the removal of `ein` and `accreditation` fields from `/app/src/content/school-info/general.md` to identify potential issues and broken dependencies.

## Fields Removed
- `ein: "88-0565930"`
- `accreditation: ["AMI Certified Teachers", "PA Licensed Child Care Center"]`

## Analysis

### Schema Definition
The `schoolInfoCollection` schema in `/app/src/content/config.ts` (lines 156-157) defines both fields as optional:
- `ein: z.string().optional()`
- `accreditation: z.array(z.string()).optional()`

This means removing these fields will NOT cause any schema validation errors.

### EIN Field Dependencies
Found 3 files that reference the `ein` field, all with fallback handling:

1. `/app/src/pages/donate.astro` (line 108):
   ```astro
   EIN: {schoolInfo?.data.ein || '88-0565930'}
   ```

2. `/app/src/pages/coming-soon.astro` (line 1289):
   ```astro
   <p>A 501(c)(3) Non-Profit Organization | EIN: {schoolInfo?.data.ein || '88-0565930'}</p>
   ```

3. `/app/src/pages/coming-soon-comprehensive.astro` (line 737):
   ```astro
   <p>A 501(c)(3) Non-Profit Organization | EIN: {schoolInfo?.data.ein || '88-0565930'}</p>
   ```

**Important**: All three files already have fallback values (`|| '88-0565930'`) in place, so they will continue to display the EIN even with the field removed from general.md.

### Accreditation Field Dependencies
No active code references to the `accreditation` field were found in the codebase. The only references were in:
- Journal entries documenting the verification process
- SQL migration scripts (historical data)
- Bug documentation
- One footer link template suggesting a potential future accreditation page

## Potential Issues

### 1. Inconsistent EIN Display
**Issue**: The EIN will still be displayed on donate and coming-soon pages due to hardcoded fallback values, despite being removed from the central configuration.

**Impact**: Low-Medium. This creates a maintenance issue where the EIN is hardcoded in multiple places rather than centrally managed.

**Recommendation**: Either:
- Remove the fallback values from all three files to fully remove the EIN
- Keep the EIN in general.md if it's verified to be correct
- Move the EIN to a different configuration location if it needs to be displayed but shouldn't be in general school info

### 2. No Breaking Dependencies
**Finding**: No code will break due to these removals since:
- Both fields are optional in the schema
- The only field with dependencies (EIN) has fallback values
- The accreditation field has no active references

## Conclusion
The removal of these fields will not cause any breaking changes or errors. However, it creates an inconsistency where the EIN is still displayed through hardcoded fallback values. This should be addressed for better maintainability and consistency.

## Recommendations
1. Decide whether the EIN should be displayed at all
2. If yes, verify the EIN and restore it to general.md for central management
3. If no, remove the hardcoded fallback values from the three Astro files
4. Consider adding a comment in general.md explaining why these fields were removed