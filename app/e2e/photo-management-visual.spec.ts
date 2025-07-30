/**
 * Visual Regression Tests for Photo Management System
 * 
 * Tests visual consistency across different screen sizes and states:
 * - Screenshot comparisons
 * - Layout testing across devices
 * - State variations (empty, loading, error)
 * - Cross-browser consistency
 */

import { test, expect } from '@playwright/test';

// Mock photo data for consistent visual tests
const mockPhotos = [
  {
    id: '1',
    title: 'Classroom Activities',
    description: 'Children engaged in hands-on learning activities in our prepared environment',
    filename: 'classroom-activity.jpg',
    url: 'https://picsum.photos/400/300?random=1',
    size: 2048576,
    mimetype: 'image/jpeg',
    tags: ['classroom', 'children', 'learning', 'montessori'],
    uploaded_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Outdoor Play',
    description: 'Students enjoying outdoor playground time with natural materials',
    filename: 'outdoor-play.jpg',
    url: 'https://picsum.photos/400/300?random=2',
    size: 3145728,
    mimetype: 'image/jpeg',
    tags: ['outdoor', 'playground', 'children', 'nature'],
    uploaded_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    title: 'Art Project',
    description: null,
    filename: 'art-project.png',
    url: 'https://picsum.photos/400/300?random=3',
    size: 1572864,
    mimetype: 'image/png',
    tags: ['art', 'creative', 'expression'],
    uploaded_at: '2024-01-13T16:45:00Z'
  },
  {
    id: '4',
    title: 'Math Materials',
    description: 'Golden beads and other concrete math materials for hands-on learning',
    filename: 'math-materials.jpg',
    url: 'https://picsum.photos/400/300?random=4',
    size: 2621440,
    mimetype: 'image/jpeg',
    tags: ['math', 'materials', 'golden', 'beads'],
    uploaded_at: '2024-01-12T11:15:00Z'
  },
  {
    id: '5',
    title: 'Reading Corner',
    description: 'Cozy reading nook with carefully selected literature for independent reading',
    filename: 'reading-corner.jpg',
    url: 'https://picsum.photos/400/300?random=5',
    size: 1835008,
    mimetype: 'image/jpeg',
    tags: ['reading', 'literature', 'quiet', 'books'],
    uploaded_at: '2024-01-11T09:30:00Z'
  },
  {
    id: '6',
    title: 'Science Exploration',
    description: 'Children conducting simple experiments with everyday materials',
    filename: 'science-lab.jpg',
    url: 'https://picsum.photos/400/300?random=6',
    size: 2359296,
    mimetype: 'image/jpeg',
    tags: ['science', 'experiments', 'exploration', 'discovery'],
    uploaded_at: '2024-01-10T13:45:00Z'
  }
];

test.describe('Photo Management Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      document.cookie = 'sbms-admin-auth=bypass; path=/';
    });

    // Mock API with consistent data
    await page.route('**/api/cms/media', async route => {
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
    });

    // Ensure images load consistently by intercepting and serving placeholder
    await page.route('**/picsum.photos/**', async route => {
      const url = route.request().url();
      const size = url.match(/(\d+)x(\d+)/);
      const width = size ? size[1] : '400';
      const height = size ? size[2] : '300';
      
      // Create a consistent colored rectangle for each image
      const color = ['4A90E2', 'F5A623', '7ED321', 'D0021B', '9013FE', '50E3C2'][
        parseInt(url.slice(-1)) % 6
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#${color}"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="16">
              Photo ${url.slice(-1)}
            </text>
          </svg>
        `
      });
    });
  });

  test('photo management page - desktop grid view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    // Wait for photos to load
    await page.waitForSelector('.photo-card', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of full page
    await expect(page).toHaveScreenshot('photo-management-desktop-grid.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo management page - desktop list view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Switch to list view
    await page.locator('#list-view-btn').click();
    await page.waitForSelector('.photos-list');
    
    await expect(page).toHaveScreenshot('photo-management-desktop-list.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo management page - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('photo-management-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo management page - mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('photo-management-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo management page - empty state', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/cms/media', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.empty-state');
    
    await expect(page).toHaveScreenshot('photo-management-empty-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo management page - error state', async ({ page }) => {
    // Mock API error
    await page.route('**/api/cms/media', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.status-message--error');
    
    await expect(page).toHaveScreenshot('photo-management-error-state.png', {
      animations: 'disabled'
    });
  });

  test('photo viewer modal - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Open modal
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();
    
    // Wait for modal to open
    await page.waitForSelector('.modal--open');
    
    await expect(page).toHaveScreenshot('photo-viewer-modal-desktop.png', {
      animations: 'disabled'
    });
  });

  test('photo viewer modal - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Open modal
    const firstCard = page.locator('.photo-card').first();
    await firstCard.locator('[data-photo-url]').click();
    
    await page.waitForSelector('.modal--open');
    
    await expect(page).toHaveScreenshot('photo-viewer-modal-mobile.png', {
      animations: 'disabled'
    });
  });

  test('photo upload page - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos/upload');
    
    await page.waitForSelector('.upload-form');
    
    await expect(page).toHaveScreenshot('photo-upload-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo upload page - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/photos/upload');
    
    await page.waitForSelector('.upload-form');
    
    await expect(page).toHaveScreenshot('photo-upload-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo upload page - with form data', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos/upload');
    
    await page.waitForSelector('.upload-form');
    
    // Fill form fields
    await page.locator('#photo_title').fill('Beautiful Mountain Landscape');
    await page.locator('#photo_description').fill('A stunning view of snow-capped mountains during golden hour, perfect for inspiring nature appreciation in our students.');
    await page.locator('#photo_tags').fill('nature, mountains, landscape, inspiration, outdoor');
    
    await expect(page).toHaveScreenshot('photo-upload-filled-form.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo upload page - validation errors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Create a page with validation errors
    await page.goto('/admin/photos/upload');
    await page.waitForSelector('.upload-form');
    
    // Add validation error styling via JavaScript
    await page.evaluate(() => {
      // Simulate validation errors
      const titleField = document.querySelector('#photo_title') as HTMLInputElement;
      if (titleField) {
        titleField.classList.add('field-input--error');
        titleField.setAttribute('aria-invalid', 'true');
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = 'Photo title is required';
        errorDiv.setAttribute('role', 'alert');
        titleField.parentNode?.appendChild(errorDiv);
      }
      
      // Add missing photo error
      const photoSection = document.querySelector('.form-section');
      if (photoSection) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = 'Please upload a photo';
        errorDiv.setAttribute('role', 'alert');
        photoSection.appendChild(errorDiv);
      }
    });
    
    await expect(page).toHaveScreenshot('photo-upload-validation-errors.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('photo upload page - success message', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos/upload?success=Photo uploaded successfully! You can now manage it in the photo library.');
    
    await page.waitForSelector('.upload-form');
    
    await expect(page).toHaveScreenshot('photo-upload-success-message.png', {
      animations: 'disabled'
    });
  });

  test('statistics bar - various states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.stats-bar');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of just the stats bar
    await expect(page.locator('.stats-bar')).toHaveScreenshot('stats-bar-full.png', {
      animations: 'disabled'
    });
  });

  test('photo card hover states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Hover over first photo card
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    
    // Wait for hover animations
    await page.waitForTimeout(300);
    
    await expect(firstCard).toHaveScreenshot('photo-card-hover.png', {
      animations: 'disabled'
    });
  });

  test('dark mode compatibility', async ({ page }) => {
    // Simulate dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('photo-management-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ 
      colorScheme: 'dark',
      forcedColors: 'active'
    });
    
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('photo-management-high-contrast.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('print stylesheet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    
    await expect(page).toHaveScreenshot('photo-management-print.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('reduced motion preference', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ 
      reducedMotion: 'reduce'
    });
    
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    // Hover to trigger any animations
    await page.locator('.photo-card').first().hover();
    
    await expect(page).toHaveScreenshot('photo-management-reduced-motion.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('cross-browser consistency - webkit', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is only for WebKit/Safari');
    
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/photos');
    
    await page.waitForSelector('.photo-card');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('photo-management-webkit.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('loading state simulation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Mock slow API response
    await page.route('**/api/cms/media', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    });
    
    await page.goto('/admin/photos');
    
    // Capture loading state (before photos load)
    await expect(page).toHaveScreenshot('photo-management-loading.png', {
      animations: 'disabled'
    });
  });
});