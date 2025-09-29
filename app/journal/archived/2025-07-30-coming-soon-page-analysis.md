# Coming Soon Page Analysis
Date: 2025-07-30

## Current Implementation

The coming-soon page at `/src/pages/coming-soon.astro` is already loading data from the database using:
- `getSchoolInfo()` - for school information
- `getCollection('hours')` - for hours data
- `getEntries('tuition', ...)` - for tuition programs and rates
- `getEntries('testimonials', ...)` - for featured testimonials

## Identified Hardcoded Content

### Line 942: Enrollment Notice
```astro
<div class="enrollment-notice" role="alert">🌟 Now Enrolling for Fall 2025 - Limited Spots Available!</div>
```
**Issue**: Hardcoded enrollment message instead of using database settings

### Line 947: Update Notice
```astro
<p>🔧 We're updating our website to enhance your experience. Thank you for your patience!</p>
```
**Issue**: Hardcoded update message instead of using database settings

### Lines 1244-1326: Contact Form Configuration
The entire contact form (lines 1244-1326) contains hardcoded:
- Form name: "coming-soon-contact"
- Form fields and their options
- Success message text
- No validation against database settings

## Other Hardcoded Content Found

1. **Page Title and Meta** (lines 101-102):
   - Title: "Spicebush Montessori School - Enrolling Now for Fall 2025"
   - Description: Hardcoded meta description

2. **Tagline** (line 941):
   - "Nurturing Young Minds in Glen Mills, PA"

3. **Section Headers**:
   - Line 1010: "Welcome to Spicebush Montessori"
   - Line 1011: "Where every child's potential blooms naturally"
   - Line 1051: "What Parents Are Saying"
   - Line 1104: "Our Programs"

4. **Fallback Values**:
   - Line 960: Fallback ages served '3-6 years old'
   - Lines 1071-1094: Hardcoded testimonials as fallback
   - Lines 1124, 1146: Hardcoded tuition prices as fallback

5. **Footer Content** (lines 1346-1349):
   - Non-discrimination policy text

## Required Changes

### 1. Add Database Settings Loading
Need to load settings from the database:
```javascript
const settings = await getCollection('settings');
const enrollmentNotice = settings.find(s => s.id === 'enrollment-notice');
const updateNotice = settings.find(s => s.id === 'update-notice');
const pageContent = settings.find(s => s.id === 'coming-soon-page');
```

### 2. Replace Hardcoded Content
- Replace enrollment notice with `enrollmentNotice?.data.content`
- Replace update notice with `updateNotice?.data.content`
- Use page content settings for titles, headers, and meta descriptions

### 3. Form Configuration
- Load form settings from database
- Make form fields dynamic based on settings
- Use database-stored success messages

### 4. Implement Proper Fallbacks
- Keep existing hardcoded content as fallbacks
- Use nullish coalescing operator (??) for graceful degradation

## Priority Order
1. Fix enrollment and update notices (lines 942, 947)
2. Make contact form dynamic (lines 1244-1326)
3. Update page metadata and titles
4. Replace other hardcoded content with database values

## Notes
- The page already has good patterns for loading data
- Need to extend the existing data loading to include settings
- Should maintain backwards compatibility with fallbacks