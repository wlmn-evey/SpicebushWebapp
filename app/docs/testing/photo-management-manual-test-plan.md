# Photo Management System - Manual Testing Plan

## Overview

This document provides a comprehensive manual testing checklist for the admin photo management system. Use this guide to verify all functionality works correctly across different environments and scenarios.

## Test Environment Setup

### Prerequisites
- [ ] Admin authentication credentials available
- [ ] Test image files prepared (various formats: JPG, PNG, WebP, GIF)
- [ ] Test files of different sizes (small < 1MB, medium 1-5MB, large 5-10MB)
- [ ] Multiple browsers available (Chrome, Firefox, Safari, Edge)
- [ ] Different devices/screen sizes for testing
- [ ] Database access for verification

### Test Data Requirements
- [ ] Valid image files for upload testing
- [ ] Invalid file types for negative testing
- [ ] Large files for size limit testing
- [ ] Images with special characters in filenames
- [ ] Sample metadata for testing (titles, descriptions, tags)

## Authentication & Access Control

### Test Cases
- [ ] **AC-001**: Navigate to `/admin/photos` without authentication
  - Expected: Redirect to login page
  - Actual: ________________

- [ ] **AC-002**: Navigate to `/admin/photos/upload` without authentication
  - Expected: Redirect to login page
  - Actual: ________________

- [ ] **AC-003**: Access photo management with valid admin credentials
  - Expected: Full access to all features
  - Actual: ________________

- [ ] **AC-004**: Test session timeout during photo management
  - Expected: Graceful handling, redirect to login
  - Actual: ________________

## Photo Management Interface (/admin/photos/index.astro)

### Page Load & Display
- [ ] **PM-001**: Initial page load displays correctly
  - Check: Page title, header, navigation breadcrumbs
  - Expected: "Photo Management" title visible
  - Actual: ________________

- [ ] **PM-002**: Statistics bar shows correct information
  - Check: Total files, Images count, Recent uploads, Total size
  - Expected: Numbers match actual database content
  - Actual: ________________

- [ ] **PM-003**: Upload button navigation works
  - Action: Click "Upload Photos" button
  - Expected: Navigate to `/admin/photos/upload`
  - Actual: ________________

### Photo Grid Display
- [ ] **PM-004**: Photos display in grid view by default
  - Check: Grid layout, photo thumbnails, metadata
  - Expected: Cards in responsive grid
  - Actual: ________________

- [ ] **PM-005**: Photo metadata displays correctly
  - Check: Title, description, upload date, file size, tags
  - Expected: All metadata formatted properly
  - Actual: ________________

- [ ] **PM-006**: File type icons display for non-image files
  - Test: Upload PDF or other document type
  - Expected: Appropriate file type icon shown
  - Actual: ________________

### View Switching
- [ ] **PM-007**: Switch from grid to list view
  - Action: Click "List" button
  - Expected: Photos display in list format
  - Actual: ________________

- [ ] **PM-008**: Switch back to grid view
  - Action: Click "Grid" button
  - Expected: Photos display in grid format
  - Actual: ________________

- [ ] **PM-009**: View preference persists during session
  - Action: Switch views, refresh page
  - Expected: Last selected view maintained
  - Actual: ________________

### Photo Viewer Modal
- [ ] **PM-010**: Open photo viewer modal
  - Action: Hover over photo, click view button
  - Expected: Modal opens with full-size image
  - Actual: ________________

- [ ] **PM-011**: Modal displays correct photo and title
  - Check: Image matches clicked photo, title correct
  - Expected: Correct photo and metadata
  - Actual: ________________

- [ ] **PM-012**: Close modal with X button
  - Action: Click close button
  - Expected: Modal closes, focus returns
  - Actual: ________________

- [ ] **PM-013**: Close modal with backdrop click
  - Action: Click outside modal content
  - Expected: Modal closes
  - Actual: ________________

- [ ] **PM-014**: Close modal with Escape key
  - Action: Press Escape key
  - Expected: Modal closes
  - Actual: ________________

- [ ] **PM-015**: Modal prevents body scrolling
  - Check: Body scroll disabled when modal open
  - Expected: No background scrolling
  - Actual: ________________

### Photo Deletion
- [ ] **PM-016**: Delete photo with confirmation
  - Action: Hover over photo, click delete button, confirm
  - Expected: Photo deleted, success message shown
  - Actual: ________________

- [ ] **PM-017**: Cancel photo deletion
  - Action: Click delete button, cancel confirmation
  - Expected: Photo remains, no changes
  - Actual: ________________

- [ ] **PM-018**: Delete confirmation shows photo name
  - Check: Confirmation dialog includes photo title
  - Expected: "Delete [Photo Title]?" message
  - Actual: ________________

- [ ] **PM-019**: Statistics update after deletion
  - Check: File count and size update correctly
  - Expected: Numbers decrease appropriately
  - Actual: ________________

### Empty & Error States
- [ ] **PM-020**: Empty state when no photos exist
  - Setup: Delete all photos
  - Expected: Empty state message and upload button
  - Actual: ________________

- [ ] **PM-021**: Error state handling
  - Setup: Simulate API error
  - Expected: Error message displayed gracefully
  - Actual: ________________

## Photo Upload Interface (/admin/photos/upload.astro)

### Page Load & Navigation
- [ ] **PU-001**: Upload page displays correctly
  - Check: Title, breadcrumbs, form sections
  - Expected: Complete upload interface
  - Actual: ________________

- [ ] **PU-002**: Breadcrumb navigation works
  - Action: Click "Photos" in breadcrumb
  - Expected: Navigate to photo management
  - Actual: ________________

- [ ] **PU-003**: Back button navigation works
  - Action: Click "Back to Photos" button
  - Expected: Navigate to photo management
  - Actual: ________________

### Form Validation
- [ ] **PU-004**: Required field validation - Photo Title
  - Action: Submit form without title
  - Expected: Validation error displayed
  - Actual: ________________

- [ ] **PU-005**: Required field validation - Photo Upload
  - Action: Submit form without photo
  - Expected: "Please upload a photo" error
  - Actual: ________________

- [ ] **PU-006**: Field length validation - Title (200 chars)
  - Action: Enter 201 characters in title
  - Expected: Input limited or validation error
  - Actual: ________________

- [ ] **PU-007**: Field length validation - Description (500 chars)
  - Action: Enter 501 characters in description
  - Expected: Input limited or validation error
  - Actual: ________________

- [ ] **PU-008**: Field length validation - Tags (200 chars)
  - Action: Enter 201 characters in tags
  - Expected: Input limited or validation error
  - Actual: ________________

### File Upload Process
- [ ] **PU-009**: Upload valid image file (JPG)
  - Action: Select and upload JPG file
  - Expected: File uploads successfully
  - Actual: ________________

- [ ] **PU-010**: Upload valid image file (PNG)
  - Action: Select and upload PNG file
  - Expected: File uploads successfully
  - Actual: ________________

- [ ] **PU-011**: Upload valid image file (WebP)
  - Action: Select and upload WebP file
  - Expected: File uploads successfully
  - Actual: ________________

- [ ] **PU-012**: Upload valid image file (GIF)
  - Action: Select and upload GIF file
  - Expected: File uploads successfully
  - Actual: ________________

- [ ] **PU-013**: Reject invalid file types
  - Action: Try to upload .exe, .txt, etc.
  - Expected: Error message about file type
  - Actual: ________________

- [ ] **PU-014**: File size limit enforcement (10MB)
  - Action: Try to upload file > 10MB
  - Expected: Error message about file size
  - Actual: ________________

- [ ] **PU-015**: Drag and drop functionality
  - Action: Drag image file to upload area
  - Expected: File uploads successfully
  - Actual: ________________

### Form Submission
- [ ] **PU-016**: Successful form submission
  - Action: Fill all fields, submit form
  - Expected: Redirect to management with success message
  - Actual: ________________

- [ ] **PU-017**: Form data persistence on error
  - Setup: Cause validation error after filling form
  - Expected: Form data preserved for user
  - Actual: ________________

- [ ] **PU-018**: Tag processing
  - Action: Enter "tag1, tag2, tag3" in tags field
  - Expected: Tags saved as separate items
  - Actual: ________________

- [ ] **PU-019**: Handle special characters in metadata
  - Action: Use quotes, apostrophes, unicode in fields
  - Expected: Characters saved and displayed correctly
  - Actual: ________________

### Cancel & Navigation
- [ ] **PU-020**: Cancel button functionality
  - Action: Fill form partially, click Cancel
  - Expected: Navigate to management without saving
  - Actual: ________________

- [ ] **PU-021**: Browser back button handling
  - Action: Use browser back button during upload
  - Expected: Graceful navigation, no data loss
  - Actual: ________________

## API Endpoint Testing

### GET /api/cms/media
- [ ] **API-001**: Retrieve photo list successfully
  - Method: GET request to endpoint
  - Expected: JSON array of photo objects
  - Actual: ________________

- [ ] **API-002**: Handle empty photo list
  - Setup: No photos in database
  - Expected: Empty array returned
  - Actual: ________________

- [ ] **API-003**: Authentication required
  - Setup: Request without auth
  - Expected: 401 Unauthorized response
  - Actual: ________________

### DELETE /api/cms/media
- [ ] **API-004**: Delete photo successfully
  - Method: DELETE with valid photo ID
  - Expected: Photo removed, success response
  - Actual: ________________

- [ ] **API-005**: Handle invalid photo ID
  - Method: DELETE with non-existent ID
  - Expected: 404 Not Found response
  - Actual: ________________

- [ ] **API-006**: Handle missing photo ID
  - Method: DELETE without ID in body
  - Expected: 400 Bad Request response
  - Actual: ________________

- [ ] **API-007**: Authentication required for deletion
  - Setup: DELETE request without auth
  - Expected: 401 Unauthorized response
  - Actual: ________________

## Cross-Browser Testing

### Chrome
- [ ] **XB-001**: Full functionality in Chrome
  - Test: Complete workflow on latest Chrome
  - Expected: All features work correctly
  - Actual: ________________

### Firefox
- [ ] **XB-002**: Full functionality in Firefox
  - Test: Complete workflow on latest Firefox
  - Expected: All features work correctly
  - Actual: ________________

### Safari
- [ ] **XB-003**: Full functionality in Safari
  - Test: Complete workflow on latest Safari
  - Expected: All features work correctly
  - Actual: ________________

### Edge
- [ ] **XB-004**: Full functionality in Edge
  - Test: Complete workflow on latest Edge
  - Expected: All features work correctly
  - Actual: ________________

## Mobile & Responsive Testing

### Mobile Portrait (375px width)
- [ ] **MOB-001**: Photo management responsive layout
  - Check: Grid adapts, touch interactions work
  - Expected: Usable on mobile devices
  - Actual: ________________

- [ ] **MOB-002**: Upload form responsive layout
  - Check: Form fields stack properly, easy to use
  - Expected: Mobile-friendly form
  - Actual: ________________

- [ ] **MOB-003**: Modal responsive on mobile
  - Check: Photo viewer works on mobile
  - Expected: Modal fits screen, touch controls work
  - Actual: ________________

### Tablet (768px width)
- [ ] **TAB-001**: Photo management on tablet
  - Check: Grid layout optimized for tablet
  - Expected: Good use of screen space
  - Actual: ________________

- [ ] **TAB-002**: Upload form on tablet
  - Check: Form layout and interactions
  - Expected: Touch-friendly interface
  - Actual: ________________

### Landscape Orientations
- [ ] **LAND-001**: Mobile landscape functionality
  - Check: Both interfaces in landscape mode
  - Expected: Content fits properly
  - Actual: ________________

## Accessibility Testing

### Keyboard Navigation
- [ ] **A11Y-001**: Tab through all interactive elements
  - Action: Use Tab key to navigate
  - Expected: Logical tab order, all elements reachable  
  - Actual: ________________

- [ ] **A11Y-002**: Modal keyboard accessibility
  - Action: Open modal, test keyboard navigation
  - Expected: Focus trapped in modal, Escape closes
  - Actual: ________________

- [ ] **A11Y-003**: Form keyboard accessibility
  - Action: Navigate upload form with keyboard only
  - Expected: All fields accessible, submit works
  - Actual: ________________

### Screen Reader Testing
- [ ] **A11Y-004**: Test with screen reader (NVDA/JAWS/VoiceOver)
  - Check: Content announced correctly
  - Expected: Meaningful announcements
  - Actual: ________________

- [ ] **A11Y-005**: Image alt text accessibility
  - Check: Images have descriptive alt text
  - Expected: Photo titles used as alt text
  - Actual: ________________

- [ ] **A11Y-006**: Form label associations
  - Check: All form fields have proper labels
  - Expected: Labels correctly associated
  - Actual: ________________

### Color & Contrast
- [ ] **A11Y-007**: Color contrast compliance
  - Tool: Use contrast checker on text/background
  - Expected: WCAG AA compliance (4.5:1 ratio)
  - Actual: ________________

- [ ] **A11Y-008**: High contrast mode compatibility
  - Setup: Enable high contrast mode
  - Expected: Interface remains usable
  - Actual: ________________

## Performance Testing

### Load Times
- [ ] **PERF-001**: Photo management page load time
  - Tool: Browser dev tools
  - Expected: < 3 seconds for initial load
  - Actual: ________________

- [ ] **PERF-002**: Upload page load time
  - Tool: Browser dev tools
  - Expected: < 2 seconds for form display
  - Actual: ________________

- [ ] **PERF-003**: Large photo grid performance
  - Setup: 50+ photos in database
  - Expected: Smooth scrolling, no lag
  - Actual: ________________

### File Upload Performance
- [ ] **PERF-004**: Upload speed for various file sizes
  - Test: 1MB, 5MB, 10MB files
  - Expected: Reasonable upload times
  - Actual: ________________

- [ ] **PERF-005**: Multiple concurrent uploads
  - Test: Upload several files simultaneously
  - Expected: System handles load gracefully
  - Actual: ________________

## Security Testing

### Input Validation
- [ ] **SEC-001**: XSS prevention in photo titles
  - Action: Enter `<script>alert('xss')</script>` in title
  - Expected: Script tags escaped/sanitized
  - Actual: ________________

- [ ] **SEC-002**: XSS prevention in descriptions
  - Action: Enter malicious script in description
  - Expected: Content properly escaped
  - Actual: ________________

- [ ] **SEC-003**: SQL injection prevention
  - Action: Enter SQL injection patterns in fields
  - Expected: No database errors, input sanitized
  - Actual: ________________

### File Upload Security
- [ ] **SEC-004**: Malicious file upload prevention
  - Action: Try to upload .php, .js files
  - Expected: File type validation prevents upload
  - Actual: ________________

- [ ] **SEC-005**: File content validation
  - Action: Upload .jpg file with PHP code
  - Expected: File content validated, not just extension
  - Actual: ________________

## Error Handling & Edge Cases

### Network Issues
- [ ] **ERR-001**: Handle network disconnection during upload
  - Setup: Disconnect network during file upload
  - Expected: Graceful error message
  - Actual: ________________

- [ ] **ERR-002**: Handle slow network connections
  - Setup: Throttle network speed
  - Expected: Upload progress indication
  - Actual: ________________

### Database Issues
- [ ] **ERR-003**: Handle database connection errors
  - Setup: Simulate database unavailability
  - Expected: User-friendly error message
  - Actual: ________________

- [ ] **ERR-004**: Handle partial data scenarios
  - Setup: Incomplete photo records in database
  - Expected: Missing data handled gracefully
  - Actual: ________________

### Edge Cases
- [ ] **ERR-005**: Very long file names
  - Action: Upload file with 255+ character name
  - Expected: Filename truncated or error handled
  - Actual: ________________

- [ ] **ERR-006**: Special characters in file names
  - Action: Upload files with unicode, symbols
  - Expected: Names preserved or safely converted
  - Actual: ________________

- [ ] **ERR-007**: Duplicate file uploads
  - Action: Upload same file multiple times
  - Expected: System handles duplicates appropriately
  - Actual: ________________

## Integration Testing

### Admin Dashboard Integration
- [ ] **INT-001**: Quick Actions link works
  - Action: Click photo management from dashboard
  - Expected: Navigate to `/admin/photos`
  - Actual: ________________

- [ ] **INT-002**: Navigation consistency
  - Check: Admin navigation menu includes photos
  - Expected: Consistent navigation experience
  - Actual: ________________

### Database Integration
- [ ] **INT-003**: Media table structure integrity
  - Check: All required fields present and correct types
  - Expected: Database schema matches application needs
  - Actual: ________________

- [ ] **INT-004**: Data consistency between upload and display
  - Action: Upload photo, verify display data
  - Expected: All metadata preserved accurately
  - Actual: ________________

## Test Completion Checklist

- [ ] All test cases executed
- [ ] Critical bugs documented and reported
- [ ] Performance baselines established
- [ ] Accessibility compliance verified
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsiveness validated
- [ ] Security vulnerabilities addressed
- [ ] Integration points tested
- [ ] Error handling verified
- [ ] User experience validated

## Bug Reporting Template

**Bug ID**: [Unique identifier]
**Test Case**: [Which test case failed]
**Severity**: [Critical/High/Medium/Low]
**Browser/Device**: [Environment where bug occurred]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshots/Videos**: [If applicable]
**Additional Notes**: [Any other relevant information]

## Sign-off

**Tester Name**: ________________
**Date**: ________________
**Overall Test Result**: [ ] PASS [ ] FAIL [ ] PASS WITH MINOR ISSUES
**Recommendation**: ________________

**Comments**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________