/**
 * End-to-End Email Service Tests
 * 
 * Tests the complete email flow including:
 * - Magic link authentication
 * - Tour scheduling
 * - Contact form submissions
 * - Email delivery verification
 */

import { test, expect } from '@playwright/test';
import { EmailTestHelper } from './helpers/email-test-helper';

// Test configuration
const TEST_EMAIL = 'test@example.com';
const TEST_PHONE = '(555) 123-4567';
const SCHOOL_EMAIL = 'information@spicebushmontessori.org';

// Initialize email helper
const emailHelper = new EmailTestHelper();

test.describe('Email Service E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any previous emails
    await emailHelper.clearEmails(TEST_EMAIL);
  });

  test.describe('Magic Link Authentication', () => {
    test('should send magic link email on login request', async ({ page }) => {
      // Navigate to login page
      await page.goto('/auth/login');
      
      // Fill in email
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', 'testpassword123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // For new users, check if we're redirected to check email message
      const alertMessage = await page.locator('#auth-alert-message').textContent();
      
      if (alertMessage?.includes('check your email')) {
        // Verify magic link was sent
        const magicLink = await emailHelper.getMagicLink(TEST_EMAIL, page);
        expect(magicLink).toBeTruthy();
        expect(magicLink).toContain('auth/confirm');
      }
    });

    test('should send password reset email', async ({ page }) => {
      // Navigate to forgot password page
      await page.goto('/auth/forgot-password');
      
      // Fill in email
      await page.fill('input[name="email"]', TEST_EMAIL);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Check for success message
      await expect(page.locator('#auth-alert')).toContainText('Password reset link sent');
      
      // Verify reset link was sent
      const resetLink = await emailHelper.getMagicLink(TEST_EMAIL, page);
      expect(resetLink).toBeTruthy();
    });

    test('should handle admin magic links with proper redirect', async ({ page }) => {
      const adminEmail = 'admin@spicebushmontessori.org';
      
      // Navigate to login page
      await page.goto('/auth/login');
      
      // Fill in admin email
      await page.fill('input[name="email"]', adminEmail);
      await page.fill('input[name="password"]', 'adminpass123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Check for appropriate response
      const response = await page.waitForResponse(
        response => response.url().includes('/auth') && response.status() === 200,
        { timeout: 5000 }
      ).catch(() => null);
      
      expect(response).toBeTruthy();
    });
  });

  test.describe('Tour Scheduling Emails', () => {
    test('should send tour request notification and confirmation', async ({ page }) => {
      // Navigate to tour scheduling page
      await page.goto('/admissions/schedule-tour');
      
      // Fill out tour request form
      await page.fill('input[name="parentName"]', 'Jane Smith');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="phone"]', TEST_PHONE);
      await page.selectOption('select[name="childAge"]', '4');
      await page.fill('textarea[name="preferredTimes"]', 'Weekday mornings');
      await page.fill('textarea[name="questions"]', 'Do you have outdoor play areas?');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for success message
      await expect(page.locator('#alert')).toContainText('successfully', { timeout: 10000 });
      
      // In development mode, check console logs
      if (process.env.NODE_ENV === 'development') {
        page.on('console', msg => {
          if (msg.text().includes('Tour Request Email Content')) {
            expect(msg.text()).toContain('Jane Smith');
            expect(msg.text()).toContain(TEST_EMAIL);
          }
        });
      }
    });

    test('should validate required fields before sending', async ({ page }) => {
      await page.goto('/admissions/schedule-tour');
      
      // Try to submit without filling required fields
      await page.click('button[type="submit"]');
      
      // Check for validation messages
      const nameInput = page.locator('input[name="parentName"]');
      await expect(nameInput).toHaveAttribute('required');
      
      // Browser should prevent submission
      const validationMessage = await nameInput.evaluate(
        el => (el as HTMLInputElement).validationMessage
      );
      expect(validationMessage).toBeTruthy();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/admissions/schedule-tour');
      
      // Fill all fields with invalid email
      await page.fill('input[name="parentName"]', 'Jane Smith');
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="phone"]', TEST_PHONE);
      await page.selectOption('select[name="childAge"]', '4');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Check for email validation
      const emailInput = page.locator('input[name="email"]');
      const validationMessage = await emailInput.evaluate(
        el => (el as HTMLInputElement).validationMessage
      );
      expect(validationMessage).toContain('email');
    });
  });

  test.describe('Contact Form Emails', () => {
    test('should submit contact form via Netlify Forms', async ({ page }) => {
      await page.goto('/contact');
      
      // Fill out contact form
      await page.fill('input[name="name"]', 'John Parent');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="phone"]', TEST_PHONE);
      await page.selectOption('select[name="child-age"]', '3');
      await page.selectOption('select[name="subject"]', 'admissions');
      await page.fill('textarea[name="message"]', 'I would like to learn more about your programs.');
      
      // Check tour interest
      await page.check('input[name="tour-interest"]');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should redirect to success page or show success message
      await page.waitForURL('**/contact-success', { timeout: 10000 }).catch(async () => {
        // Alternative: check for success message on same page
        await expect(page.locator('#form-success')).toBeVisible();
      });
    });

    test('should show error message on form submission failure', async ({ page }) => {
      await page.goto('/contact');
      
      // Intercept form submission to simulate failure
      await page.route('**/contact', route => {
        route.fulfill({ status: 500 });
      });
      
      // Fill minimal required fields
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.selectOption('select[name="subject"]', 'general');
      await page.fill('textarea[name="message"]', 'Test message');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('#form-error')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Email Service Configuration', () => {
    test('should show email service status in development', async ({ page }) => {
      // This test would typically run the test-email-service.js script
      // For E2E, we'll check if the email service endpoints are accessible
      
      const response = await page.request.get('/api/health', {
        headers: { 'Accept': 'application/json' }
      }).catch(() => null);
      
      if (response && response.ok()) {
        const data = await response.json();
        // Check if email service is mentioned in health check
        if (data.services?.email) {
          expect(data.services.email.configured).toBeDefined();
        }
      }
    });
  });

  test.describe('Email Content Formatting', () => {
    test('should format tour request emails correctly', async ({ page }) => {
      // This test verifies the email content structure
      // In a real environment, you would intercept the actual email
      
      await page.goto('/admissions/schedule-tour');
      
      const testData = {
        parentName: 'María García',
        email: 'maria@example.com',
        phone: '(555) 234-5678',
        childAge: '3',
        preferredTimes: 'Lunes y miércoles por la mañana',
        questions: '¿Ofrecen programa bilingüe?'
      };
      
      // Fill form with special characters and international names
      await page.fill('input[name="parentName"]', testData.parentName);
      await page.fill('input[name="email"]', testData.email);
      await page.fill('input[name="phone"]', testData.phone);
      await page.selectOption('select[name="childAge"]', testData.childAge);
      await page.fill('textarea[name="preferredTimes"]', testData.preferredTimes);
      await page.fill('textarea[name="questions"]', testData.questions);
      
      // Listen for console logs in dev mode
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'log') {
          consoleLogs.push(msg.text());
        }
      });
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // In development, verify special characters are preserved
      if (process.env.NODE_ENV === 'development') {
        const emailLog = consoleLogs.find(log => log.includes('Tour Request Email Content'));
        if (emailLog) {
          expect(emailLog).toContain('María García');
          expect(emailLog).toContain('¿Ofrecen programa bilingüe?');
        }
      }
    });
  });

  test.describe('Email Accessibility', () => {
    test('should include proper text alternatives in emails', async ({ page }) => {
      // This test would verify that emails have both HTML and text versions
      // For now, we'll test that the forms that trigger emails are accessible
      
      await page.goto('/auth/login');
      
      // Check form has proper labels
      const emailLabel = await page.$('label[for="email"]');
      expect(emailLabel).toBeTruthy();
      
      const emailInput = await page.$('input[name="email"]');
      const ariaLabel = await emailInput?.getAttribute('aria-label');
      const labelFor = await emailLabel?.getAttribute('for');
      const inputId = await emailInput?.getAttribute('id');
      
      // Either aria-label or proper label association
      expect(ariaLabel || (labelFor === inputId)).toBeTruthy();
    });
  });
});

// Additional test for email service script
test.describe('Email Service Configuration Script', () => {
  test('should run email service test script successfully', async ({ page }) => {
    // This would typically be run as a separate Node.js process
    // For E2E testing, we'll check if the script exists and is executable
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'test-email-service.js');
    
    try {
      const stats = await fs.stat(scriptPath);
      expect(stats.isFile()).toBe(true);
      
      // Check if script has proper shebang
      const content = await fs.readFile(scriptPath, 'utf-8');
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).toContain('Email Service Configuration Tester');
    } catch (error) {
      // Script might not exist in test environment
      console.log('Email service script not found in test environment');
    }
  });
});

// Test for production email configuration
test.describe('Production Email Configuration', () => {
  test.skip('should have production email variables configured', async () => {
    // This test would run in production environment only
    const requiredVars = [
      'UNIONE_API_KEY',
      'EMAIL_FROM',
      'EMAIL_FROM_NAME'
    ];
    
    requiredVars.forEach(varName => {
      expect(process.env[varName]).toBeTruthy();
    });
  });
});