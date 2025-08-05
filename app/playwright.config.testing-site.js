/**
 * Playwright Configuration for Testing Site Verification
 * This config runs tests against the testing site: https://spicebush-testing.netlify.app
 * 
 * Usage:
 * npx playwright test --config=playwright.config.testing-site.js
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // 60 seconds per test (testing site may be slower)
  expect: {
    timeout: 15000 // 15 seconds for assertions (allow for slower network)
  },
  fullyParallel: false, // Run sequentially to avoid overwhelming testing site
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries for testing site
  workers: 1, // Single worker to be gentle on testing site
  reporter: [
    ['html', { outputFolder: 'playwright-report-testing-site' }],
    ['json', { outputFile: 'test-results/testing-site-results.json' }]
  ],
  
  use: {
    baseURL: 'https://spicebush-testing.netlify.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Longer timeouts for potentially slower testing site
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chrome-testing-site',
      use: { 
        ...devices['Desktop Chrome'],
        // Testing site specific settings
        userAgent: 'PlaywrightTest/TestingSite Chrome'
      },
    },
    {
      name: 'firefox-testing-site',
      use: { 
        ...devices['Desktop Firefox'],
        userAgent: 'PlaywrightTest/TestingSite Firefox'
      },
    },
    {
      name: 'mobile-testing-site',
      use: { 
        ...devices['iPhone 12'],
        userAgent: 'PlaywrightTest/TestingSite Mobile'
      },
    },
  ],

  // Global setup for testing site verification
  globalSetup: './tests/setup/testing-site-setup.js',
});