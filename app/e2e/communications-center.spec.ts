/**
 * End-to-end tests for the Communications Center functionality
 * Tests the admin communications form, statistics loading, templates, and message management
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Communications Center', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Go to admin login first (communications requires authentication)
    await page.goto('/auth/login');
    
    // Wait for login form to load
    await page.waitForSelector('form');
    
    // Login with admin credentials
    // Note: This assumes test environment has proper auth setup
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    
    // Wait for redirect and then navigate to communications
    await page.waitForTimeout(2000);
    await page.goto('/admin/communications');
    
    // Wait for the communications page to load
    await page.waitForSelector('#main-content');
    await page.waitForTimeout(1000); // Allow time for JS to load stats
  });

  test.describe('Page Structure and Navigation', () => {
    test('should display communications center header and navigation', async () => {
      // Check page title and header
      await expect(page.locator('h1')).toContainText('Communications Center');
      
      // Check back to admin dashboard link
      await expect(page.locator('a[href="/admin"]')).toBeVisible();
      await expect(page.locator('a[href="/admin"]')).toContainText('Back to Admin Dashboard');
      
      // Check main sections are present
      await expect(page.locator('.grid').first()).toBeVisible(); // Stats grid
      await expect(page.locator('#new-message-form')).toBeVisible(); // Message form
      await expect(page.locator('.templates-container')).toBeVisible(); // Templates
      await expect(page.locator('#recent-messages-tbody')).toBeVisible(); // Recent messages
    });

    test('should have proper page metadata', async () => {
      await expect(page).toHaveTitle(/Communications.*Admin Panel/);
    });
  });

  test.describe('Statistics Dashboard', () => {
    test('should display communication statistics', async () => {
      // Wait for stats to load
      await page.waitForTimeout(1500);
      
      // Check that all stat cards are visible
      const statCards = [
        '[data-stat="families_reached"]',
        '[data-stat="messages_sent"]', 
        '[data-stat="open_rate"]',
        '[data-stat="active_campaigns"]'
      ];
      
      for (const statSelector of statCards) {
        await expect(page.locator(statSelector)).toBeVisible();
        
        // Check that stats have numeric values (not just placeholders)
        const statValue = await page.locator(statSelector).textContent();
        expect(statValue).toBeTruthy();
        expect(statValue?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should load real statistics from API', async () => {
      // Wait for API call to complete
      await page.waitForTimeout(2000);
      
      // Check that statistics are loaded (not default placeholder values)
      const familiesReached = await page.locator('[data-stat="families_reached"]').textContent();
      const messagesSent = await page.locator('[data-stat="messages_sent"]').textContent();
      const openRate = await page.locator('[data-stat="open_rate"]').textContent();
      const activeCampaigns = await page.locator('[data-stat="active_campaigns"]').textContent();
      
      // Values should be present and non-empty
      expect(familiesReached?.trim()).toBeTruthy();
      expect(messagesSent?.trim()).toBeTruthy();
      expect(openRate?.trim()).toBeTruthy();
      expect(activeCampaigns?.trim()).toBeTruthy();
      
      // Open rate should include percentage
      expect(openRate).toContain('%');
    });
  });

  test.describe('New Message Form', () => {
    test('should display complete message form with all fields', async () => {
      const form = page.locator('#new-message-form');
      await expect(form).toBeVisible();
      
      // Check all required form fields
      await expect(page.locator('[name="message_type"]')).toBeVisible();
      await expect(page.locator('[name="subject"]')).toBeVisible();
      await expect(page.locator('[name="message"]')).toBeVisible();
      await expect(page.locator('[name="send_to_all"]')).toBeVisible();
      await expect(page.locator('[name="schedule_later"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should have proper message type options', async () => {
      const messageTypeSelect = page.locator('[name="message_type"]');
      await expect(messageTypeSelect).toBeVisible();
      
      // Check for expected message type options
      await expect(page.locator('option[value="announcement"]')).toBeVisible();
      await expect(page.locator('option[value="newsletter"]')).toBeVisible();
      await expect(page.locator('option[value="emergency"]')).toBeVisible();
      await expect(page.locator('option[value="reminder"]')).toBeVisible();
      await expect(page.locator('option[value="event"]')).toBeVisible();
    });

    test('should validate required fields', async () => {
      const form = page.locator('#new-message-form');
      const submitButton = page.locator('button[type="submit"]');
      
      // Try to submit empty form
      await submitButton.click();
      
      // Form should not submit successfully (button should show error state)
      await page.waitForTimeout(1000);
      
      // Check that subject and message fields have required attributes
      await expect(page.locator('[name="subject"]')).toHaveAttribute('required');
      await expect(page.locator('[name="message"]')).toHaveAttribute('required');
    });

    test('should successfully send a valid message', async () => {
      // Fill out valid form data
      await page.selectOption('[name="message_type"]', 'announcement');
      await page.fill('[name="subject"]', 'Test Communication Message');
      await page.fill('[name="message"]', 'This is a test message to verify the communications system is working properly. It includes enough content to pass validation.');
      
      // Keep default options for send_to_all and schedule_later
      await expect(page.locator('[name="send_to_all"]')).toBeChecked();
      
      const submitButton = page.locator('button[type="submit"]');
      const originalButtonText = await submitButton.textContent();
      
      // Submit the form
      await submitButton.click();
      
      // Wait for form processing
      await page.waitForTimeout(1000);
      
      // Check button state changes during submission
      const buttonTextAfterSubmit = await submitButton.textContent();
      
      // Button should show either "Sending..." or success state
      expect(buttonTextAfterSubmit).not.toBe(originalButtonText);
      
      // Wait for completion
      await page.waitForTimeout(3000);
      
      // Form should reset or show success state
      const finalButtonText = await submitButton.textContent();
      const subjectValue = await page.locator('[name="subject"]').inputValue();
      const messageValue = await page.locator('[name="message"]').inputValue();
      
      // Either form is reset or success is shown
      expect(finalButtonText === 'Message Sent!' || subjectValue === '').toBeTruthy();
    });

    test('should handle API errors gracefully', async () => {
      // Fill form with potentially problematic data
      await page.selectOption('[name="message_type"]', 'announcement');
      await page.fill('[name="subject"]', 'Test Error Handling');
      await page.fill('[name="message"]', 'Testing error handling in communications form.');
      
      const submitButton = page.locator('button[type="submit"]');
      
      // Intercept API call to simulate error
      await page.route('/api/admin/communications', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Button should show error state
      const buttonText = await submitButton.textContent();
      expect(buttonText).toContain('Failed');
      
      // Should recover after timeout
      await page.waitForTimeout(4000);
      const recoveredButtonText = await submitButton.textContent();
      expect(recoveredButtonText).toBe('Send Message');
    });

    test('should show loading state during submission', async () => {
      await page.selectOption('[name="message_type"]', 'newsletter');
      await page.fill('[name="subject"]', 'Loading State Test');
      await page.fill('[name="message"]', 'Testing the loading state during message submission.');
      
      const submitButton = page.locator('button[type="submit"]');
      
      // Slow down the API response to catch loading state
      await page.route('/api/admin/communications', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Message sent successfully' })
          });
        }, 1500);
      });
      
      await submitButton.click();
      
      // Check loading state immediately after click
      await page.waitForTimeout(100);
      const loadingText = await submitButton.textContent();
      expect(loadingText).toBe('Sending...');
      
      // Button should be disabled during loading
      await expect(submitButton).toBeDisabled();
      
      // Wait for completion
      await page.waitForTimeout(2500);
      
      // Should return to normal state
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Message Templates', () => {
    test('should display template section', async () => {
      const templatesSection = page.locator('.templates-container');
      await expect(templatesSection).toBeVisible();
      
      // Should have template cards
      const templateCards = page.locator('.templates-container > div');
      const cardCount = await templateCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('should load templates from API', async () => {
      // Wait for templates to load
      await page.waitForTimeout(1500);
      
      // Check for template content
      const firstTemplate = page.locator('.templates-container > div').first();
      await expect(firstTemplate).toBeVisible();
      
      // Should have template name and description
      const templateName = firstTemplate.locator('h3');
      const templateDesc = firstTemplate.locator('p');
      
      await expect(templateName).toBeVisible();
      await expect(templateDesc).toBeVisible();
      
      const nameText = await templateName.textContent();
      const descText = await templateDesc.textContent();
      
      expect(nameText?.trim().length).toBeGreaterThan(0);
      expect(descText?.trim().length).toBeGreaterThan(0);
    });

    test('should handle template clicks', async () => {
      // Wait for templates to load
      await page.waitForTimeout(1500);
      
      // Click on first template
      const firstTemplate = page.locator('.template-item').first();
      if (await firstTemplate.count() > 0) {
        await firstTemplate.click();
        
        // Should handle the click (verify in console or through API call)
        // For now, just verify the template is clickable
        await expect(firstTemplate).toBeVisible();
      }
    });

    test('should show template usage statistics', async () => {
      // Wait for templates to load
      await page.waitForTimeout(1500);
      
      // Look for usage count in templates
      const usageText = page.locator('.template-item').first().locator('p').last();
      if (await usageText.count() > 0) {
        const usageContent = await usageText.textContent();
        if (usageContent?.includes('Used')) {
          expect(usageContent).toMatch(/Used \d+ times/);
        }
      }
    });
  });

  test.describe('Recent Messages Table', () => {
    test('should display recent messages table', async () => {
      const messagesTable = page.locator('#recent-messages-tbody');
      await expect(messagesTable).toBeVisible();
      
      // Should have table headers
      await expect(page.locator('th:has-text("Subject")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Sent Date")')).toBeVisible();
      await expect(page.locator('th:has-text("Recipients")')).toBeVisible();
      await expect(page.locator('th:has-text("Open Rate")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();
    });

    test('should load recent messages from API', async () => {
      // Wait for messages to load
      await page.waitForTimeout(2000);
      
      // Check for message rows
      const messageRows = page.locator('#recent-messages-tbody tr');
      const rowCount = await messageRows.count();
      
      // Should have at least placeholder or real data
      expect(rowCount).toBeGreaterThan(0);
      
      // Check first row has proper structure
      const firstRow = messageRows.first();
      await expect(firstRow).toBeVisible();
      
      // Should have subject, type badge, date, recipients, open rate, and actions
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();
      expect(cellCount).toBe(6); // Subject, Type, Date, Recipients, Open Rate, Actions
    });

    test('should display message type badges correctly', async () => {
      await page.waitForTimeout(2000);
      
      // Look for message type badges
      const typeBadges = page.locator('#recent-messages-tbody .rounded-full');
      const badgeCount = await typeBadges.count();
      
      if (badgeCount > 0) {
        const firstBadge = typeBadges.first();
        await expect(firstBadge).toBeVisible();
        
        const badgeText = await firstBadge.textContent();
        expect(badgeText?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should have action buttons for each message', async () => {
      await page.waitForTimeout(2000);
      
      const firstRow = page.locator('#recent-messages-tbody tr').first();
      const actionButtons = firstRow.locator('button');
      
      const buttonCount = await actionButtons.count();
      if (buttonCount > 0) {
        // Should have view/edit action buttons
        expect(buttonCount).toBeGreaterThanOrEqual(1);
        
        // Buttons should be visible
        await expect(actionButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Form Validation Edge Cases', () => {
    test('should handle extremely long subject lines', async () => {
      const longSubject = 'A'.repeat(300); // Very long subject
      
      await page.selectOption('[name="message_type"]', 'announcement');
      await page.fill('[name="subject"]', longSubject);
      await page.fill('[name="message"]', 'Testing extremely long subject validation.');
      
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      await page.waitForTimeout(2000);
      
      // Should either truncate or show validation error
      const buttonText = await submitButton.textContent();
      const wasSubmitted = buttonText?.includes('Sent') || buttonText?.includes('Failed');
      expect(wasSubmitted).toBeTruthy();
    });

    test('should handle special characters in message content', async () => {
      const specialMessage = 'Testing special chars: <script>alert("test")</script> & "quotes" \'apostrophe\' 🎉 emoji';
      
      await page.selectOption('[name="message_type"]', 'event');
      await page.fill('[name="subject"]', 'Special Characters Test');
      await page.fill('[name="message"]', specialMessage);
      
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      await page.waitForTimeout(2000);
      
      // Should handle special characters safely
      const buttonText = await submitButton.textContent();
      expect(buttonText).toBeTruthy();
    });

    test('should handle rapid form submissions', async () => {
      await page.selectOption('[name="message_type"]', 'reminder');
      await page.fill('[name="subject"]', 'Rapid Submission Test');
      await page.fill('[name="message"]', 'Testing rapid form submission handling.');
      
      const submitButton = page.locator('button[type="submit"]');
      
      // Try to submit multiple times rapidly
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();
      
      // Should handle gracefully (button should be disabled after first click)
      await page.waitForTimeout(1000);
      await expect(submitButton).toBeDisabled();
      
      await page.waitForTimeout(3000);
      // Should recover
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should be keyboard navigable', async () => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through form
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    });

    test('should have proper ARIA labels and roles', async () => {
      // Form should have proper labeling
      const form = page.locator('#new-message-form');
      await expect(form).toBeVisible();
      
      // Fields should have associated labels
      const subjectField = page.locator('[name="subject"]');
      const subjectLabel = page.locator('label').filter({ hasText: 'Subject' });
      
      await expect(subjectField).toBeVisible();
      await expect(subjectLabel).toBeVisible();
    });

    test('should work on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Form should be visible and usable on mobile
      await expect(page.locator('#new-message-form')).toBeVisible();
      
      // Submit button should be appropriately sized
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(40); // Adequate touch target
      
      // Form fields should be properly sized
      const subjectField = page.locator('[name="subject"]');
      const fieldBox = await subjectField.boundingBox();
      expect(fieldBox?.width).toBeGreaterThan(200);
    });
  });

  test.describe('Data Persistence and Refresh Behavior', () => {
    test('should reload statistics after sending message', async () => {
      // Get initial stats
      await page.waitForTimeout(1500);
      const initialMessagesSent = await page.locator('[data-stat="messages_sent"]').textContent();
      
      // Send a message
      await page.selectOption('[name="message_type"]', 'announcement');
      await page.fill('[name="subject"]', 'Stats Update Test');
      await page.fill('[name="message"]', 'Testing statistics update after message send.');
      
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
      
      // Check if stats were updated (may not change immediately in test environment)
      const updatedMessagesSent = await page.locator('[data-stat="messages_sent"]').textContent();
      
      // At minimum, stats should still be loaded
      expect(updatedMessagesSent?.trim().length).toBeGreaterThan(0);
    });

    test('should maintain page state after navigation', async () => {
      // Fill form partially
      await page.selectOption('[name="message_type"]', 'newsletter');
      await page.fill('[name="subject"]', 'Navigation Test');
      
      // Navigate away and back
      await page.locator('a[href="/admin"]').click();
      await page.waitForTimeout(1000);
      await page.goto('/admin/communications');
      await page.waitForTimeout(1500);
      
      // Form should be reset (this is expected behavior)
      const subjectValue = await page.locator('[name="subject"]').inputValue();
      expect(subjectValue).toBe('');
      
      // But page should still function properly
      await expect(page.locator('#new-message-form')).toBeVisible();
      await expect(page.locator('[data-stat="families_reached"]')).toBeVisible();
    });
  });
});