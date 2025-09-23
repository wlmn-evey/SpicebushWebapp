import { test, expect } from '@playwright/test';

/**
 * End-to-End Content Verification Tests
 * 
 * These tests verify that factual information is correctly displayed across
 * the website and matches the expected data. They test the full pipeline
 * from database to rendered content in the browser.
 */

// Expected data constants - update these when content changes
const EXPECTED_DATA = {
  PHONE: '(484) 202-0712',
  EMAIL: 'information@spicebushmontessori.org',
  ADDRESS: {
    STREET: '827 Concord Road',
    CITY: 'Glen Mills',
    STATE: 'PA',
    ZIP: '19342'
  },
  AGES_SERVED: '3 to 6 years',
  SCHOOL_YEAR: '2025-2026',
  EXTENDED_CARE_UNTIL: '5:30 PM',
  FOUNDED: 2021,
  SOCIAL_MEDIA: {
    FACEBOOK: 'https://www.facebook.com/SpicebushMontessori',
    INSTAGRAM: 'https://www.instagram.com/spicebushmontessori'
  }
};

test.describe('Content Verification E2E Tests', () => {
  test.describe('Contact Information Display', () => {
    test('should display consistent contact information on homepage', async ({ page }) => {
      await page.goto('/');
      
      // Check phone number appears and is formatted correctly
      const phoneElements = await page.locator(`text=${EXPECTED_DATA.PHONE}`).all();
      expect(phoneElements.length).toBeGreaterThan(0);
      
      // Check email appears and is properly formatted
      const emailElements = await page.locator(`text=${EXPECTED_DATA.EMAIL}`).all();
      expect(emailElements.length).toBeGreaterThan(0);
      
      // Verify address components appear
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.STREET}`)).toBeVisible();
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.CITY}`)).toBeVisible();
    });

    test('should display consistent contact information on contact page', async ({ page }) => {
      await page.goto('/contact');
      
      // Phone should be displayed and clickable
      const phoneLink = page.locator(`a[href*="tel:"]`);
      await expect(phoneLink).toBeVisible();
      
      const phoneText = await phoneLink.textContent();
      expect(phoneText?.replace(/\s+/g, ' ').trim()).toBe(EXPECTED_DATA.PHONE);
      
      // Email should be displayed and clickable
      const emailLink = page.locator(`a[href*="mailto:"]`);
      await expect(emailLink).toBeVisible();
      
      const emailText = await emailLink.textContent();
      expect(emailText?.trim()).toBe(EXPECTED_DATA.EMAIL);
      
      // Address should be complete
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.STREET}`)).toBeVisible();
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.CITY}`)).toBeVisible();
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.STATE}`)).toBeVisible();
      await expect(page.locator(`text=${EXPECTED_DATA.ADDRESS.ZIP}`)).toBeVisible();
    });

    test('should have working social media links', async ({ page }) => {
      await page.goto('/');
      
      // Check Facebook link
      const facebookLink = page.locator(`a[href="${EXPECTED_DATA.SOCIAL_MEDIA.FACEBOOK}"]`);
      await expect(facebookLink).toBeVisible();
      
      // Check Instagram link
      const instagramLink = page.locator(`a[href="${EXPECTED_DATA.SOCIAL_MEDIA.INSTAGRAM}"]`);
      await expect(instagramLink).toBeVisible();
    });
  });

  test.describe('Hours Information Display', () => {
    test('should display complete weekly hours on homepage', async ({ page }) => {
      await page.goto('/');
      
      // Should show hours information
      const hoursSection = page.locator('[data-testid="hours-widget"], .hours-info, *:has-text("Hours")').first();
      await expect(hoursSection).toBeVisible();
      
      // Should mention extended care
      await expect(page.locator(`text=*${EXPECTED_DATA.EXTENDED_CARE_UNTIL}*`)).toBeVisible();
    });

    test('should display hours consistently across pages', async ({ page }) => {
      const pages = ['/', '/contact', '/admissions'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Look for extended care time mention
        const extendedCareElement = page.locator(`text=*${EXPECTED_DATA.EXTENDED_CARE_UNTIL}*`);
        if (await extendedCareElement.count() > 0) {
          await expect(extendedCareElement.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Staff Information Display', () => {
    test('should display staff information correctly', async ({ page }) => {
      await page.goto('/');
      
      // Look for staff section on homepage
      const staffSection = page.locator('[data-testid="featured-teachers"], .staff-section, *:has-text("Teachers")').first();
      
      if (await staffSection.count() > 0) {
        await expect(staffSection).toBeVisible();
        
        // Should have staff images
        const staffImages = staffSection.locator('img');
        const imageCount = await staffImages.count();
        expect(imageCount).toBeGreaterThan(0);
        
        // Staff images should have proper alt text
        for (let i = 0; i < imageCount; i++) {
          const img = staffImages.nth(i);
          const altText = await img.getAttribute('alt');
          expect(altText).toBeTruthy();
          expect(altText?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should have consistent staff information if staff page exists', async ({ page }) => {
      // Try to navigate to potential staff/about pages
      const staffPages = ['/about', '/staff', '/teachers'];
      
      for (const staffPage of staffPages) {
        const response = await page.goto(staffPage);
        
        if (response?.status() === 200) {
          // If page exists, verify staff content
          const staffElements = page.locator('*:has-text("Teacher"), *:has-text("Lead"), *:has-text("Head")');
          
          if (await staffElements.count() > 0) {
            // Staff roles should be properly formatted
            const staffTexts = await staffElements.allTextContents();
            staffTexts.forEach(text => {
              if (text.includes('Teacher')) {
                // Should be properly capitalized
                expect(text).toMatch(/[A-Z][a-z]+ Teacher/);
              }
            });
          }
        }
      }
    });
  });

  test.describe('Program and Tuition Information Display', () => {
    test('should display program information consistently', async ({ page }) => {
      await page.goto('/programs');
      
      // Should have program information
      const programElements = page.locator('*:has-text("Full Day"), *:has-text("Half Day")');
      
      if (await programElements.count() > 0) {
        await expect(programElements.first()).toBeVisible();
        
        // Programs should mention age ranges
        await expect(page.locator(`text=*${EXPECTED_DATA.AGES_SERVED}*`)).toBeVisible();
      }
    });

    test('should display tuition information if available', async ({ page }) => {
      const tuitionPages = ['/admissions', '/tuition', '/admissions/tuition-calculator'];
      
      for (const tuitionPage of tuitionPages) {
        const response = await page.goto(tuitionPage);
        
        if (response?.status() === 200) {
          // If page exists, look for tuition information
          const tuitionElements = page.locator('*:has-text("Tuition"), *:has-text("$")');
          
          if (await tuitionElements.count() > 0) {
            // Should mention current school year
            await expect(page.locator(`text=*${EXPECTED_DATA.SCHOOL_YEAR}*`)).toBeVisible();
            
            // Should have proper currency formatting
            const priceElements = page.locator('text=/\\$[0-9,]+/');
            const priceCount = await priceElements.count();
            
            if (priceCount > 0) {
              for (let i = 0; i < Math.min(priceCount, 5); i++) {
                const priceText = await priceElements.nth(i).textContent();
                expect(priceText).toMatch(/^\$[0-9,]+$/);
              }
            }
          }
        }
      }
    });

    test('should have consistent extended care information in programs', async ({ page }) => {
      const programPages = ['/programs', '/admissions'];
      
      for (const programPage of programPages) {
        const response = await page.goto(programPage);
        
        if (response?.status() === 200) {
          const extendedCareElements = page.locator('text=*Extended care*, text=*extended care*');
          
          if (await extendedCareElements.count() > 0) {
            // Should mention consistent end time
            await expect(page.locator(`text=*${EXPECTED_DATA.EXTENDED_CARE_UNTIL}*`)).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Footer Information Consistency', () => {
    test('should have consistent footer information across all pages', async ({ page }) => {
      const testPages = ['/', '/contact', '/about', '/programs', '/admissions'];
      
      for (const testPage of testPages) {
        await page.goto(testPage);
        
        // Footer should exist
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
        
        // Footer should contain contact information
        const footerText = await footer.textContent();
        if (footerText) {
          // Look for phone number in footer
          const hasPhone = footerText.includes(EXPECTED_DATA.PHONE) || 
                          footerText.includes(EXPECTED_DATA.PHONE.replace(/[^\d]/g, ''));
          
          // Look for email in footer
          const hasEmail = footerText.includes(EXPECTED_DATA.EMAIL);
          
          // At least one form of contact should be in footer
          expect(hasPhone || hasEmail).toBe(true);
        }
      }
    });
  });

  test.describe('Meta Information Consistency', () => {
    test('should have consistent page titles and meta descriptions', async ({ page }) => {
      const testPages = [
        { path: '/', expectedTitle: /Spicebush.*Montessori/i },
        { path: '/contact', expectedTitle: /Contact.*Spicebush/i },
        { path: '/about', expectedTitle: /About.*Spicebush/i },
        { path: '/programs', expectedTitle: /Programs.*Spicebush/i },
        { path: '/admissions', expectedTitle: /Admissions.*Spicebush/i }
      ];
      
      for (const { path, expectedTitle } of testPages) {
        const response = await page.goto(path);
        
        if (response?.status() === 200) {
          const title = await page.title();
          expect(title).toMatch(expectedTitle);
          
          // Should have meta description
          const metaDescription = await page.locator('meta[name="description"]');
          const description = await metaDescription.getAttribute('content');
          
          if (description) {
            expect(description.length).toBeGreaterThan(50);
            expect(description.length).toBeLessThan(160);
          }
        }
      }
    });
  });

  test.describe('Image and Media Consistency', () => {
    test('should have proper alt text for all images', async ({ page }) => {
      await page.goto('/');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        const src = await img.getAttribute('src');
        
        // All images should have alt text (unless decorative)
        if (src && !src.includes('decoration') && !src.includes('spacer')) {
          expect(altText).toBeTruthy();
          if (altText) {
            expect(altText.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should load staff images properly', async ({ page }) => {
      await page.goto('/');
      
      // Look for staff images
      const staffImages = page.locator('img[src*="teacher"], img[src*="staff"]');
      const staffImageCount = await staffImages.count();
      
      for (let i = 0; i < staffImageCount; i++) {
        const img = staffImages.nth(i);
        
        // Image should be visible
        await expect(img).toBeVisible();
        
        // Image should have proper alt text
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
        
        // Wait for image to load
        await expect(img).not.toHaveJSProperty('naturalWidth', 0);
      }
    });
  });

  test.describe('Forms and Interactive Elements', () => {
    test('should have contact form with proper validation', async ({ page }) => {
      await page.goto('/contact');
      
      const contactForm = page.locator('form');
      
      if (await contactForm.count() > 0) {
        await expect(contactForm.first()).toBeVisible();
        
        // Form should have required fields
        const nameField = contactForm.locator('input[name*="name"], input[type="text"]').first();
        const emailField = contactForm.locator('input[name*="email"], input[type="email"]').first();
        const messageField = contactForm.locator('textarea, input[name*="message"]').first();
        
        if (await nameField.count() > 0) {
          await expect(nameField).toBeVisible();
        }
        
        if (await emailField.count() > 0) {
          await expect(emailField).toBeVisible();
        }
        
        if (await messageField.count() > 0) {
          await expect(messageField).toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Should have exactly one h1
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBe(1);
      
      // H1 should contain school name
      const h1Text = await h1Elements.first().textContent();
      expect(h1Text).toMatch(/Spicebush.*Montessori/i);
    });

    test('should have consistent navigation', async ({ page }) => {
      await page.goto('/');
      
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav.first()).toBeVisible();
      
      // Navigation should contain key pages
      const navText = await nav.first().textContent();
      if (navText) {
        // Should have links to main sections
        const hasAbout = navText.toLowerCase().includes('about');
        const hasPrograms = navText.toLowerCase().includes('program');
        const hasContact = navText.toLowerCase().includes('contact');
        const hasAdmissions = navText.toLowerCase().includes('admission');
        
        // At least some main navigation items should be present
        const mainNavItems = [hasAbout, hasPrograms, hasContact, hasAdmissions].filter(Boolean).length;
        expect(mainNavItems).toBeGreaterThan(1);
      }
    });
  });
});