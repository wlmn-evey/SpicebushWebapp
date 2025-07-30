/**
 * ImageUpload Integration Tests
 * 
 * Browser-based integration tests for the ImageUpload component
 * Testing real browser interactions, file uploads, and form integration
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:4321';
const TEST_TIMEOUT = 30000;

// Helper to create test image files
async function createTestImage(filename: string, sizeKB: number = 100): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-assets');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, filename);
  
  // Create a simple PNG image buffer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x02, 0x00, // Width: 512
    0x00, 0x00, 0x02, 0x00, // Height: 512
    0x08, 0x02, // Bit depth and color type
    0x00, 0x00, 0x00, // Compression, filter, interlace
  ]);
  
  // Create buffer of desired size
  const totalSize = sizeKB * 1024;
  const buffer = Buffer.alloc(totalSize);
  pngHeader.copy(buffer);
  
  // Fill rest with random data
  for (let i = pngHeader.length; i < totalSize; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Helper to clean up test files
async function cleanupTestFiles() {
  const testDir = path.join(process.cwd(), 'test-assets');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

test.describe('ImageUpload Component Integration', () => {
  test.beforeAll(async () => {
    // Create test images
    await createTestImage('valid-image.png', 100);
    await createTestImage('large-image.png', 11000); // 11MB
    await createTestImage('small-image.jpg', 50);
  });

  test.afterAll(async () => {
    await cleanupTestFiles();
  });

  test.describe('Blog Editor Integration', () => {
    test('should upload image in blog editor', async ({ page }) => {
      // Navigate to blog editor
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      
      // Wait for the form to load
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Upload a valid image
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for upload to complete
      await page.waitForSelector('.upload-progress--visible', { timeout: 5000 });
      
      // Verify progress tracking
      const progressText = await page.locator('[data-progress-text]');
      await expect(progressText).toContainText('%');
      
      // Wait for upload to finish
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Verify image preview is shown
      const preview = await page.locator('.upload-preview-image');
      await expect(preview).toBeVisible();
      
      // Verify remove button appears
      const removeBtn = await page.locator('[data-remove-button]');
      await expect(removeBtn).toBeVisible();
      
      // Verify hidden input has value
      const valueInput = await page.locator('input[name="featuredImage"]');
      const uploadedValue = await valueInput.inputValue();
      expect(uploadedValue).toBeTruthy();
      expect(uploadedValue).toContain('/uploads/');
    });

    test('should handle drag and drop upload', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const dropzone = await page.locator('.upload-dropzone');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      // Create DataTransfer and dispatch drag events
      await page.evaluate(async () => {
        const dropzone = document.querySelector('.upload-dropzone') as HTMLElement;
        
        // Simulate dragover
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dropzone.dispatchEvent(dragOverEvent);
        
        // Check dragover class was added
        return dropzone.classList.contains('upload-dropzone--dragover');
      }).then(result => expect(result).toBe(true));
      
      // Drop the file
      await dropzone.dispatchEvent('drop', {
        dataTransfer: {
          files: [testImagePath]
        }
      });
      
      // Wait for upload
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Verify upload succeeded
      const preview = await page.locator('.upload-preview-image');
      await expect(preview).toBeVisible();
    });

    test('should validate file size', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const fileInput = await page.locator('input[type="file"]');
      const largeImagePath = path.join(process.cwd(), 'test-assets', 'large-image.png');
      
      await fileInput.setInputFiles(largeImagePath);
      
      // Wait for error message
      await page.waitForSelector('.upload-error--visible', { timeout: 5000 });
      
      const errorEl = await page.locator('[data-error]');
      const errorText = await errorEl.textContent();
      
      expect(errorText).toContain('File is too large');
      expect(errorText).toContain('10MB');
    });

    test('should validate file type', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Create a text file
      const testDir = path.join(process.cwd(), 'test-assets');
      const textFilePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');
      
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(textFilePath);
      
      // Wait for error message
      await page.waitForSelector('.upload-error--visible', { timeout: 5000 });
      
      const errorEl = await page.locator('[data-error]');
      const errorText = await errorEl.textContent();
      
      expect(errorText).toContain('valid image file');
      expect(errorText).toMatch(/JPG|PNG|WebP|GIF/);
    });

    test('should remove uploaded image', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Upload an image first
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Click remove button
      const removeBtn = await page.locator('[data-remove-button]');
      await removeBtn.click();
      
      // Verify image was removed
      await expect(page.locator('.upload-preview')).not.toBeVisible();
      await expect(page.locator('.upload-empty')).toBeVisible();
      
      // Verify value was cleared
      const valueInput = await page.locator('input[name="featuredImage"]');
      const value = await valueInput.inputValue();
      expect(value).toBe('');
    });
  });

  test.describe('Staff Editor Integration', () => {
    test('should upload staff photo', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/staff/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for upload
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Verify upload succeeded
      const preview = await page.locator('.upload-preview-image');
      await expect(preview).toBeVisible();
      
      // Verify form can be submitted with image
      const submitBtn = await page.locator('button[type="submit"]');
      await expect(submitBtn).toBeEnabled();
    });
  });

  test.describe('Error Handling', () => {
    test('should show user-friendly error for network failure', async ({ page }) => {
      // Block the upload endpoint
      await page.route('**/api/media/upload', route => {
        route.abort('failed');
      });
      
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for error
      await page.waitForSelector('.upload-error--visible', { timeout: 10000 });
      
      const errorEl = await page.locator('[data-error]');
      const errorText = await errorEl.textContent();
      
      expect(errorText).toContain('Network error');
    });

    test('should show authentication error', async ({ page }) => {
      // Mock 401 response
      await page.route('**/api/media/upload', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });
      
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for error
      await page.waitForSelector('.upload-error--visible', { timeout: 10000 });
      
      const errorEl = await page.locator('[data-error]');
      const errorText = await errorEl.textContent();
      
      expect(errorText).toContain('logged in');
    });

    test('should show server error with custom message', async ({ page }) => {
      // Mock 500 response with custom error
      await page.route('**/api/media/upload', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      });
      
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for error
      await page.waitForSelector('.upload-error--visible', { timeout: 10000 });
      
      const errorEl = await page.locator('[data-error]');
      const errorText = await errorEl.textContent();
      
      expect(errorText).toBe('Database connection failed');
    });
  });

  test.describe('Progress Tracking', () => {
    test('should show accurate upload progress', async ({ page }) => {
      let progressValues: number[] = [];
      
      // Intercept and slow down upload to capture progress
      await page.route('**/api/media/upload', async route => {
        // Simulate slow upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ url: '/uploads/test-image.jpg' })
        });
      });
      
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Monitor progress updates
      page.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('Uploading...')) {
          const match = msg.text().match(/(\d+)%/);
          if (match) {
            progressValues.push(parseInt(match[1]));
          }
        }
      });
      
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for upload to complete
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Verify progress bar was visible
      const progressBar = await page.locator('[data-progress-bar]');
      const finalWidth = await progressBar.evaluate(el => el.style.width);
      
      // Progress should have reached 100%
      expect(finalWidth).toBe('100%');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Tab to file input
      await page.keyboard.press('Tab');
      
      // The file input should be focusable through the label
      const fileInput = await page.locator('input[type="file"]');
      
      // Trigger file selection with Enter/Space
      await page.keyboard.press('Enter');
      
      // File dialog would open in real scenario
      // For testing, we'll directly set the file
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
      
      // Tab to remove button and activate it
      const removeBtn = await page.locator('[data-remove-button]');
      await removeBtn.focus();
      await page.keyboard.press('Enter');
      
      // Verify image was removed
      await expect(page.locator('.upload-empty')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/blog/edit`);
      await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
      
      // Check error role
      const errorEl = await page.locator('[data-error]');
      const errorRole = await errorEl.getAttribute('role');
      expect(errorRole).toBe('alert');
      
      // Upload an image to get remove button
      const fileInput = await page.locator('input[type="file"]');
      const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
      
      await fileInput.setInputFiles(testImagePath);
      await page.waitForSelector('[data-remove-button]', { timeout: TEST_TIMEOUT });
      
      // Check remove button aria-label
      const removeBtn = await page.locator('[data-remove-button]');
      const ariaLabel = await removeBtn.getAttribute('aria-label');
      expect(ariaLabel).toBe('Remove image');
    });
  });
});

test.describe('Multiple Upload Scenarios', () => {
  test('should handle rapid successive uploads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/blog/edit`);
    await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
    
    const fileInput = await page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
    
    // Upload first image
    await fileInput.setInputFiles(testImagePath);
    await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
    
    // Immediately upload another
    await fileInput.setInputFiles(testImagePath);
    
    // Should replace the first upload
    await page.waitForTimeout(1000);
    
    // Verify only one image is shown
    const previews = await page.locator('.upload-preview').count();
    expect(previews).toBe(1);
  });

  test('should maintain state across form validation errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/blog/edit`);
    await page.waitForSelector('.image-upload', { timeout: TEST_TIMEOUT });
    
    // Upload an image
    const fileInput = await page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), 'test-assets', 'valid-image.png');
    
    await fileInput.setInputFiles(testImagePath);
    await page.waitForSelector('.upload-preview', { timeout: TEST_TIMEOUT });
    
    // Get the uploaded value
    const valueInput = await page.locator('input[name="featuredImage"]');
    const uploadedValue = await valueInput.inputValue();
    
    // Submit form without required fields to trigger validation
    const submitBtn = await page.locator('button[type="submit"]');
    await submitBtn.click();
    
    // Wait for validation errors
    await page.waitForTimeout(500);
    
    // Verify image is still there
    const currentValue = await valueInput.inputValue();
    expect(currentValue).toBe(uploadedValue);
    
    const preview = await page.locator('.upload-preview-image');
    await expect(preview).toBeVisible();
  });
});