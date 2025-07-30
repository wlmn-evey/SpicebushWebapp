---
id: 006
title: "Missing Alt Text on Images"
severity: high
status: open
category: accessibility
affected_pages: ["all pages with images"]
related_bugs: [011, 017]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 006: Missing Alt Text on Images

## Description
Multiple images throughout the site are missing alt text attributes, making them inaccessible to screen reader users and failing WCAG 2.1 Level A compliance. This affects users with visual impairments and impacts SEO.

## Steps to Reproduce
1. Run accessibility audit tool (axe DevTools, Lighthouse)
2. Navigate through site pages
3. Inspect images without alt attributes
4. Screen reader testing reveals missing image descriptions

## Expected Behavior
- All images should have descriptive alt text
- Decorative images should have empty alt="" attribute
- Alt text should convey image meaning/purpose
- Complex images should have longer descriptions

## Actual Behavior
- Many images have no alt attribute at all
- Some images have generic alt text like "image"
- Screen readers announce "image" with no context
- Accessibility audits fail

## Audit Results
```
Accessibility Violations Found:
- Images without alt text: 37 instances
- Images with non-descriptive alt text: 15 instances
- Background images conveying meaning: 8 instances

Affected Image Categories:
- Gallery images: 85% missing alt text
- Staff photos: 60% missing alt text
- Program images: 70% missing alt text
- Hero images: 40% missing alt text
```

## Affected Files
- `/src/components/OptimizedImage.astro` - Not enforcing alt text
- `/src/components/ImageGrid.astro` - Gallery without descriptions
- `/src/components/TeachersSection.astro` - Staff photos
- `/src/components/PhotoFeature.astro` - Feature images
- All content collection photo entries

## Potential Causes
1. **No Alt Text Requirements**
   - Components don't require alt prop
   - No validation during content creation
   - Missing from CMS fields

2. **Migration Issues**
   - Alt text lost during CMS migration
   - Images added without metadata
   - Bulk image imports without descriptions

3. **Developer Oversight**
   - Lack of accessibility awareness
   - No automated testing for alt text
   - Time constraints during development

## Suggested Fixes

### Option 1: Update Components to Require Alt Text
```astro
---
// OptimizedImage.astro
export interface Props {
  src: string;
  alt: string; // Make required, not optional
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

const { src, alt, width, height, loading = 'lazy' } = Astro.props;

// Validate alt text is meaningful
if (!alt || alt.toLowerCase() === 'image') {
  console.warn(`Image ${src} has missing or non-descriptive alt text`);
}
---

<img
  src={src}
  alt={alt}
  width={width}
  height={height}
  loading={loading}
/>
```

### Option 2: Add Alt Text to Content Collections
```yaml
# Update photo collection schema
schema:
  alt:
    type: string
    required: true
    minLength: 10
    description: "Descriptive text for screen readers"
  isDecorative:
    type: boolean
    default: false
    description: "True if image is purely decorative"
```

### Option 3: Bulk Alt Text Generation Script
```javascript
// scripts/add-missing-alt-text.js
import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

const altTextMap = {
  // Gallery images
  'collaborative-building.png': 'Children working together to build a tower with wooden blocks',
  'food-preparation.png': 'Student carefully preparing snack foods as part of practical life activities',
  'playground-action.png': 'Children playing actively on outdoor playground equipment',
  
  // Teacher photos
  'leah-walker.jpg': 'Leah Walker, Lead Teacher at Spicebush Montessori',
  'kirsti-forrest.jpg': 'Kirsti Forrest, Head Teacher with AMI certification',
  'kira-messinger.jpg': 'Kira Messinger, Assistant Teacher',
  
  // Program images
  'cylinder-blocks-sensorial.png': 'Child working with Montessori cylinder blocks for sensorial development',
  'moveable-alphabet-language.png': 'Moveable alphabet letters arranged on a mat for language learning',
};

async function addAltText() {
  const photoFiles = glob.sync('src/content/photos/*.md');
  
  for (const file of photoFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const filename = path.basename(file);
    const imageName = filename.replace('.md', '');
    
    if (altTextMap[imageName] && !content.includes('alt:')) {
      const updatedContent = content.replace(
        '---\n',
        `---\nalt: "${altTextMap[imageName]}"\n`
      );
      await fs.writeFile(file, updatedContent);
      console.log(`Added alt text to ${filename}`);
    }
  }
}
```

### Option 4: Implement Alt Text Guidelines
```markdown
# Alt Text Guidelines for Spicebush Montessori

## Writing Good Alt Text
1. **Be Descriptive**: Describe what's in the image
   - Bad: "Image of children"
   - Good: "Three children collaborating on a math activity with golden beads"

2. **Context Matters**: Consider the image's purpose
   - Staff photo: "Jane Doe, Primary Guide"
   - Activity photo: "Child practicing pouring water from pitcher to glass"

3. **Keep it Concise**: Aim for 125 characters or less
   - Screen readers can handle longer, but concise is better

4. **Don't Say "Image of"**: Screen readers already announce it's an image

5. **Decorative Images**: Use empty alt="" for purely decorative images

## Examples by Category
- **Classroom**: "Prepared Montessori environment with math materials on shelves"
- **Children Working**: "Child concentrating while working with color tablets"
- **Outdoor**: "Children exploring nature during outdoor education time"
- **Events**: "Families gathered for spring festival celebration"
```

## Testing Requirements
1. Run axe DevTools on all pages
2. Test with screen readers (NVDA, JAWS, VoiceOver)
3. Verify all images have appropriate alt text
4. Check that decorative images have alt=""
5. Validate alt text is descriptive and contextual
6. Ensure no "image of" or "picture of" prefixes
7. Test keyboard navigation through image galleries

## Related Issues
- Bug #011: Form accessibility issues
- Bug #017: Multiple H1 tags (overall accessibility)

## Additional Notes
- Alt text is legally required for ADA compliance
- Improves SEO as search engines read alt text
- Consider adding long descriptions for complex images
- Train content editors on alt text best practices
- Add automated alt text checking to CI/CD pipeline