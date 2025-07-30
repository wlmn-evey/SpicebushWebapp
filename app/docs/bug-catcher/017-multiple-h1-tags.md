---
id: 017
title: "Multiple H1 Tags on Pages"
severity: medium
status: open
category: accessibility
affected_pages: ["/", "/programs", "/about", "various pages"]
related_bugs: [006, 011, 018]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 017: Multiple H1 Tags on Pages

## Description
Several pages contain multiple H1 tags, which violates HTML semantics and SEO best practices. This confuses the page hierarchy for screen readers and search engines, impacting both accessibility and search rankings.

## Steps to Reproduce
1. Visit any affected page
2. Inspect HTML or use SEO audit tool
3. Find multiple `<h1>` tags on single page
4. Screen readers announce multiple "main headings"

## Expected Behavior
- Only one H1 tag per page
- Clear heading hierarchy (H1 → H2 → H3)
- H1 describes main page content
- Logical document outline

## Actual Behavior
- 2-4 H1 tags on some pages
- Broken heading hierarchy
- Screen readers confused
- SEO penalties likely

## Heading Audit Results
```
Pages with Multiple H1s:
1. Homepage
   - H1: "Welcome to Spicebush Montessori"
   - H1: "Our Programs"
   - H1: "Why Choose Us"
   
2. Programs Page
   - H1: "Our Programs"
   - H1: "Toddler Program"
   - H1: "Primary Program"
   - H1: "Elementary Program"

3. About Page
   - H1: "About Spicebush"
   - H1: "Our Philosophy"
   - H1: "Meet Our Team"

Common Issues:
- Section titles using H1 instead of H2
- Components with hardcoded H1s
- No heading hierarchy strategy
```

## Affected Files
- Component templates using H1
- Page layouts with multiple sections
- `/src/components/HeroSection.astro`
- `/src/components/ProgramsOverview.astro`
- Various page files

## Potential Causes
1. **Component Reuse**
   - Components designed for standalone use
   - H1 hardcoded in components
   - No context awareness

2. **Developer Misunderstanding**
   - Confusion about heading hierarchy
   - Visual styling driving markup
   - Copy-paste without adjustment

## Suggested Fixes

### Option 1: Dynamic Heading Component
```astro
---
// HeadingComponent.astro
export interface Props {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  id?: string;
}

const { level = 2, className = '', id } = Astro.props;
const Tag = `h${level}` as any;
---

<Tag class={className} id={id}>
  <slot />
</Tag>
```

### Option 2: Fix Page Structures
```astro
---
// Homepage fix
---
<Layout title="Spicebush Montessori - Nurturing Young Minds">
  <main>
    <section class="hero">
      <h1>Welcome to Spicebush Montessori</h1>
      <!-- Only H1 on the page -->
    </section>
    
    <section class="programs">
      <h2>Our Programs</h2> <!-- Changed from H1 -->
      <div class="program-cards">
        <article>
          <h3>Toddler Program</h3>
          <!-- ... -->
        </article>
      </div>
    </section>
    
    <section class="why-choose">
      <h2>Why Choose Spicebush</h2> <!-- Changed from H1 -->
      <!-- ... -->
    </section>
  </main>
</Layout>
```

### Option 3: Heading Hierarchy Guidelines
```markdown
# Heading Hierarchy Guidelines

## Rules
1. One H1 per page - describes the main content
2. H2 for major sections
3. H3 for subsections
4. Never skip levels (H1 → H3 is wrong)
5. Use CSS for styling, not heading level

## Examples

### Homepage
- H1: "Welcome to Spicebush Montessori"
  - H2: "Our Programs"
    - H3: "Toddler Program"
    - H3: "Primary Program"
  - H2: "Why Choose Us"
    - H3: "Montessori Method"
    - H3: "Experienced Teachers"

### Program Page
- H1: "Montessori Programs at Spicebush"
  - H2: "Toddler Program (18 months - 3 years)"
    - H3: "Daily Schedule"
    - H3: "Learning Objectives"
  - H2: "Primary Program (3-6 years)"
    - H3: "Curriculum Overview"
    - H3: "Materials and Activities"
```

## Testing Requirements
1. Validate heading hierarchy on all pages
2. Test with screen readers
3. Check SEO audit tools
4. Verify document outline
5. Test after component updates

## Related Issues
- Bug #006: Overall accessibility issues
- Bug #018: Missing meta descriptions (SEO)

## Additional Notes
- Important for WCAG compliance
- Affects SEO significantly
- Screen reader users rely on heading structure
- Consider automated heading validation