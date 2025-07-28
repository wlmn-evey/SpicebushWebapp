# Codebase Refinement Report

*Generated: 2025-07-15T22:57:33.171Z*

## Summary

- **Unused Files**: 28
- **Complex Components**: 21
- **Duplicate Code**: 0
- **Optimization Opportunities**: 59

## Unused Files

- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/AdminImageOverlay.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/AdminNav.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/AuthForm.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/AuthNav.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/CallToAction.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/Footer.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/Header.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/HeroSection.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/HoursWidget.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/ImageGrid.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/InclusionCommitment.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/NonDiscriminationPolicy.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/PhotoFeature.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/ProgramsOverview.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/TeachersSection.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/Testimonials.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/TuitionCalculator.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/ValuePropositions.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/admin/ImageManagementSettings.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/admin/ProgramsManagement.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/admin/TuitionQuickActions.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/admin/TuitionRatesTable.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/components/admin/TuitionSettings.astro`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/hours-utils.ts`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/tuition-forms.ts`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/test/lib/development-helpers.test.ts`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/test/lib/supabase.test.ts`
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/test/setup.ts`

## Complex Components


### `components/AdminImageOverlay.astro`
- **Complexity**: 37
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `components/AuthForm.astro`
- **Complexity**: 29
- **Suggestions**:
  - Consider breaking this large file into smaller components
  - Consider breaking down large prop interfaces into smaller, focused interfaces


### `components/HoursWidget.astro`
- **Complexity**: 18
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `components/ImageGrid.astro`
- **Complexity**: 6
- **Suggestions**:
  - Consider breaking down large prop interfaces into smaller, focused interfaces


### `components/PhotoFeature.astro`
- **Complexity**: 7
- **Suggestions**:
  - Consider breaking down large prop interfaces into smaller, focused interfaces


### `components/TuitionCalculator.astro`
- **Complexity**: 37
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `layouts/Layout.astro`
- **Complexity**: 4
- **Suggestions**:
  - Consider breaking down large prop interfaces into smaller, focused interfaces


### `lib/hours-utils.ts`
- **Complexity**: 31
- **Suggestions**:



### `lib/tuition-forms.ts`
- **Complexity**: 36
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/analytics.astro`
- **Complexity**: 3
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/communications.astro`
- **Complexity**: 4
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/hours.astro`
- **Complexity**: 36
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/index.astro`
- **Complexity**: 13
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/settings.astro`
- **Complexity**: 32
- **Suggestions**:
  - Consider breaking this large file into smaller components
  - Reduce nesting depth by extracting functions or using early returns


### `pages/admin/teachers.astro`
- **Complexity**: 22
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/tuition.astro`
- **Complexity**: 24
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admin/users.astro`
- **Complexity**: 3
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admissions/tuition-calculator.astro`
- **Complexity**: 1
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/admissions.astro`
- **Complexity**: 2
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/contact.astro`
- **Complexity**: 15
- **Suggestions**:
  - Consider breaking this large file into smaller components


### `pages/our-principles.astro`
- **Complexity**: 1
- **Suggestions**:
  - Consider breaking this large file into smaller components


## Duplicate Code



## Optimization Opportunities


### `components/AdminImageOverlay.astro`
- **Type**: consistency
- **Description**: Consider converting inline styles to Tailwind classes


### `components/AdminImageOverlay.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/AdminNav.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/AuthForm.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/AuthNav.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/CallToAction.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/Footer.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/Header.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/HeroSection.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/HoursWidget.astro`
- **Type**: consistency
- **Description**: Consider converting inline styles to Tailwind classes


### `components/HoursWidget.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/ImageGrid.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/InclusionCommitment.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/NonDiscriminationPolicy.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/PhotoFeature.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/ProgramsOverview.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/TeachersSection.astro`
- **Type**: consistency
- **Description**: Consider converting inline styles to Tailwind classes


### `components/TeachersSection.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/Testimonials.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/TuitionCalculator.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/ValuePropositions.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/admin/ImageManagementSettings.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/admin/ProgramsManagement.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/admin/TuitionQuickActions.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/admin/TuitionRatesTable.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `components/admin/TuitionSettings.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `layouts/Layout.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `lib/hours-utils.ts`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `lib/tuition-forms.ts`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/about.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/accessibility.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/analytics.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/communications.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/hours.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/index.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/settings.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/teachers.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/tuition.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admin/users.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admissions/schedule-tour.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admissions/tuition-calculator.astro`
- **Type**: consistency
- **Description**: Consider converting inline styles to Tailwind classes


### `pages/admissions/tuition-calculator.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/admissions.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/auth/forgot-password.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/auth/login.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/auth/register.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/auth/update-password.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/contact.astro`
- **Type**: consistency
- **Description**: Consider converting inline styles to Tailwind classes


### `pages/contact.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/dashboard.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/index.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/non-discrimination-policy.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/our-principles.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/policies.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/privacy-policy.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/resources/blog.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/resources/events.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/resources/faq.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


### `pages/resources/parent-resources.astro`
- **Type**: maintainability
- **Description**: Consider extracting long strings to constants


## Information Flow


- `lib/development-helpers.ts` uses_utility `lib/supabase.ts`


- `test/lib/development-helpers.test.ts` uses_utility `lib/development-helpers.ts`


- `test/lib/supabase.test.ts` uses_utility `lib/supabase.ts`



