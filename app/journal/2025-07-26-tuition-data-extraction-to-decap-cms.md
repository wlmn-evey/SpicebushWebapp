# Tuition Data Extraction to Decap CMS - July 26, 2025

## Overview
Successfully extracted tuition and program data from the Supabase migration file `20250628190142_scarlet_summit.sql` and converted it to Decap CMS content collections in MDX format.

## Data Sources Analyzed
1. **Migration File:** `/supabase/migrations/20250628190142_scarlet_summit.sql`
2. **Hours Data:** `/src/lib/hours-utils.ts` (getDefaultHoursData function)
3. **Content Schema:** `/src/content/config.ts` (tuitionProgramsCollection, tuitionRatesCollection, schoolHoursCollection)

## Content Collections Created

### 1. Tuition Programs (`/src/content/tuition/programs/`)
Created 4 program files:
- `full-day-5-days.mdx` - Monday-Friday, 8:30 AM - 3:00 PM (6.5 hours)
- `full-day-3-days-twr.mdx` - Tuesday-Thursday, 8:30 AM - 3:00 PM (6.5 hours)
- `half-day-5-days.mdx` - Monday-Friday, 8:30 AM - 12:00 PM (3.5 hours)
- `half-day-3-days-twr.mdx` - Tuesday-Thursday, 8:30 AM - 12:00 PM (3.5 hours)

### 2. Tuition Rates (`/src/content/tuition/rates/`)
Created 10 rate files:

#### Half-Day Programs (Fixed Rates)
- `half-day-5-days.mdx` - $12,000 annually
- `half-day-3-days-twr.mdx` - $10,000 annually

#### Full-Day Programs (Income-Based Rates)
**Tuition A (Highest Income Tier):**
- `tuition-a-full-day-5-days.mdx` - $18,035 + $4,000 extended care
- `tuition-a-full-day-3-days-twr.mdx` - $10,822 + $4,000 extended care

**Tuition B (Upper-Middle Income):**
- `tuition-b-full-day-5-days.mdx` - $14,348.75 + $3,800 extended care
- `tuition-b-full-day-3-days-twr.mdx` - $8,609.50 + $3,800 extended care

**Tuition C (Lower-Middle Income):**
- `tuition-c-full-day-5-days.mdx` - $11,304 + $3,400 extended care
- `tuition-c-full-day-3-days-twr.mdx` - $6,783 + $3,400 extended care

**Tuition D (Lowest Income - Maximum Assistance):**
- `tuition-d-full-day-5-days.mdx` - $5,397 + FREE extended care
- `tuition-d-full-day-3-days-twr.mdx` - $3,244 + FREE extended care

### 3. School Hours (`/src/content/hours/`)
Created 7 daily schedule files:
- `monday.mdx` through `friday.mdx` - 8:30 AM - 3:00 PM with extended care (except Friday)
- `saturday.mdx` and `sunday.mdx` - Closed for family time

## Key Data Points Extracted

### Income Thresholds (Family Size-Based)
All income-based rates use the same thresholds:
- 2-person: $34,480 - $84,976+
- 3-person: $43,440 - $110,240+
- 4-person: $52,400 - $128,750+
- 5-person: $61,350 - $150,380+
- 6-person: $70,320 - $172,525+
- 7-person: $79,280 - $195,597+
- 8+ person: $88,240 - $216,300+

### Extended Care Structure
- **Monday-Thursday:** Available until 5:30 PM (additional fees apply)
- **Friday:** NO extended care - pickup by 3:00 PM sharp
- **Tuition D families:** Extended care included at no charge
- **Before care:** Available from 7:30 AM all weekdays

### Program Philosophy Integration
Each MDX file includes:
- Educational philosophy alignment
- Target family demographics
- Practical scheduling information
- Financial accessibility messaging

## Technical Implementation Notes

### Schema Compliance
All MDX files comply with existing Astro content collection schemas:
- `tuitionProgramsCollection` fields properly mapped
- `tuitionRatesCollection` fields including income thresholds
- `schoolHoursCollection` fields with proper formatting

### File Naming Convention
Used kebab-case naming for consistency:
- Programs: `{program-type}-{days}-{schedule}.mdx`
- Rates: `{rate-tier}-{program-type}-{days}-{schedule}.mdx`
- Hours: `{day-name}.mdx`

### Content Structure
Each file includes:
- YAML frontmatter with all required schema fields
- Markdown content with educational context
- Clear rate information and qualifications
- Family-friendly explanations

## Data Migration Benefits

### 1. CMS Accessibility
- Non-technical staff can now edit tuition rates through Decap CMS
- Version control maintains history of rate changes
- No database access required for content updates

### 2. Content Flexibility
- Rich markdown content provides context beyond raw data
- Ability to add explanatory text, images, and formatting
- SEO-friendly content structure

### 3. Maintenance Efficiency
- Single source of truth for tuition information
- Automated content compilation through Astro
- Reduced risk of data inconsistency

## Next Steps for Implementation

1. **Content Review:** Have school administration review all rates and descriptions
2. **CMS Configuration:** Update Decap CMS config to include new collection editing
3. **Frontend Integration:** Update tuition calculator and display components to read from content collections
4. **Migration Verification:** Ensure data accuracy matches original Supabase data
5. **Staff Training:** Train administrative staff on content editing through Decap CMS

This migration represents a significant step toward making the school's tuition information more maintainable and accessible while preserving the complex income-based rate structure.