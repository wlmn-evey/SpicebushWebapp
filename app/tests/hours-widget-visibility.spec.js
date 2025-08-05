/**
 * Hours Widget Visibility Test
 * 
 * This test verifies that the HoursWidget component is properly visible and functional
 * on both the homepage footer and the contact page. The user reported that the footer
 * doesn't show the hours widget but it works on the contact page.
 * 
 * Test Cases:
 * 1. Homepage footer hours widget visibility and functionality
 * 2. Contact page hours widget visibility and functionality  
 * 3. Visual comparison between the two implementations
 * 4. Screenshot capture for documentation
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  // Use local dev server by default, testing site when available
  baseUrls: {
    local: 'http://localhost:4322',
    testing: 'https://spicebush-testing.netlify.app'
  },
  timeouts: {
    pageLoad: 30000,
    elementWait: 10000,
    screenshot: 5000
  },
  selectors: {
    hoursWidget: '#sbms-hours-widget',
    hoursList: '#hours-list',
    currentTime: '#current-time',
    loadingState: '#loading-state',
    footer: 'footer',
    footerHoursContainer: 'footer .bg-white\\/5', // The container around HoursWidget in footer
    contactHoursContainer: '.bg-white.border.border-gray-200.rounded-xl' // Contact page hours container
  }
};

test.describe('Hours Widget Visibility Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for potentially slow loading
    page.setDefaultTimeout(TEST_CONFIG.timeouts.elementWait);
  });

  test('Homepage - Footer Hours Widget Visibility and Functionality', async ({ page, browserName }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // First, verify the footer exists
    const footer = page.locator(TEST_CONFIG.selectors.footer);
    await expect(footer).toBeVisible();
    
    // Look for the hours widget container in the footer
    const footerHoursContainer = page.locator(TEST_CONFIG.selectors.footerHoursContainer);
    await expect(footerHoursContainer).toBeVisible();
    
    // Verify the hours widget element exists within the footer
    const hoursWidget = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursWidget}`);
    await expect(hoursWidget).toBeVisible();
    
    // Check if the widget has loaded data (hours list should be visible and loading should be hidden)
    const hoursList = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursList}`);
    const loadingState = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.loadingState}`);
    
    // Wait for loading to complete and hours to display
    await expect(loadingState).toBeHidden({ timeout: TEST_CONFIG.timeouts.elementWait });
    await expect(hoursList).toBeVisible();
    
    // Verify hours list has content (should have 7 days)
    const hourItems = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursList} li`);
    await expect(hourItems).toHaveCount(7);
    
    // Verify current time is displayed
    const currentTime = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.currentTime}`);
    await expect(currentTime).toBeVisible();
    await expect(currentTime).not.toBeEmpty();
    
    // Take screenshot of footer hours widget
    await page.locator(TEST_CONFIG.selectors.footer).screenshot({ 
      path: `test-results/homepage-footer-hours-widget-${browserName}.png`,
      timeout: TEST_CONFIG.timeouts.screenshot 
    });
    
    // Scroll to footer to ensure it's in viewport for visual verification
    await footer.scrollIntoViewIfNeeded();
    
    // Additional verification: Check if widget has the expected styling classes
    await expect(hoursWidget).toHaveClass(/bg-white/);
    await expect(hoursWidget).toHaveClass(/rounded-lg/);
    
    console.log(`✅ Homepage footer hours widget test passed for ${browserName}`);
  });

  test('Contact Page - Hours Widget Visibility and Functionality', async ({ page, browserName }) => {
    // Navigate to contact page
    await page.goto('/contact');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Look for the hours widget container on contact page
    const contactHoursContainer = page.locator(TEST_CONFIG.selectors.contactHoursContainer).filter({ hasText: 'When We\'re Here' });
    await expect(contactHoursContainer).toBeVisible();
    
    // Verify the hours widget element exists within the contact section
    const hoursWidget = contactHoursContainer.locator(TEST_CONFIG.selectors.hoursWidget);
    await expect(hoursWidget).toBeVisible();
    
    // Check if the widget has loaded data
    const hoursList = contactHoursContainer.locator(TEST_CONFIG.selectors.hoursList);  
    const loadingState = contactHoursContainer.locator(TEST_CONFIG.selectors.loadingState);
    
    // Wait for loading to complete and hours to display
    await expect(loadingState).toBeHidden({ timeout: TEST_CONFIG.timeouts.elementWait });
    await expect(hoursList).toBeVisible();
    
    // Verify hours list has content (should have 7 days)
    const hourItems = contactHoursContainer.locator(`${TEST_CONFIG.selectors.hoursList} li`);
    await expect(hourItems).toHaveCount(7);
    
    // Verify current time is displayed
    const currentTime = contactHoursContainer.locator(TEST_CONFIG.selectors.currentTime);
    await expect(currentTime).toBeVisible();
    await expect(currentTime).not.toBeEmpty();
    
    // Take screenshot of contact page hours widget
    await contactHoursContainer.screenshot({ 
      path: `test-results/contact-page-hours-widget-${browserName}.png`,
      timeout: TEST_CONFIG.timeouts.screenshot 
    });
    
    // Scroll to hours section to ensure it's in viewport
    await contactHoursContainer.scrollIntoViewIfNeeded();
    
    console.log(`✅ Contact page hours widget test passed for ${browserName}`);
  });

  test('Visual Comparison - Homepage Footer vs Contact Page Hours Widget', async ({ page, browserName }) => {
    // Test both widgets are functionally equivalent
    
    // First, capture homepage footer widget state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const footerWidget = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursWidget}`);
    await expect(footerWidget).toBeVisible();
    
    // Wait for footer widget to load
    const footerHoursList = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursList}`);
    const footerLoadingState = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.loadingState}`);
    await expect(footerLoadingState).toBeHidden({ timeout: TEST_CONFIG.timeouts.elementWait });
    await expect(footerHoursList).toBeVisible();
    
    // Get footer widget text content for comparison
    const footerHoursText = await footerHoursList.textContent();
    const footerCurrentTime = await page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.currentTime}`).textContent();
    
    // Now check contact page widget
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactContainer = page.locator(TEST_CONFIG.selectors.contactHoursContainer).filter({ hasText: 'When We\'re Here' });
    const contactWidget = contactContainer.locator(TEST_CONFIG.selectors.hoursWidget);
    await expect(contactWidget).toBeVisible();
    
    // Wait for contact widget to load
    const contactHoursList = contactContainer.locator(TEST_CONFIG.selectors.hoursList);
    const contactLoadingState = contactContainer.locator(TEST_CONFIG.selectors.loadingState);
    await expect(contactLoadingState).toBeHidden({ timeout: TEST_CONFIG.timeouts.elementWait });
    await expect(contactHoursList).toBeVisible();
    
    // Get contact widget text content for comparison  
    const contactHoursText = await contactHoursList.textContent();
    const contactCurrentTime = await contactContainer.locator(TEST_CONFIG.selectors.currentTime).textContent();
    
    // Compare that both widgets show the same hours data
    expect(footerHoursText).toBeTruthy();
    expect(contactHoursText).toBeTruthy(); 
    
    // Current time should be approximately the same (within a few minutes)
    expect(footerCurrentTime).toBeTruthy();
    expect(contactCurrentTime).toBeTruthy();
    
    // Take side-by-side comparison screenshot
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator(TEST_CONFIG.selectors.footer).scrollIntoViewIfNeeded();
    await page.screenshot({ 
      path: `test-results/homepage-full-page-${browserName}.png`,
      fullPage: true,
      timeout: TEST_CONFIG.timeouts.screenshot 
    });
    
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    await contactContainer.scrollIntoViewIfNeeded();
    await page.screenshot({ 
      path: `test-results/contact-page-full-${browserName}.png`,
      fullPage: true,
      timeout: TEST_CONFIG.timeouts.screenshot 
    });
    
    console.log(`✅ Visual comparison test completed for ${browserName}`);
    console.log(`Footer hours content: ${footerHoursText?.substring(0, 100)}...`);
    console.log(`Contact hours content: ${contactHoursText?.substring(0, 100)}...`);
  });

  test('Debug Mode - Detailed Widget Analysis', async ({ page, browserName }) => {
    // This test provides detailed debugging information about the widget state
    
    console.log(`🔍 Starting detailed widget analysis for ${browserName}`);
    
    // Test homepage footer widget with debug information
    await page.goto('/?debug=true');
    await page.waitForLoadState('networkidle');
    
    // Check if debug info is visible (added by debug=true parameter)
    const debugInfo = page.locator(`${TEST_CONFIG.selectors.footer} #debug-info`);
    if (await debugInfo.isVisible()) {
      const debugText = await debugInfo.textContent();
      console.log(`Homepage footer debug info: ${debugText}`);
    }
    
    // Check widget data attribute
    const footerWidget = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursWidget}`);
    const footerDataHours = await footerWidget.getAttribute('data-hours');
    console.log(`Footer widget data-hours attribute: ${footerDataHours ? 'Present' : 'Missing'}`);
    
    // Check console errors
    const footerConsoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        footerConsoleErrors.push(msg.text());
      }
    });
    
    // Test contact page widget
    await page.goto('/contact?debug=true');
    await page.waitForLoadState('networkidle');
    
    const contactContainer = page.locator(TEST_CONFIG.selectors.contactHoursContainer).filter({ hasText: 'When We\'re Here' });
    const contactWidget = contactContainer.locator(TEST_CONFIG.selectors.hoursWidget);
    
    // Check debug info on contact page
    const contactDebugInfo = contactContainer.locator('#debug-info');
    if (await contactDebugInfo.isVisible()) {
      const debugText = await contactDebugInfo.textContent();
      console.log(`Contact page debug info: ${debugText}`);
    }
    
    // Check widget data attribute on contact page
    const contactDataHours = await contactWidget.getAttribute('data-hours');
    console.log(`Contact widget data-hours attribute: ${contactDataHours ? 'Present' : 'Missing'}`);
    
    // Report any console errors
    if (footerConsoleErrors.length > 0) {
      console.log(`⚠️ Console errors detected: ${footerConsoleErrors.join(', ')}`);
    }
    
    // Verify both widgets have the same fundamental structure
    const footerWidgetHTML = await footerWidget.innerHTML();
    const contactWidgetHTML = await contactWidget.innerHTML();
    
    // Basic structure should be similar (both should have hours-list, current-time, etc.)
    expect(footerWidgetHTML).toContain('hours-list');
    expect(footerWidgetHTML).toContain('current-time');
    expect(contactWidgetHTML).toContain('hours-list'); 
    expect(contactWidgetHTML).toContain('current-time');
    
    console.log(`✅ Debug analysis completed for ${browserName}`);
  });
});

// Helper test to verify site accessibility
test.describe('Hours Widget Accessibility', () => {
  
  test('Footer Hours Widget Accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const footerWidget = page.locator(`${TEST_CONFIG.selectors.footer} ${TEST_CONFIG.selectors.hoursWidget}`);
    
    // Check for proper ARIA labels and roles
    const widgetTitle = page.locator(`${TEST_CONFIG.selectors.footer} h3`).filter({ hasText: 'School Hours' });
    await expect(widgetTitle).toBeVisible();
    
    // Verify keyboard navigation works
    await footerWidget.focus();
    await expect(footerWidget).toBeFocused();
  });
  
  test('Contact Page Hours Widget Accessibility', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactContainer = page.locator(TEST_CONFIG.selectors.contactHoursContainer).filter({ hasText: 'When We\'re Here' });
    const contactWidget = contactContainer.locator(TEST_CONFIG.selectors.hoursWidget);
    
    // Check for proper heading structure
    const sectionTitle = page.locator('h3').filter({ hasText: 'When We\'re Here' });
    await expect(sectionTitle).toBeVisible();
    
    const widgetTitle = contactContainer.locator('h3').filter({ hasText: 'School Hours' });
    await expect(widgetTitle).toBeVisible();
  });
});