import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
  });

  test('mobile menu toggle button should be visible on mobile', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    await expect(menuToggle).toBeVisible();
    
    // Desktop nav should be hidden
    const desktopNav = page.locator('.hidden.lg\\:flex');
    await expect(desktopNav).toBeHidden();
  });

  test('clicking menu toggle should open mobile menu', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Initial state - menu should be hidden
    await expect(mobileMenu).toHaveClass(/hidden/);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    
    // Click toggle
    await menuToggle.click();
    
    // Menu should be visible
    await expect(mobileMenu).not.toHaveClass(/hidden/);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    
    // Menu items should be visible
    const aboutLink = mobileMenu.locator('a[href="/about"]');
    await expect(aboutLink).toBeVisible();
  });

  test('clicking menu toggle again should close mobile menu', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Open menu
    await menuToggle.click();
    await expect(mobileMenu).not.toHaveClass(/hidden/);
    
    // Close menu
    await menuToggle.click();
    await expect(mobileMenu).toHaveClass(/hidden/);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile menu should contain all navigation links', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    await menuToggle.click();
    
    // Check all main navigation links
    const expectedLinks = [
      { href: '/about', text: 'About' },
      { href: '/programs', text: 'Programs' },
      { href: '/admissions', text: 'Admissions' },
      { href: '/blog', text: 'Blog' },
      { href: '/contact', text: 'Contact' },
      { href: '/resources/faq', text: 'FAQ' },
      { href: '/donate', text: 'Donate' }
    ];
    
    for (const link of expectedLinks) {
      const linkElement = mobileMenu.locator(`a[href="${link.href}"]`);
      await expect(linkElement).toBeVisible();
      await expect(linkElement).toContainText(link.text);
    }
  });

  test('mobile menu should contain CTA buttons', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    await menuToggle.click();
    
    // Check CTA buttons
    const tuitionButton = mobileMenu.locator('a[href="/admissions/tuition-calculator"]');
    await expect(tuitionButton).toBeVisible();
    await expect(tuitionButton).toContainText('Calculate Tuition');
    
    const tourButton = mobileMenu.locator('a[href="/admissions/schedule-tour"]');
    await expect(tourButton).toBeVisible();
    await expect(tourButton).toContainText('Schedule Tour');
  });

  test('escape key should close mobile menu', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Open menu
    await menuToggle.click();
    await expect(mobileMenu).not.toHaveClass(/hidden/);
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Menu should be closed
    await expect(mobileMenu).toHaveClass(/hidden/);
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking outside menu should close it', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Open menu
    await menuToggle.click();
    await expect(mobileMenu).not.toHaveClass(/hidden/);
    
    // Click outside (on the body)
    await page.locator('body').click({ position: { x: 10, y: 300 } });
    
    // Menu should be closed
    await expect(mobileMenu).toHaveClass(/hidden/);
  });

  test('focus should move to first menu item when opened', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Open menu
    await menuToggle.click();
    
    // Wait for focus to move
    await page.waitForTimeout(150);
    
    // First menu item should have focus
    const firstMenuItem = mobileMenu.locator('a[role="menuitem"]').first();
    await expect(firstMenuItem).toBeFocused();
  });

  test('mobile bottom navigation should be visible', async ({ page }) => {
    // Check MobileBottomNav component
    const bottomNav = page.locator('nav[aria-label="Mobile quick actions"]');
    await expect(bottomNav).toBeVisible();
    
    // Check all three buttons
    const tuitionBtn = bottomNav.locator('a[href="/admissions/tuition-calculator"]');
    const tourBtn = bottomNav.locator('a[href="/admissions/schedule-tour"]');
    const callBtn = bottomNav.locator('a[href^="tel:"]');
    
    await expect(tuitionBtn).toBeVisible();
    await expect(tourBtn).toBeVisible();
    await expect(callBtn).toBeVisible();
  });

  test('mobile menu should be accessible', async ({ page }) => {
    const menuToggle = page.locator('#mobile-menu-toggle');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Check ARIA attributes
    await expect(menuToggle).toHaveAttribute('aria-label', 'Open mobile menu');
    await expect(mobileMenu).toHaveAttribute('role', 'menu');
    
    // Check menu items have proper roles
    await menuToggle.click();
    const menuItems = mobileMenu.locator('a[role="menuitem"]');
    expect(await menuItems.count()).toBeGreaterThan(0);
  });
});