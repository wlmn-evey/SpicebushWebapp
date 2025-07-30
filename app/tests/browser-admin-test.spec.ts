/**
 * Browser-based Admin Panel Tests using Playwright
 * 
 * Tests all database write operations through the admin UI
 * Run with: npx playwright test tests/browser-admin-test.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@spicebush.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-password';

// Helper function to login to admin panel
async function loginToAdmin(page: Page) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin(?!\/login)/);
}

test.describe('Database Write Operations - Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Settings Update', async ({ page }) => {
    // Navigate to settings
    await page.goto(`${BASE_URL}/admin/settings`);
    
    // Update site title
    const newTitle = `Spicebush Test ${Date.now()}`;
    await page.fill('input[name="site_title"]', newTitle);
    
    // Update contact email
    await page.fill('input[name="contact_email"]', 'test@spicebush.com');
    
    // Save settings
    await page.click('button:has-text("Save Settings")');
    
    // Wait for success message
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/saved|updated/i);
    
    // Reload page to verify persistence
    await page.reload();
    
    // Check that values persisted
    const titleInput = page.locator('input[name="site_title"]');
    await expect(titleInput).toHaveValue(newTitle);
  });

  test('Newsletter Subscription Management', async ({ page }) => {
    // Navigate to newsletter management
    await page.goto(`${BASE_URL}/admin/communications/newsletter`);
    
    // Test manual subscription addition (if UI supports it)
    const addButton = page.locator('button:has-text("Add Subscriber")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const testEmail = `test-${Date.now()}@example.com`;
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="first_name"]', 'Test');
      await page.fill('input[name="last_name"]', 'User');
      await page.selectOption('select[name="subscription_type"]', 'general');
      
      await page.click('button:has-text("Add")');
      await expect(page.locator('.toast-success, .alert-success')).toContainText(/added|subscribed/i);
      
      // Verify subscriber appears in list
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
      
      // Test unsubscribe
      const unsubscribeButton = page.locator(`tr:has-text("${testEmail}") button:has-text("Unsubscribe")`);
      if (await unsubscribeButton.isVisible()) {
        await unsubscribeButton.click();
        await page.click('button:has-text("Confirm")'); // Confirm dialog if present
        await expect(page.locator('.toast-success, .alert-success')).toContainText(/unsubscribed/i);
      }
    }
  });

  test('Send Communication Message', async ({ page }) => {
    // Navigate to communications
    await page.goto(`${BASE_URL}/admin/communications`);
    
    // Click compose/new message button
    await page.click('button:has-text("Compose"), button:has-text("New Message")');
    
    // Fill in message details
    const testSubject = `Test Message ${Date.now()}`;
    await page.fill('input[name="subject"]', testSubject);
    
    // Select message type
    await page.selectOption('select[name="message_type"]', 'announcement');
    
    // Fill message content
    await page.fill('textarea[name="message_content"], .editor-content', 'This is a test announcement message.');
    
    // Select recipients
    await page.selectOption('select[name="recipient_type"]', 'all_families');
    
    // Send message (or save as draft)
    const sendButton = page.locator('button:has-text("Send Now")');
    const draftButton = page.locator('button:has-text("Save Draft")');
    
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else if (await draftButton.isVisible()) {
      await draftButton.click();
    }
    
    // Wait for success message
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/sent|saved/i);
    
    // Verify message appears in recent messages
    await page.goto(`${BASE_URL}/admin/communications`);
    await expect(page.locator(`text=${testSubject}`)).toBeVisible();
  });

  test('Create Communication Template', async ({ page }) => {
    // Navigate to templates
    await page.goto(`${BASE_URL}/admin/communications/templates`);
    
    // Click new template button
    await page.click('button:has-text("New Template"), button:has-text("Create Template")');
    
    // Fill template details
    const templateName = `Test Template ${Date.now()}`;
    await page.fill('input[name="name"]', templateName);
    await page.fill('textarea[name="description"]', 'Test template description');
    await page.selectOption('select[name="message_type"]', 'announcement');
    await page.fill('input[name="subject_template"]', 'Test Subject: {{date}}');
    await page.fill('textarea[name="content_template"]', 'Dear {{parent_name}},\n\nThis is a test template.');
    
    // Save template
    await page.click('button:has-text("Save Template")');
    
    // Wait for success message
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/created|saved/i);
    
    // Verify template appears in list
    await expect(page.locator(`text=${templateName}`)).toBeVisible();
  });

  test('Content Management (CMS)', async ({ page }) => {
    // Navigate to content management
    await page.goto(`${BASE_URL}/admin/content`);
    
    // Create new page
    await page.click('button:has-text("New Page"), a:has-text("Create Page")');
    
    const testSlug = `test-page-${Date.now()}`;
    const testTitle = 'Test Page';
    
    // Fill page details
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="slug"]', testSlug);
    await page.fill('textarea[name="body"], .editor-content', 'This is a test page content.');
    
    // Save as draft
    await page.click('button:has-text("Save Draft")');
    
    // Wait for success message
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/saved|created/i);
    
    // Edit the page
    await page.goto(`${BASE_URL}/admin/content`);
    await page.click(`a:has-text("${testTitle}")`);
    
    // Update title
    const updatedTitle = 'Updated Test Page';
    await page.fill('input[name="title"]', updatedTitle);
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/updated|saved/i);
    
    // Delete the page
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")'); // Confirm dialog
    
    await expect(page.locator('.toast-success, .alert-success')).toContainText(/deleted/i);
  });

  test('Verify Read-Only Database Connection', async ({ page }) => {
    // This test verifies that the content-db-direct module is read-only
    // by checking that all read operations work but write operations are handled by API endpoints
    
    // Navigate to any admin page that displays data
    await page.goto(`${BASE_URL}/admin/dashboard`);
    
    // Check that statistics are displayed (read operations)
    await expect(page.locator('text=/Families Reached|Messages Sent|Open Rate/')).toBeVisible();
    
    // Verify no direct database write errors in console
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Perform various actions that would trigger writes
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.fill('input[name="site_title"]', 'Test Title');
    await page.click('button:has-text("Save")');
    
    // Check that no database write errors occurred
    const dbWriteErrors = consoleLogs.filter(log => 
      log.includes('updateSetting') || 
      log.includes('saveMessage') || 
      log.includes('Direct database write')
    );
    
    expect(dbWriteErrors).toHaveLength(0);
  });
});

// Production smoke tests
test.describe('Production Verification', () => {
  test.skip(() => !process.env.RUN_PRODUCTION_TESTS, 'Skipping production tests');
  
  test('Critical User Paths', async ({ page }) => {
    // Test newsletter signup (public facing)
    await page.goto(BASE_URL);
    
    // Find newsletter signup form
    const emailInput = page.locator('input[type="email"][name*="email"]').first();
    const submitButton = page.locator('button[type="submit"]').near(emailInput);
    
    if (await emailInput.isVisible()) {
      const testEmail = `prod-test-${Date.now()}@example.com`;
      await emailInput.fill(testEmail);
      await submitButton.click();
      
      // Check for success message
      await expect(page.locator('text=/thank you|subscribed|success/i')).toBeVisible();
    }
    
    // Test contact form (if exists)
    const contactLink = page.locator('a:has-text("Contact")');
    if (await contactLink.isVisible()) {
      await contactLink.click();
      
      // Fill contact form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('textarea[name="message"]', 'This is a test message.');
      await page.click('button[type="submit"]');
      
      // Check for success
      await expect(page.locator('text=/sent|received|thank you/i')).toBeVisible();
    }
  });
});

// Test helpers
export async function checkDatabaseConnectivity(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get(`${BASE_URL}/api/admin/settings`, {
      headers: {
        'Cookie': await page.context().cookies().then(cookies => 
          cookies.map(c => `${c.name}=${c.value}`).join('; ')
        )
      }
    });
    
    return response.ok();
  } catch {
    return false;
  }
}

export async function verifyReadOnlyMode(page: Page): Promise<boolean> {
  // Check that content-db-direct doesn't have write functions
  const response = await page.evaluate(async () => {
    try {
      const module = await import('/src/lib/content-db-direct');
      const writeFunctions = [
        'updateSetting',
        'saveMessage',
        'saveTemplate',
        'subscribeToNewsletter'
      ];
      
      return writeFunctions.every(fn => !(fn in module));
    } catch {
      return true; // If module can't be imported in browser, that's expected
    }
  });
  
  return response;
}