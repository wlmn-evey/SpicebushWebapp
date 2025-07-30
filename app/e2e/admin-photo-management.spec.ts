/**
 * E2E Tests for Admin Photo Management System
 * 
 * Tests the complete photo management workflow including:
 * - Photo listing and display
 * - Grid/list view switching
 * - Photo viewing modal
 * - Photo deletion
 * - Navigation and accessibility
 */

import { test, expect, Page } from '@playwright/test';

// Test data setup
const mockPhotos = [
  {
    id: '1',
    title: 'Classroom Activities',
    description: 'Children engaged in hands-on learning activities',
    filename: 'classroom-1.jpg',
    url: 'https://example.com/classroom-1.jpg',
    size: 2048000,
    mimetype: 'image/jpeg',
    tags: ['classroom', 'children', 'learning'],
    uploaded_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2', 
    title: 'Outdoor Play',
    description: 'Students enjoying outdoor playground time',
    filename: 'outdoor-play.jpg',
    url: 'https://example.com/outdoor-play.jpg',
    size: 3072000,
    mimetype: 'image/jpeg',
    tags: ['outdoor', 'playground', 'children'],
    uploaded_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    title: 'Art Project',
    description: null,
    filename: 'art-project.png',
    url: 'https://example.com/art-project.png',
    size: 1536000,
    mimetype: 'image/png',
    tags: ['art', 'creative'],
    uploaded_at: '2024-01-13T16:45:00Z'
  }
];

test.describe('Admin Photo Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      document.cookie = 'sbms-admin-auth=bypass; path=/';
    });

    // Mock API responses
    await page.route('**/api/cms/media', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPhotos.map(photo => ({
            id: photo.id,
            name: photo.filename,
            url: photo.url,
            path: photo.url
          })))
        });
      } else if (request.method() === 'DELETE') {
        const body = await request.postDataJSON();
        const photoId = body.id;
        
        // Find and remove the photo from mock data
        const index = mockPhotos.findIndex(p => p.id === photoId);
        if (index > -1) {
          mockPhotos.splice(index, 1);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Photo deleted successfully' })
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Photo not found' })
          });
        }
      }
    });

    // Navigate to photo management page
    await page.goto('/admin/photos');
  });

  test('should display photo management page with correct title and navigation', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Photo Management/);
    
    // Check header elements
    await expect(page.locator('h1')).toContainText('Photo Management');
    await expect(page.locator('.page-description')).toContainText('Manage your uploaded photos');
    
    // Check upload button
    const uploadButton = page.locator('a[href="/admin/photos/upload"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toContainText('Upload Photos');
  });

  test('should display statistics correctly', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('.stats-bar');
    
    // Check total files count
    const totalFiles = page.locator('.stat:has-text("Total Files") .stat-number');
    await expect(totalFiles).toContainText('3');
    
    // Check images count
    const imagesCount = page.locator('.stat:has-text("Images") .stat-number');
    await expect(imagesCount).toContainText('3');
    
    // Check storage stats
    const totalSize = page.locator('.stat:has-text("Total Size") .stat-number');
    await expect(totalSize).toBeVisible();
  });

  test('should display photos in grid view by default', async ({ page }) => {
    // Wait for photos to load
    await page.waitForSelector('.photos-grid');
    
    // Check that we have photo cards
    const photoCards = page.locator('.photo-card');
    await expect(photoCards).toHaveCount(3);
    
    // Check first photo details
    const firstCard = photoCards.first();
    await expect(firstCard.locator('.photo-title')).toContainText('Classroom Activities');
    await expect(firstCard.locator('.photo-description')).toContainText('Children engaged in hands-on learning');
    
    // Check tags are displayed
    const tags = firstCard.locator('.tag');
    await expect(tags).toHaveCount(3);
    await expect(tags.first()).toContainText('classroom');
  });

  test('should switch between grid and list views', async ({ page }) => {
    // Wait for photos to load
    await page.waitForSelector('.photos-grid');
    
    // Initially should be in grid view
    await expect(page.locator('.photos-grid')).toBeVisible();
    await expect(page.locator('#grid-view-btn')).toHaveClass(/btn--active/);
    
    // Switch to list view
    await page.locator('#list-view-btn').click();
    await expect(page.locator('.photos-list')).toBeVisible();
    await expect(page.locator('#list-view-btn')).toHaveClass(/btn--active/);
    await expect(page.locator('#grid-view-btn')).not.toHaveClass(/btn--active/);
    
    // Switch back to grid view
    await page.locator('#grid-view-btn').click();
    await expect(page.locator('.photos-grid')).toBeVisible();
    await expect(page.locator('#grid-view-btn')).toHaveClass(/btn--active/);
  });

  test('should open photo modal when view button is clicked', async ({ page }) => {
    // Wait for photos to load
    await page.waitForSelector('.photo-card');
    
    // Click on the first photo's view button
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();
    
    // Check modal is open
    const modal = page.locator('#photo-modal');
    await expect(modal).toHaveClass(/modal--open/);
    await expect(modal).toHaveAttribute('aria-hidden', 'false');
    
    // Check modal content
    await expect(modal.locator('.modal-title')).toContainText('Classroom Activities');
    await expect(modal.locator('.modal-image')).toHaveAttribute('src', 'https://example.com/classroom-1.jpg');
    
    // Check body scroll is disabled
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  });

  test('should close photo modal with close button', async ({ page }) => {
    // Open modal
    await page.waitForSelector('.photo-card');
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();
    
    // Wait for modal to open
    await expect(page.locator('#photo-modal')).toHaveClass(/modal--open/);
    
    // Close with close button
    await page.locator('.modal-close').click();
    
    // Check modal is closed
    await expect(page.locator('#photo-modal')).not.toHaveClass(/modal--open/);
    await expect(page.locator('#photo-modal')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('should close photo modal with backdrop click', async ({ page }) => {
    // Open modal
    await page.waitForSelector('.photo-card');
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();
    
    // Wait for modal to open
    await expect(page.locator('#photo-modal')).toHaveClass(/modal--open/);
    
    // Close with backdrop click
    await page.locator('.modal-backdrop').click();
    
    // Check modal is closed
    await expect(page.locator('#photo-modal')).not.toHaveClass(/modal--open/);
  });

  test('should close photo modal with Escape key', async ({ page }) => {
    // Open modal
    await page.waitForSelector('.photo-card');
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();
    
    // Wait for modal to open
    await expect(page.locator('#photo-modal')).toHaveClass(/modal--open/);
    
    // Close with Escape key
    await page.keyboard.press('Escape');
    
    // Check modal is closed
    await expect(page.locator('#photo-modal')).not.toHaveClass(/modal--open/);
  });

  test('should delete photo with confirmation', async ({ page }) => {
    // Wait for photos to load
    await page.waitForSelector('.photo-card');
    
    // Get initial photo count
    const initialCount = await page.locator('.photo-card').count();
    expect(initialCount).toBe(3);
    
    // Click delete button on first photo
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    
    // Mock the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Are you sure you want to delete');
      expect(dialog.message()).toContain('Classroom Activities');
      await dialog.accept();
    });
    
    await firstCard.locator('[data-delete-photo]').click();
    
    // Wait for deletion to complete and page to redirect
    await page.waitForURL(/.*success=Photo%20deleted%20successfully/);
    
    // Verify success message
    await expect(page.locator('.status-message--success')).toContainText('Photo deleted successfully');
  });

  test('should cancel photo deletion when user cancels confirmation', async ({ page }) => {
    // Wait for photos to load
    await page.waitForSelector('.photo-card');
    
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    
    // Mock the confirmation dialog - cancel deletion
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    await firstCard.locator('[data-delete-photo]').click();
    
    // Photo should still be visible
    await expect(page.locator('.photo-card')).toHaveCount(3);
    await expect(firstCard.locator('.photo-title')).toContainText('Classroom Activities');
  });

  test('should display empty state when no photos exist', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/cms/media', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Reload page
    await page.reload();
    
    // Check empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state h3')).toContainText('No Photos Yet');
    await expect(page.locator('.empty-state p')).toContainText('Upload your first photo');
    
    // Check upload button in empty state
    const uploadButton = page.locator('.empty-state a[href="/admin/photos/upload"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toContainText('Upload First Photo');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/cms/media', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Reload page
    await page.reload();
    
    // Check error message is displayed
    await expect(page.locator('.status-message--error')).toContainText('Failed to load photos');
  });

  test('should navigate to upload page from upload button', async ({ page }) => {
    // Click upload button
    await page.locator('a[href="/admin/photos/upload"]').click();
    
    // Check we're on upload page
    await expect(page).toHaveURL('/admin/photos/upload');
    await expect(page.locator('h1')).toContainText('Upload Photos');
  });

  test('should format file sizes correctly', async ({ page }) => {
    await page.waitForSelector('.photo-card');
    
    // Check that file sizes are formatted (not raw bytes)
    const metaItems = page.locator('.meta-item');
    const sizeElements = metaItems.filter({ hasText: /KB|MB|GB/ });
    await expect(sizeElements.first()).toBeVisible();
    
    // Should show formatted sizes like "2.00 MB", not raw bytes
    const sizeText = await sizeElements.first().textContent();
    expect(sizeText).toMatch(/\d+(\.\d+)?\s*(KB|MB|GB)/);
  });

  test('should format upload dates correctly', async ({ page }) => {
    await page.waitForSelector('.photo-card');
    
    // Check that dates are formatted nicely
    const dateElements = page.locator('.meta-item').filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ });
    await expect(dateElements.first()).toBeVisible();
    
    // Should show formatted dates like "Jan 15, 2024, 10:30 AM"
    const dateText = await dateElements.first().textContent();
    expect(dateText).toMatch(/\w{3}\s+\d{1,2},\s+\d{4}/);
  });

  test('should display photos without descriptions correctly', async ({ page }) => {
    await page.waitForSelector('.photo-card');
    
    // Find the art project photo (has no description)
    const artCard = page.locator('.photo-card').filter({ hasText: 'Art Project' });
    await expect(artCard).toBeVisible();
    
    // Should show title but no description
    await expect(artCard.locator('.photo-title')).toContainText('Art Project');
    await expect(artCard.locator('.photo-description')).not.toBeVisible();
  });

  test('should handle different file types with appropriate icons', async ({ page }) => {
    // Add a PDF file to mock data for this test
    await page.route('**/api/cms/media', async route => {
      const extendedMockPhotos = [
        ...mockPhotos,
        {
          id: '4',
          title: 'School Brochure',
          description: 'PDF brochure for the school',
          filename: 'brochure.pdf',
          url: 'https://example.com/brochure.pdf',
          size: 1048576,
          mimetype: 'application/pdf',
          tags: ['brochure'],
          uploaded_at: '2024-01-12T09:00:00Z'
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(extendedMockPhotos.map(photo => ({
          id: photo.id,
          name: photo.filename,
          url: photo.url,
          path: photo.url
        })))
      });
    });
    
    await page.reload();
    await page.waitForSelector('.photo-card');
    
    // Should have 4 cards now
    await expect(page.locator('.photo-card')).toHaveCount(4);
    
    // Check that PDF shows file icon instead of image
    const pdfCard = page.locator('.photo-card').filter({ hasText: 'School Brochure' });
    await expect(pdfCard.locator('.file-icon')).toBeVisible();
    await expect(pdfCard.locator('.file-type')).toContainText('PDF');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForSelector('.photo-card');
    
    // Should still show photos
    await expect(page.locator('.photo-card')).toHaveCount(3);
    
    // Check mobile-specific layout
    const photosGrid = page.locator('.photos-grid');
    await expect(photosGrid).toBeVisible();
    
    // Modal should work on mobile
    const firstCard = page.locator('.photo-card').first();
    await firstCard.locator('[data-photo-url]').click();
    
    await expect(page.locator('#photo-modal')).toHaveClass(/modal--open/);
    
    // Close modal
    await page.locator('.modal-close').click();
    await expect(page.locator('#photo-modal')).not.toHaveClass(/modal--open/);
  });
});