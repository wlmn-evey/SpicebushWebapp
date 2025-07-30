import { test, expect } from '@playwright/test';

test.describe('Mobile Menu Test', () => {
  test('Mobile menu opens and closes correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check mobile menu button is visible
    const menuButton = page.locator('#mobile-menu-toggle');
    await expect(menuButton).toBeVisible();
    
    // Check mobile menu is initially hidden
    const mobileMenu = page.locator('#mobile-menu');
    
    // Log console messages
    page.on('console', msg => console.log('Console:', msg.text()));
    
    // Check initial state - menu should have 'hidden' class
    const initialClasses = await mobileMenu.getAttribute('class');
    console.log('Initial menu classes:', initialClasses);
    expect(initialClasses).toContain('hidden');
    
    // Click menu button
    await menuButton.click();
    
    // Wait a bit for animation
    await page.waitForTimeout(500);
    
    // Check mobile menu is now visible by checking actual visibility
    const afterClickClasses = await mobileMenu.getAttribute('class');
    console.log('After click classes:', afterClickClasses);
    
    // Since lg:hidden remains, check actual visibility instead
    await expect(mobileMenu).toBeVisible();
    
    // Check that menu items are visible
    const aboutLink = mobileMenu.locator('a[href="/about"]');
    await expect(aboutLink).toBeVisible();
    
    // Click outside to close menu
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    
    // Check menu is hidden again
    await expect(mobileMenu).not.toBeVisible();
  });
  
  test('Mobile menu navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    const menuButton = page.locator('#mobile-menu-toggle');
    await menuButton.click();
    await page.waitForTimeout(300);
    
    // Navigate to About page
    const aboutLink = page.locator('#mobile-menu a[href="/about"]');
    await aboutLink.click();
    
    // Verify navigation occurred
    await expect(page).toHaveURL(/\/about/);
    
    // Check that menu is closed after navigation
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toHaveClass(/hidden/);
  });
});