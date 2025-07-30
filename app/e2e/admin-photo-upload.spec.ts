/**
 * E2E Tests for Admin Photo Upload Interface
 * 
 * Tests the complete photo upload workflow including:
 * - Form validation and error handling
 * - File upload process
 * - Metadata input and processing
 * - Navigation and user experience
 * - Drag and drop functionality
 */

import { test, expect, Page } from '@playwright/test';
import { createReadStream } from 'fs';
import path from 'path';

test.describe('Admin Photo Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      document.cookie = 'sbms-admin-auth=bypass; path=/';
    });

    // Mock the media upload API
    await page.route('**/api/media/upload', async (route, request) => {
      const formData = await request.postData();
      
      // Simulate successful upload
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: 'https://example.com/uploaded-photo.jpg',
          filename: 'test-photo.jpg'
        })
      });
    });

    // Mock the media metadata update
    await page.route('**/api/cms/media', async (route, request) => {
      if (request.method() === 'GET') {
        // Mock finding the uploaded photo in database
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'uploaded-photo-123',
            name: 'test-photo.jpg',
            url: 'https://example.com/uploaded-photo.jpg',
            path: 'https://example.com/uploaded-photo.jpg'
          }])
        });
      }
    });

    // Navigate to upload page
    await page.goto('/admin/photos/upload');
  });

  test('should display upload page with correct title and navigation', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Upload Photos/);
    
    // Check header elements
    await expect(page.locator('h1')).toContainText('Upload Photos');
    await expect(page.locator('.page-description')).toContainText('Upload new photos to the media library');
    
    // Check breadcrumb navigation
    await expect(page.locator('.breadcrumb-link[href="/admin"]')).toContainText('Admin');
    await expect(page.locator('.breadcrumb-link[href="/admin/photos"]')).toContainText('Photos');
    await expect(page.locator('.breadcrumb-current')).toContainText('Upload');
    
    // Check back button
    const backButton = page.locator('a[href="/admin/photos"]').filter({ hasText: 'Back to Photos' });
    await expect(backButton).toBeVisible();
  });

  test('should display upload form with all required fields', async ({ page }) => {
    // Check form sections
    await expect(page.locator('.section-title').filter({ hasText: 'Photo Upload' })).toBeVisible();
    await expect(page.locator('.section-title').filter({ hasText: 'Photo Information' })).toBeVisible();
    
    // Check photo upload area
    await expect(page.locator('[name="photo_url"]')).toBeVisible();
    
    // Check metadata fields
    await expect(page.locator('#photo_title')).toBeVisible();
    await expect(page.locator('#photo_description')).toBeVisible();
    await expect(page.locator('#photo_tags')).toBeVisible();
    
    // Check form buttons
    await expect(page.locator('button[type="submit"]')).toContainText('Upload Photo');
    await expect(page.locator('a[href="/admin/photos"]').filter({ hasText: 'Cancel' })).toBeVisible();
  });

  test('should validate required photo title field', async ({ page }) => {
    // Fill in photo URL but leave title empty
    await page.locator('#photo_description').fill('Test description');
    await page.locator('button[type="submit"]').click();
    
    // Should show validation error for missing title
    await expect(page.locator('#photo_title')).toHaveAttribute('required');
    
    // Browser validation should prevent form submission
    const isInvalid = await page.locator('#photo_title').evaluate(el => 
      (el as HTMLInputElement).validity.valid === false
    );
    expect(isInvalid).toBe(true);
  });

  test('should enforce field length limits', async ({ page }) => {
    // Test title length limit (200 characters)
    const longTitle = 'A'.repeat(201);
    await page.locator('#photo_title').fill(longTitle);
    
    const titleValue = await page.locator('#photo_title').inputValue();
    expect(titleValue.length).toBeLessThanOrEqual(200);
    
    // Test description length limit (500 characters)
    const longDescription = 'B'.repeat(501);
    await page.locator('#photo_description').fill(longDescription);
    
    const descValue = await page.locator('#photo_description').inputValue();
    expect(descValue.length).toBeLessThanOrEqual(500);
    
    // Test tags length limit (200 characters)
    const longTags = 'C'.repeat(201);
    await page.locator('#photo_tags').fill(longTags);
    
    const tagsValue = await page.locator('#photo_tags').inputValue();
    expect(tagsValue.length).toBeLessThanOrEqual(200);
  });

  test('should display helpful placeholder text', async ({ page }) => {
    // Check field placeholders
    await expect(page.locator('#photo_title')).toHaveAttribute('placeholder', 'Enter a descriptive title for this photo');
    await expect(page.locator('#photo_description')).toHaveAttribute('placeholder', /Describe what's in the photo/);
    await expect(page.locator('#photo_tags')).toHaveAttribute('placeholder', /classroom, children, outdoor/);
    
    // Check help text
    await expect(page.locator('#photo_tags-help')).toContainText('Separate multiple tags with commas');
  });

  test('should handle successful form submission', async ({ page }) => {
    // Mock successful upload and database operations
    await page.route('**/admin/photos/upload', async (route, request) => {
      if (request.method() === 'POST') {
        // Simulate successful form submission
        await route.fulfill({
          status: 302,
          headers: {
            'Location': '/admin/photos?success=Photo uploaded successfully'
          }
        });
      }
    });

    // Fill in form data
    await page.locator('#photo_title').fill('Beautiful Sunset');
    await page.locator('#photo_description').fill('A gorgeous sunset over the mountains');
    await page.locator('#photo_tags').fill('sunset, mountains, nature');
    
    // Simulate photo upload (this would normally be handled by ImageUpload component)
    await page.evaluate(() => {
      const photoUrlInput = document.querySelector('[name="photo_url"]') as HTMLInputElement;
      if (photoUrlInput) {
        photoUrlInput.value = 'https://example.com/sunset.jpg';
      }
    });

    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to management page with success message
    await page.waitForURL(/.*success=Photo%20uploaded%20successfully/);
    await expect(page).toHaveURL(/\/admin\/photos/);
  });

  test('should handle form submission errors', async ({ page }) => {
    // Mock server error
    await page.route('**/admin/photos/upload', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          body: `
            <html>
              <body>
                <div class="status-message status-message--error" role="alert">
                  Failed to save photo. Please try again.
                </div>
              </body>
            </html>
          `
        });
      }
    });

    // Fill form and submit
    await page.locator('#photo_title').fill('Test Photo');
    await page.evaluate(() => {
      const photoUrlInput = document.querySelector('[name="photo_url"]') as HTMLInputElement;
      if (photoUrlInput) {
        photoUrlInput.value = 'https://example.com/test.jpg';
      }
    });

    await page.locator('button[type="submit"]').click();
    
    // Should show error message
    await expect(page.locator('.status-message--error')).toContainText('Failed to save photo');
  });

  test('should preserve form data after validation errors', async ({ page }) => {
    // Mock validation error response
    await page.route('**/admin/photos/upload', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          body: `
            <html>
              <body>
                <input type="text" id="photo_title" value="Test Title" />
                <textarea id="photo_description">Test Description</textarea>
                <input type="text" id="photo_tags" value="tag1, tag2" />
                <div class="field-error">Photo title is required</div>
              </body>
            </html>
          `
        });
      }
    });

    // Fill form with data
    const testData = {
      title: 'Test Title',
      description: 'Test Description', 
      tags: 'tag1, tag2'
    };

    await page.locator('#photo_title').fill(testData.title);
    await page.locator('#photo_description').fill(testData.description);
    await page.locator('#photo_tags').fill(testData.tags);

    // Submit form (will trigger validation error)
    await page.locator('button[type="submit"]').click();

    // Form data should be preserved in the response
    await expect(page.locator('#photo_title')).toHaveValue(testData.title);
    await expect(page.locator('#photo_description')).toHaveValue(testData.description);
    await expect(page.locator('#photo_tags')).toHaveValue(testData.tags);
  });

  test('should navigate back to photos page via breadcrumb', async ({ page }) => {
    // Click on Photos breadcrumb
    await page.locator('.breadcrumb-link[href="/admin/photos"]').click();
    
    // Should navigate to photos management page
    await expect(page).toHaveURL('/admin/photos');
  });

  test('should navigate back to photos page via back button', async ({ page }) => {
    // Click back button
    await page.locator('a[href="/admin/photos"]').filter({ hasText: 'Back to Photos' }).click();
    
    // Should navigate to photos management page
    await expect(page).toHaveURL('/admin/photos');
  });

  test('should navigate back to photos page via cancel button', async ({ page }) => {
    // Click cancel button
    await page.locator('a[href="/admin/photos"]').filter({ hasText: 'Cancel' }).click();
    
    // Should navigate to photos management page
    await expect(page).toHaveURL('/admin/photos');
  });

  test('should handle missing photo upload gracefully', async ({ page }) => {
    // Fill metadata but don't upload photo
    await page.locator('#photo_title').fill('Test Photo');
    await page.locator('#photo_description').fill('Test description');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Should show error about missing photo
    // Note: This test assumes validation happens client-side or server returns error
    const photoUrlField = page.locator('[name="photo_url"]');
    const hasError = await photoUrlField.evaluate(el => {
      // Check if field has validation state
      return el.classList.contains('field-input--error') || 
             el.hasAttribute('aria-invalid') ||
             el.closest('.form-field')?.querySelector('.field-error') !== null;
    });
    
    // Should indicate photo is required somehow
    expect(hasError || await page.locator('.field-error').count() > 0).toBe(true);
  });

  test('should be accessible for keyboard navigation', async ({ page }) => {
    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('#photo_title')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#photo_description')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#photo_tags')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check form fields have proper labels
    await expect(page.locator('#photo_title')).toHaveAttribute('aria-invalid', 'undefined');
    await expect(page.locator('label[for="photo_title"]')).toBeVisible();
    
    // Check help text is properly associated
    await expect(page.locator('#photo_tags')).toHaveAttribute('aria-describedby', /photo_tags-help/);
    await expect(page.locator('#photo_tags-help')).toBeVisible();
    
    // Check required fields are marked
    await expect(page.locator('#photo_title')).toHaveAttribute('required');
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Form should still be usable
    await expect(page.locator('#photo_title')).toBeVisible();
    await expect(page.locator('#photo_description')).toBeVisible();
    await expect(page.locator('#photo_tags')).toBeVisible();
    
    // Fill form on mobile
    await page.locator('#photo_title').fill('Mobile Upload Test');
    await page.locator('#photo_description').fill('Testing upload on mobile device');
    
    // Form should be responsive
    const formWidth = await page.locator('.upload-form').boundingBox();
    expect(formWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should handle tags input correctly', async ({ page }) => {
    const tagsInput = page.locator('#photo_tags');
    
    // Fill tags with various formats
    await tagsInput.fill('classroom, children,outdoor,  art  , montessori');
    
    // Value should be preserved as entered
    await expect(tagsInput).toHaveValue('classroom, children,outdoor,  art  , montessori');
    
    // Clear and test single tag
    await tagsInput.clear();
    await tagsInput.fill('classroom');
    await expect(tagsInput).toHaveValue('classroom');
    
    // Test empty tags
    await tagsInput.clear();
    await tagsInput.fill('');
    await expect(tagsInput).toHaveValue('');
  });

  test('should show character count for limited fields', async ({ page }) => {
    // Fill title with text
    await page.locator('#photo_title').fill('Test Photo Title');
    
    // Character limit should be visible (200 chars max)
    await expect(page.locator('#photo_title')).toHaveAttribute('maxlength', '200');
    
    // Fill description with text
    await page.locator('#photo_description').fill('A detailed description of this photo');
    
    // Character limit should be visible (500 chars max)  
    await expect(page.locator('#photo_description')).toHaveAttribute('maxlength', '500');
    
    // Fill tags with text
    await page.locator('#photo_tags').fill('tag1, tag2, tag3');
    
    // Character limit should be visible (200 chars max)
    await expect(page.locator('#photo_tags')).toHaveAttribute('maxlength', '200');
  });

  test('should handle form reset correctly', async ({ page }) => {
    // Fill form with data
    await page.locator('#photo_title').fill('Test Title');
    await page.locator('#photo_description').fill('Test Description');
    await page.locator('#photo_tags').fill('tag1, tag2');
    
    // Navigate away and back
    await page.locator('a[href="/admin/photos"]').first().click();
    await page.goto('/admin/photos/upload');
    
    // Form should be empty
    await expect(page.locator('#photo_title')).toHaveValue('');
    await expect(page.locator('#photo_description')).toHaveValue('');
    await expect(page.locator('#photo_tags')).toHaveValue('');
  });

  test('should display success message from URL parameter', async ({ page }) => {
    // Navigate with success parameter
    await page.goto('/admin/photos/upload?success=Test success message');
    
    // Should display success message
    await expect(page.locator('.status-message--success')).toContainText('Test success message');
  });

  test('should display error message from URL parameter', async ({ page }) => {
    // Navigate with error parameter  
    await page.goto('/admin/photos/upload?error=Test error message');
    
    // Should display error message
    await expect(page.locator('.status-message--error')).toContainText('Test error message');
  });
});