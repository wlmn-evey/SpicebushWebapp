import { test, expect } from '@playwright/test';

test.describe('Enhanced Donation Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/donate');
  });

  test('should load donation page with all elements', async ({ page }) => {
    // Check page title and hero section
    await expect(page).toHaveTitle(/Donate.*Spicebush Montessori/);
    await expect(page.locator('h1')).toContainText('Support Our Mission');
    
    // Check donation form is visible
    await expect(page.locator('text=Choose Your Gift')).toBeVisible();
    
    // Check progress indicator
    await expect(page.locator('text=Amount')).toBeVisible();
    await expect(page.locator('text=Details')).toBeVisible();
    await expect(page.locator('text=Your Info')).toBeVisible();
    await expect(page.locator('text=Payment')).toBeVisible();
  });

  test('should navigate through all form steps', async ({ page }) => {
    // Step 1: Amount Selection
    await expect(page.locator('h2')).toContainText('Choose Your Gift');
    
    // Select donation type
    await page.click('text=Monthly');
    
    // Select a giving level
    await page.click('text=$100');
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Step 2: Donation Details
    await expect(page.locator('h2')).toContainText('Donation Details');
    
    // Select designation
    await page.click('text=General Fund');
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Step 3: Donor Information
    await expect(page.locator('h2')).toContainText('Your Information');
    
    // Fill required fields
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'Donor');
    await page.fill('#email', 'test@example.com');
    
    // Continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Step 4: Payment
    await expect(page.locator('h2')).toContainText('Complete Your Donation');
    await expect(page.locator('text=Donation Summary')).toBeVisible();
    await expect(page.locator('text=$100 / month')).toBeVisible();
  });

  test('should handle anonymous donation', async ({ page }) => {
    // Select amount
    await page.click('text=$50');
    await page.click('button:has-text("Continue")');
    
    // Skip details
    await page.click('button:has-text("Continue")');
    
    // Check anonymous option
    await page.click('text=Make this donation anonymous');
    
    // Verify name fields are disabled
    await expect(page.locator('#firstName')).toBeDisabled();
    await expect(page.locator('#lastName')).toBeDisabled();
    
    // Email should still be required
    await expect(page.locator('#email')).not.toBeDisabled();
  });

  test('should show tribute gift options', async ({ page }) => {
    // Navigate to details step
    await page.click('text=$100');
    await page.click('button:has-text("Continue")');
    
    // Enable tribute gift
    await page.click('text=Make this a tribute gift');
    
    // Check tribute options appear
    await expect(page.locator('text=In Honor Of')).toBeVisible();
    await expect(page.locator('text=In Memory Of')).toBeVisible();
    await expect(page.locator('#honoreeFirstName')).toBeVisible();
  });

  test('should show corporate matching options', async ({ page }) => {
    // Navigate to details step
    await page.click('text=$100');
    await page.click('button:has-text("Continue")');
    
    // Enable corporate matching
    await page.click('text=Corporate Matching Gift');
    
    // Check matching fields appear
    await expect(page.locator('#companyName')).toBeVisible();
    await expect(page.locator('text=I will submit the matching gift request')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to donor info step
    await page.click('text=$100');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    
    // Try to continue without filling required fields
    const continueButton = page.locator('button:has-text("Continue to Payment")');
    await expect(continueButton).toBeDisabled();
    
    // Fill required fields
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'Donor');
    await page.fill('#email', 'test@example.com');
    
    // Button should now be enabled
    await expect(continueButton).not.toBeDisabled();
  });

  test('should show all giving levels', async ({ page }) => {
    const givingLevels = [
      { amount: '$25', name: 'Seedling' },
      { amount: '$50', name: 'Sapling' },
      { amount: '$100', name: 'Tree' },
      { amount: '$250', name: 'Forest Guardian' },
      { amount: '$500', name: 'Forest Canopy' },
      { amount: '$1,000', name: 'Old Growth' }
    ];
    
    for (const level of givingLevels) {
      await expect(page.locator(`text=${level.amount}`)).toBeVisible();
      await expect(page.locator(`text=${level.name}`)).toBeVisible();
    }
    
    // Check for popular tag
    await expect(page.locator('text=Most Popular')).toBeVisible();
  });

  test('should accept custom donation amount', async ({ page }) => {
    // Enter custom amount
    await page.fill('#custom-amount', '123');
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Verify amount is carried forward
    await page.click('button:has-text("Continue")');
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'Donor');
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Continue to Payment")');
    
    // Check summary shows custom amount
    await expect(page.locator('text=$123')).toBeVisible();
  });

  test('should display security and tax information', async ({ page }) => {
    await expect(page.locator('text=Your payment information is secure and encrypted')).toBeVisible();
    await expect(page.locator('text=501(c)(3)')).toBeVisible();
    await expect(page.locator('text=tax-deductible')).toBeVisible();
    await expect(page.locator('text=EIN:')).toBeVisible();
  });

  test('should show other ways to give section', async ({ page }) => {
    await expect(page.locator('text=Other Ways to Support')).toBeVisible();
    await expect(page.locator('text=Monthly Giving')).toBeVisible();
    await expect(page.locator('text=Corporate Matching')).toBeVisible();
    await expect(page.locator('text=Volunteer')).toBeVisible();
  });
});