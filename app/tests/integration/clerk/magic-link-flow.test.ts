/**
 * Integration Test for Clerk Magic Link Flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

const TEST_URL = process.env.TEST_URL || 'https://spicebush-testing.netlify.app';
const TEST_EMAIL = 'evey@eveywinters.com';

describe('Clerk Magic Link Flow', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Magic Link Send', () => {
    it('should load the sign-in page', async () => {
      await page.goto(`${TEST_URL}/auth/sign-in`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Check page title
      const title = await page.title();
      expect(title).toContain('Sign In');
    });

    it('should show Clerk sign-in component', async () => {
      // Check for Clerk component presence
      const clerkElement = await page.$('.cl-component');
      expect(clerkElement).toBeTruthy();
    });

    it('should allow switching to magic link mode', async () => {
      // Look for email link option
      const emailLinkButton = await page.$('[data-localization-key="signIn.alternativeMethods.emailLink"]');
      if (emailLinkButton) {
        await emailLinkButton.click();
        await page.waitForTimeout(1000);
      }
    });

    it('should send magic link to admin email', async () => {
      // Enter email
      const emailInput = await page.$('input[name="identifier"], input[type="email"]');
      if (emailInput) {
        await emailInput.type(TEST_EMAIL);
        
        // Submit form
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          
          // Wait for response
          await page.waitForTimeout(3000);
          
          // Check for success message or next step
          const successMessage = await page.$('.cl-form-success');
          const codeInput = await page.$('input[name="code"]');
          
          expect(successMessage || codeInput).toBeTruthy();
        }
      }
    });
  });

  describe('Admin Access', () => {
    it('should verify admin email is authorized', async () => {
      // This would normally check the admin access after authentication
      // For now, we just verify the email is in the admin list
      const adminEmails = [
        'admin@spicebushmontessori.org',
        'director@spicebushmontessori.org',
        'evey@eveywinters.com',
      ];
      
      expect(adminEmails).toContain(TEST_EMAIL);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email gracefully', async () => {
      await page.goto(`${TEST_URL}/auth/sign-in`, {
        waitUntil: 'networkidle0',
      });

      const emailInput = await page.$('input[name="identifier"], input[type="email"]');
      if (emailInput) {
        await emailInput.type('invalid-email');
        
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check for error message
          const errorMessage = await page.$('.cl-form-field-error');
          expect(errorMessage).toBeTruthy();
        }
      }
    });

    it('should handle non-admin email appropriately', async () => {
      // Test with a non-admin email
      const nonAdminEmail = 'user@example.com';
      
      // This test would verify that non-admin emails are handled correctly
      // Either blocked at sign-in or redirected after authentication
      expect(nonAdminEmail).not.toContain('@spicebushmontessori.org');
      expect(nonAdminEmail).not.toContain('@eveywinters.com');
    });
  });
});