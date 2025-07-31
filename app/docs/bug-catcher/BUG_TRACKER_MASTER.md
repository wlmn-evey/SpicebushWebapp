# Bug Tracker Master Index - Spicebush Montessori

**Last Updated**: 2025-07-30  
**Total Bugs**: 41  
**Critical**: 9 | **High**: 17 | **Medium**: 10 | **Low**: 3

## Bug Status Overview

### 🔴 Critical Bugs (Immediate Action Required)
- [001-blog-date-error.md](001-blog-date-error.md) - Blog Date toISOString Error ✅ FIXED
- [002-server-500-errors.md](002-server-500-errors.md) - Server 500 Errors on Multiple Pages ✅ FIXED
- [003-mobile-navigation-broken.md](003-mobile-navigation-broken.md) - Mobile Navigation Menu Failure ✅ FIXED
- [004-tour-scheduling-404.md](004-tour-scheduling-404.md) - Tour Scheduling Page Missing ✅ FIXED
- [026-vite-path-alias-resolution.md](026-vite-path-alias-resolution.md) - Vite Path Alias Resolution Failure in Docker
- [027-supabase-storage-migration-failure.md](027-supabase-storage-migration-failure.md) - Supabase Storage Migration Failure
- [032-docker-missing-dependencies.md](032-docker-missing-dependencies.md) - Docker Container Missing Multiple Dependencies ✅ FIXED
- [034-arm64-rollup-dev-server.md](034-arm64-rollup-dev-server.md) - ARM64 Rollup Dev Server Failure
- [047-db-readonly-env-vars.md](047-db-readonly-env-vars.md) - DB_READONLY Environment Variables Not Accessible ✅ FIXED
- [048-docker-http-request-hang.md](048-docker-http-request-hang.md) - Application Hangs on HTTP Requests in Docker

### 🟠 High Priority Bugs
- [005-slow-page-performance.md](005-slow-page-performance.md) - Poor Page Load Performance
- [006-missing-alt-text.md](006-missing-alt-text.md) - Missing Alt Text on Images
- [007-small-touch-targets.md](007-small-touch-targets.md) - Small Touch Targets on Mobile
- [008-broken-internal-links.md](008-broken-internal-links.md) - Broken Internal Links
- [009-contact-info-not-prominent.md](009-contact-info-not-prominent.md) - Contact Information Not Prominent
- [010-missing-homepage-ctas.md](010-missing-homepage-ctas.md) - Missing Homepage CTAs
- [011-form-accessibility.md](011-form-accessibility.md) - Form Accessibility Issues
- [012-missing-tuition-display.md](012-missing-tuition-display.md) - Missing Tuition Information Display
- [013-docker-container-issues.md](013-docker-container-issues.md) - Docker Container Configuration Issues
- [014-database-connection-errors.md](014-database-connection-errors.md) - Database Connection Instability
- [015-auth-edge-cases.md](015-auth-edge-cases.md) - Authentication Edge Cases
- [016-admin-panel-errors.md](016-admin-panel-errors.md) - Admin Panel Functionality Issues
- [028-supabase-realtime-schema-error.md](028-supabase-realtime-schema-error.md) - Supabase Realtime Schema Migration Error
- [029-supabase-analytics-gcloud-missing.md](029-supabase-analytics-gcloud-missing.md) - Supabase Analytics Missing gcloud.json Configuration
- [030-massive-unoptimized-images.md](030-massive-unoptimized-images.md) - Massive Unoptimized Image Files
- [036-contact-form-validation-accessibility.md](036-contact-form-validation-accessibility.md) - Contact Form Validation Missing Accessible Error Messages
- [037-honeypot-field-screen-reader-visible.md](037-honeypot-field-screen-reader-visible.md) - Honeypot Field Visible to Screen Readers

### 🟡 Medium Priority Bugs
- [017-multiple-h1-tags.md](017-multiple-h1-tags.md) - Multiple H1 Tags on Pages
- [018-missing-meta-descriptions.md](018-missing-meta-descriptions.md) - Missing Meta Descriptions
- [019-api-endpoint-errors.md](019-api-endpoint-errors.md) - API Endpoint Error Handling
- [020-build-warnings.md](020-build-warnings.md) - Build Process Warnings
- [021-image-optimization.md](021-image-optimization.md) - Unoptimized Image Assets
- [022-typescript-errors.md](022-typescript-errors.md) - TypeScript Compilation Errors
- [031-typescript-compilation-errors.md](031-typescript-compilation-errors.md) - Multiple TypeScript Compilation Errors
- [033-decap-cms-window-type-missing.md](033-decap-cms-window-type-missing.md) - Decap CMS Window Type Declarations Missing
- [038-contact-icons-missing-labels.md](038-contact-icons-missing-labels.md) - Contact Form Icons Missing Accessibility Labels
- [039-google-map-missing-alternative.md](039-google-map-missing-alternative.md) - Google Map Embed Missing Text Alternative

### 🟢 Low Priority Bugs
- [023-footer-link-organization.md](023-footer-link-organization.md) - Footer Link Organization
- [024-console-warnings.md](024-console-warnings.md) - Browser Console Warnings
- [025-css-specificity-issues.md](025-css-specificity-issues.md) - CSS Specificity Conflicts

## Bug Categories

### Functionality (16 bugs)
- 001, 002, 003, 004, 008, 013, 014, 015, 016, 019, 026, 027, 028, 029, 032, 033

### Performance (4 bugs)
- 005, 021, 020, 030

### Accessibility (9 bugs)
- 006, 007, 011, 017, 018, 036, 037, 038, 039

### User Experience (5 bugs)
- 009, 010, 012, 023, 025

### Development (3 bugs)
- 022, 024, 031

## Bug Relationships

### Blog System Issues
- Primary: 001 (date error)
- Related: 002 (may cause 500 errors), 019 (API issues)

### Mobile Experience Issues
- Primary: 003 (navigation)
- Related: 007 (touch targets), 005 (performance on mobile)

### Content Display Issues
- Primary: 012 (tuition)
- Related: 009 (contact info), 010 (CTAs)

### Infrastructure Issues
- Primary: 002 (server errors)
- Related: 013 (Docker), 014 (database), 019 (API), 026 (Vite), 027 (storage), 028 (realtime), 029 (analytics), 032 (dependencies)

## Quick Reference

### By Page/Component
- **Homepage**: 002, 005, 010
- **Blog**: 001, 002
- **Mobile (Global)**: 003, 007
- **Admissions**: 004, 012
- **Contact**: 009, 036, 037, 038, 039
- **Admin**: 016
- **Global**: 006, 008, 011, 017, 018, 023

### By Technology
- **React/Astro Components**: 001, 003, 011
- **Database/Supabase**: 002, 014, 015, 027, 028, 029
- **Docker**: 013, 026, 032
- **API/Backend**: 002, 016, 019
- **CSS/Styling**: 007, 023, 025
- **Build/TypeScript**: 020, 022, 031, 033
- **Images/Media**: 030
- **Vite/Bundler**: 026

## Notes

- This tracker follows a Zettelkasten-style approach with cross-references between related bugs
- Each bug file contains YAML frontmatter for easy parsing and filtering
- Update this master index when adding new bugs or changing bug status
- Use semantic versioning for tracking bug fix releases