/**
 * Playwright Configuration for QuickActions Testing
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = {
  testDir: './tests',
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5000 // 5 seconds for assertions
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        // Add any Chrome-specific settings
      },
    },

    {
      name: 'firefox',
      use: { 
        ...require('@playwright/test').devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: { 
        ...require('@playwright/test').devices['Desktop Safari'],
      },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...require('@playwright/test').devices['Pixel 5'],
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    port: 4322,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start dev server
  },
};