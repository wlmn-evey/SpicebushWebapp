# Photo Management System - Manual Testing Procedures

## Overview

This document provides comprehensive manual testing procedures for the admin photo management system, designed for school staff (non-technical users) to verify functionality and usability before production deployment.

## Pre-Test Setup

### Environment Requirements
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Device Testing**: Desktop, tablet (iPad/Android), mobile phones
- **Network Conditions**: Test on different connection speeds
- **User Accounts**: Admin account with proper permissions

### Test Data Preparation
Prepare the following test files:
- **Valid Images**: 
  - Small JPEG (< 1MB): `classroom-small.jpg`
  - Medium JPEG (2-3MB): `classroom-medium.jpg`
  - Large JPEG (8-9MB): `classroom-large.jpg`
  - PNG file (< 5MB): `outdoor-activity.png`
  - WebP file (< 3MB): `art-project.webp`
  - GIF file (< 2MB): `animation-demo.gif`
- **Invalid Files**:
  - Oversized image (> 10MB): `too-large.jpg`
  - Wrong format: `document.txt`, `video.mp4`
  - Corrupted image: `broken.jpg`
- **Edge Cases**:
  - Very small image (< 200x200px)
  - Very large dimensions (> 4000x4000px)
  - Image with special characters in filename: `café-montëssori.jpg`

## Test Procedures

### 1. Authentication and Access Control

#### Test 1.1: Admin Login
**Objective**: Verify admin authentication works correctly

**Steps**:
1. Navigate to `/admin/photos`
2. If not logged in, should redirect to login page
3. Enter valid admin credentials
4. Should redirect back to photo management page
5. Verify admin navigation is visible

**Expected Results**:
- ✅ Redirects properly when not authenticated
- ✅ Login process is smooth and intuitive
- ✅ Returns to intended page after login
- ✅ Admin interface is accessible

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 1.2: Session Management
**Objective**: Verify session handling and timeouts

**Steps**:
1. Log in as admin
2. Navigate to photo management
3. Leave browser idle for extended period (if session timeout configured)
4. Try to perform an action (upload/delete)
5. Verify appropriate handling of expired sessions

**Expected Results**:
- ✅ Session timeout is handled gracefully
- ✅ User is redirected to login when session expires
- ✅ No data loss occurs during session expiry

**Pass/Fail**: _____ | **Notes**: _____________________

### 2. Photo Upload Functionality

#### Test 2.1: Single Photo Upload (Happy Path)
**Objective**: Verify basic photo upload workflow

**Steps**:
1. Navigate to `/admin/photos/upload`
2. Verify all form elements are present and labeled clearly
3. Click "Browse" or drag-and-drop `classroom-medium.jpg` into upload area
4. Verify image preview appears
5. Fill in metadata:
   - **Title**: "Children Learning with Montessori Materials"
   - **Description**: "Students engaged in hands-on learning with geometric shapes and mathematical concepts in our prepared environment"
   - **Tags**: "classroom, children, montessori, learning, geometry"
6. Click "Upload Photo"
7. Verify success message and redirect to gallery

**Expected Results**:
- ✅ Upload area is intuitive and clearly labeled
- ✅ File selection works (both click and drag-drop)
- ✅ Preview shows immediately after selection
- ✅ Form fields are clearly labeled with helpful placeholders
- ✅ Upload progress is visible (if applicable)
- ✅ Success message is clear and encouraging
- ✅ Redirects to gallery showing the new photo

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 2.2: Multiple File Format Support
**Objective**: Verify different image formats are accepted

**Test each format separately**:

**Format: JPEG**
- File: `classroom-small.jpg`
- Expected: ✅ Accepted and processed

**Format: PNG**
- File: `outdoor-activity.png`
- Expected: ✅ Accepted and processed

**Format: WebP**
- File: `art-project.webp`
- Expected: ✅ Accepted and processed

**Format: GIF**
- File: `animation-demo.gif`
- Expected: ✅ Accepted and processed

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 2.3: File Size Validation
**Objective**: Verify file size limits are enforced appropriately

**Steps**:
1. Try uploading `too-large.jpg` (> 10MB)
2. Verify clear error message appears
3. Try uploading `classroom-large.jpg` (8-9MB, within limit)
4. Verify it's accepted
5. Check that error messages are user-friendly

**Expected Results**:
- ✅ Oversized files are rejected with clear error message
- ✅ Error message explains the size limit (e.g., "Maximum file size is 10MB")
- ✅ Valid large files are accepted
- ✅ No technical jargon in error messages

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 2.4: Invalid File Type Handling
**Objective**: Verify non-image files are handled properly

**Steps**:
1. Try uploading `document.txt`
2. Try uploading `video.mp4`
3. Verify error messages are clear and helpful
4. Verify the form doesn't break or become unusable

**Expected Results**:
- ✅ Invalid files are rejected immediately
- ✅ Error message explains acceptable formats
- ✅ Form remains functional after error
- ✅ User can try again without refreshing

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 2.5: Form Validation
**Objective**: Verify required fields and validation work correctly

**Steps**:
1. Select a valid image
2. Leave title field empty
3. Try to submit
4. Verify validation message
5. Enter title but use extremely long text (> 200 characters)
6. Verify character limit enforcement
7. Test description and tags limits similarly

**Expected Results**:
- ✅ Required field validation prevents submission
- ✅ Validation messages are clear and specific
- ✅ Character limits are enforced visually
- ✅ Form preserves entered data after validation errors

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 2.6: Image Preview Functionality
**Objective**: Verify image preview works correctly

**Steps**:
1. Upload different image types and sizes
2. Verify preview appears for each
3. Test "Remove image" functionality
4. Verify preview updates correctly

**Expected Results**:
- ✅ Preview shows immediately after selection
- ✅ Preview is appropriately sized and clear
- ✅ Remove functionality clears preview and resets form
- ✅ No broken images or loading issues

**Pass/Fail**: _____ | **Notes**: _____________________

### 3. Photo Gallery Management

#### Test 3.1: Gallery Display and Navigation
**Objective**: Verify photo gallery displays correctly with good UX

**Steps**:
1. Navigate to `/admin/photos`
2. Verify page loads within reasonable time (< 5 seconds)
3. Check that photos display in grid format
4. Verify photo information is clearly visible
5. Test grid/list view toggle
6. Check breadcrumb navigation

**Expected Results**:
- ✅ Gallery loads quickly and smoothly
- ✅ Photos are displayed in an organized, visually appealing grid
- ✅ Photo titles, dates, and file sizes are visible
- ✅ Grid/list toggle works smoothly
- ✅ Navigation is clear and intuitive

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 3.2: Statistics and Information Display
**Objective**: Verify statistics are accurate and helpful

**Steps**:
1. Note the statistics bar at top of gallery
2. Verify counts match actual photos visible
3. Check file size totals make sense
4. Verify date formatting is user-friendly

**Expected Results**:
- ✅ Statistics are accurate
- ✅ Numbers are formatted clearly (e.g., "2.5 MB" not "2548576 bytes")
- ✅ Recent photo counts are logical
- ✅ Information is helpful for managing storage

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 3.3: Photo Viewing Modal
**Objective**: Verify photo viewing experience is good

**Steps**:
1. Click on a photo or its view button
2. Verify modal opens with full-size image
3. Test different ways to close modal:
   - Close button (X)
   - Click outside modal (backdrop)
   - Press Escape key
4. Verify modal works on different screen sizes

**Expected Results**:
- ✅ Modal opens smoothly and displays image clearly
- ✅ Image is appropriately sized for the screen
- ✅ All close methods work intuitively
- ✅ Modal is accessible and user-friendly

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 3.4: Photo Deletion
**Objective**: Verify deletion process is safe and clear

**Steps**:
1. Hover over a photo to reveal action buttons
2. Click delete button
3. Verify confirmation dialog appears
4. Test canceling deletion
5. Test confirming deletion
6. Verify photo is removed from gallery

**Expected Results**:
- ✅ Deletion requires confirmation
- ✅ Confirmation message is clear about what will be deleted
- ✅ Cancel option works properly
- ✅ Successful deletion shows confirmation message
- ✅ Gallery updates immediately after deletion

**Pass/Fail**: _____ | **Notes**: _____________________

### 4. Mobile and Tablet Testing

#### Test 4.1: Mobile Upload Experience
**Objective**: Verify upload works well on mobile devices

**Steps**:
1. Use mobile device (phone)
2. Navigate to upload page
3. Test photo selection from device camera/gallery
4. Fill form fields using mobile keyboard
5. Complete upload process

**Expected Results**:
- ✅ Form is easily usable on mobile
- ✅ File selection works with device gallery/camera
- ✅ Form fields are appropriately sized for mobile
- ✅ Upload process works smoothly

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 4.2: Tablet Gallery Experience
**Objective**: Verify gallery works well on tablets

**Steps**:
1. Use tablet device (iPad/Android tablet)
2. Navigate to photo gallery
3. Test grid layout on tablet screen
4. Test photo viewing modal
5. Verify touch interactions work properly

**Expected Results**:
- ✅ Gallery layout adapts well to tablet screen
- ✅ Photos are appropriately sized
- ✅ Touch interactions are responsive
- ✅ Modal works well with touch

**Pass/Fail**: _____ | **Notes**: _____________________

### 5. Performance and Usability

#### Test 5.1: Loading Performance
**Objective**: Verify system performs well with various amounts of content

**Test with different gallery sizes**:
- **Few photos (< 10)**: Load time _____ seconds
- **Medium gallery (20-50 photos)**: Load time _____ seconds  
- **Large gallery (100+ photos)**: Load time _____ seconds

**Expected Results**:
- ✅ Gallery loads in under 5 seconds regardless of size
- ✅ Images load progressively (lazy loading)
- ✅ No significant delays or freezing

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 5.2: Upload Performance
**Objective**: Verify uploads complete in reasonable time

**Test different file sizes**:
- **Small file (< 1MB)**: Upload time _____ seconds
- **Medium file (2-3MB)**: Upload time _____ seconds
- **Large file (8-9MB)**: Upload time _____ seconds

**Expected Results**:
- ✅ Small files upload in under 10 seconds
- ✅ Large files upload in under 30 seconds
- ✅ Progress indication is shown for longer uploads

**Pass/Fail**: _____ | **Notes**: _____________________

### 6. Error Handling and Recovery

#### Test 6.1: Network Issues
**Objective**: Verify system handles network problems gracefully

**Steps**:
1. Start an upload
2. Disconnect internet during upload
3. Reconnect internet
4. Verify appropriate error messages and recovery options

**Expected Results**:
- ✅ Network errors show user-friendly messages
- ✅ User can retry failed operations
- ✅ No data is lost during network issues

**Pass/Fail**: _____ | **Notes**: _____________________

#### Test 6.2: Server Errors
**Objective**: Verify server errors are handled appropriately

**Steps**:
1. Try operations during simulated server issues
2. Verify error messages are helpful, not technical
3. Check that user can recover gracefully

**Expected Results**:
- ✅ Server errors show helpful messages
- ✅ User is guided on what to do next
- ✅ System doesn't break or become unusable

**Pass/Fail**: _____ | **Notes**: _____________________

### 7. Browser Compatibility

#### Test 7.1: Chrome
**Browser**: Chrome _____ (version)
**Upload functionality**: Pass/Fail _____
**Gallery functionality**: Pass/Fail _____
**Mobile view**: Pass/Fail _____
**Notes**: _____________________

#### Test 7.2: Firefox
**Browser**: Firefox _____ (version)
**Upload functionality**: Pass/Fail _____
**Gallery functionality**: Pass/Fail _____
**Mobile view**: Pass/Fail _____
**Notes**: _____________________

#### Test 7.3: Safari
**Browser**: Safari _____ (version)
**Upload functionality**: Pass/Fail _____
**Gallery functionality**: Pass/Fail _____
**Mobile view**: Pass/Fail _____
**Notes**: _____________________

#### Test 7.4: Edge
**Browser**: Edge _____ (version)
**Upload functionality**: Pass/Fail _____
**Gallery functionality**: Pass/Fail _____
**Mobile view**: Pass/Fail _____
**Notes**: _____________________

## Accessibility Testing

### Test 8.1: Keyboard Navigation
**Objective**: Verify system is fully usable with keyboard only

**Steps**:
1. Navigate using only Tab, Enter, Space, and arrow keys
2. Test upload form navigation
3. Test gallery navigation
4. Test modal keyboard controls

**Expected Results**:
- ✅ All interactive elements are reachable via keyboard
- ✅ Tab order is logical and intuitive
- ✅ Keyboard shortcuts work as expected
- ✅ Focus indicators are clearly visible

**Pass/Fail**: _____ | **Notes**: _____________________

### Test 8.2: Screen Reader Compatibility
**Objective**: Verify content is accessible to screen readers

**Steps**:
1. Use screen reader software (if available)
2. Navigate through upload form
3. Navigate through gallery
4. Verify all content is properly announced

**Expected Results**:
- ✅ Form labels are properly associated with inputs
- ✅ Images have appropriate alt text
- ✅ Error messages are announced
- ✅ Button purposes are clear

**Pass/Fail**: _____ | **Notes**: _____________________

## User Experience Evaluation

### Test 9.1: First-Time User Experience
**Objective**: Verify system is intuitive for new users

**Find a staff member who hasn't used the system**:

**Tasks to complete without guidance**:
1. Upload a new photo with title and description
2. Find and view a specific photo in the gallery
3. Delete an unwanted photo

**Observations**:
- Time to complete upload: _____ minutes
- Number of errors or confusion points: _____
- Overall difficulty (1-10, 10 being easiest): _____
- User feedback: _____________________

**Expected Results**:
- ✅ New user can complete basic tasks within 5 minutes
- ✅ Interface is intuitive without training
- ✅ Error messages help guide user to success

**Pass/Fail**: _____ | **Notes**: _____________________

### Test 9.2: Workflow Efficiency
**Objective**: Verify system supports efficient workflows

**Time these common tasks**:
- Upload single photo with metadata: _____ minutes
- Find and view specific photo: _____ seconds
- Delete multiple photos: _____ minutes per photo

**Expected Results**:
- ✅ Common tasks can be completed quickly
- ✅ Workflow feels natural and efficient
- ✅ No unnecessary steps or complications

**Pass/Fail**: _____ | **Notes**: _____________________

## Final Assessment

### Overall System Rating
Rate each area from 1-10 (10 being excellent):

- **Functionality**: _____ / 10
- **Usability**: _____ / 10  
- **Performance**: _____ / 10
- **Reliability**: _____ / 10
- **Mobile Experience**: _____ / 10
- **Accessibility**: _____ / 10

### Critical Issues Found
List any issues that must be fixed before production:

1. _____________________
2. _____________________
3. _____________________

### Nice-to-Have Improvements
List improvements that would enhance the experience:

1. _____________________
2. _____________________
3. _____________________

### Production Readiness Recommendation

**☐ Ready for Production** - All critical functionality works well
**☐ Ready with Minor Issues** - Functional but has non-critical issues
**☐ Not Ready** - Has critical issues that must be addressed

**Tester Information**:
- **Name**: _____________________
- **Role**: _____________________
- **Date**: _____________________
- **Testing Duration**: _____ hours

**Additional Comments**:
_________________________________________________
_________________________________________________
_________________________________________________

---

*This manual testing procedure should be completed by multiple staff members who will be using the system regularly. Their feedback is crucial for ensuring the system meets real-world usage needs.*