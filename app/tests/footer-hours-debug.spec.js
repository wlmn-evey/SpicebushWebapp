/**
 * Focused Footer Hours Widget Debug Test
 * 
 * This test specifically investigates why the hours widget is not visible 
 * in the footer as reported by the user.
 */

import { test, expect } from '@playwright/test';

test.describe('Footer Hours Widget Debug', () => {
  
  test('Investigate Footer Hours Widget Issue', async ({ page, browserName }) => {
    console.log(`🔍 Debugging footer hours widget for ${browserName}`);
    
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `test-results/homepage-initial-${browserName}.png`,
      fullPage: true 
    });
    
    console.log('📊 Checking page structure...');
    
    // Check if footer exists
    const footer = page.locator('footer');
    const footerVisible = await footer.isVisible();
    console.log(`Footer visible: ${footerVisible}`);
    
    if (!footerVisible) {
      console.log('❌ Footer not found on page');
      await expect(footer).toBeVisible(); // This will fail and show what's wrong
      return;
    }
    
    // Scroll to footer to ensure it's in view
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // Wait for any animations
    
    // Take footer screenshot
    await footer.screenshot({ 
      path: `test-results/footer-section-${browserName}.png`
    });
    
    console.log('🔍 Checking footer structure...');
    
    // Check footer layout structure
    const mainFooterLayout = footer.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    const mainFooterLayoutVisible = await mainFooterLayout.isVisible();
    console.log(`Main footer layout visible: ${mainFooterLayoutVisible}`);
    
    // Check right column (should contain hours widget)
    const rightColumn = footer.locator('.w-full').nth(1); // Second .w-full should be right column
    const rightColumnVisible = await rightColumn.isVisible();
    console.log(`Right column visible: ${rightColumnVisible}`);
    
    if (rightColumnVisible) {
      await rightColumn.screenshot({ 
        path: `test-results/footer-right-column-${browserName}.png`
      });
    }
    
    // Check for hours widget container
    const hoursContainer = footer.locator('.bg-white\\/5.backdrop-blur-sm.rounded-xl');
    const hoursContainerVisible = await hoursContainer.isVisible();
    console.log(`Hours widget container visible: ${hoursContainerVisible}`);
    
    if (hoursContainerVisible) {
      await hoursContainer.screenshot({ 
        path: `test-results/footer-hours-container-${browserName}.png`
      });
    }
    
    // Check for actual hours widget
    const hoursWidget = footer.locator('#sbms-hours-widget');
    const hoursWidgetExists = await hoursWidget.count() > 0;
    const hoursWidgetVisible = hoursWidgetExists ? await hoursWidget.isVisible() : false;
    
    console.log(`Hours widget exists: ${hoursWidgetExists}`);
    console.log(`Hours widget visible: ${hoursWidgetVisible}`);
    
    if (hoursWidgetExists) {
      // Check widget properties
      const widgetClasses = await hoursWidget.getAttribute('class');
      const widgetStyle = await hoursWidget.getAttribute('style');
      const widgetDataHours = await hoursWidget.getAttribute('data-hours');
      
      console.log(`Widget classes: ${widgetClasses}`);
      console.log(`Widget style: ${widgetStyle || 'none'}`);
      console.log(`Widget data-hours: ${widgetDataHours ? 'present' : 'missing'}`);
      
      // Check for loading state
      const loadingState = hoursWidget.locator('#loading-state');
      const loadingVisible = await loadingState.isVisible();
      console.log(`Loading state visible: ${loadingVisible}`);
      
      // Check for hours list
      const hoursList = hoursWidget.locator('#hours-list');
      const hoursListVisible = await hoursList.isVisible();
      console.log(`Hours list visible: ${hoursListVisible}`);
      
      if (hoursWidgetVisible) {
        await hoursWidget.screenshot({ 
          path: `test-results/footer-hours-widget-${browserName}.png`
        });
      }
    }
    
    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit more to catch any delayed rendering
    await page.waitForTimeout(3000);
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log(`⚠️ Console errors: ${consoleErrors.join(', ')}`);
    }
    
    // Check computed styles that might hide the widget
    if (hoursWidgetExists) {
      const computedStyle = await hoursWidget.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          height: style.height,
          width: style.width,
          overflow: style.overflow
        };
      });
      
      console.log('🎨 Widget computed styles:', JSON.stringify(computedStyle, null, 2));
      
      // If widget exists but isn't visible, there might be a CSS issue
      if (!hoursWidgetVisible) {
        console.log('❌ Widget exists but is not visible - likely CSS issue');
        console.log('Common causes:');
        console.log('- display: none');
        console.log('- visibility: hidden');
        console.log('- opacity: 0');
        console.log('- height: 0 or width: 0');
        console.log('- positioned outside viewport');
      }
    }
    
    // Compare with contact page implementation
    console.log('🆚 Comparing with contact page...');
    
    await page.goto('/contact', { waitUntil: 'networkidle' });
    
    const contactHoursWidget = page.locator('#sbms-hours-widget').first();
    const contactWidgetVisible = await contactHoursWidget.isVisible();
    console.log(`Contact page widget visible: ${contactWidgetVisible}`);
    
    if (contactWidgetVisible) {
      const contactComputedStyle = await contactHoursWidget.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          height: style.height,
          width: style.width,
          overflow: style.overflow
        };
      });
      
      console.log('🎨 Contact widget computed styles:', JSON.stringify(contactComputedStyle, null, 2));
    }
    
    // Final screenshot comparison
    await page.screenshot({ 
      path: `test-results/contact-page-comparison-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ Debug analysis completed for ${browserName}`);
    
    // The test should fail if the footer hours widget is not visible
    // This matches the user's reported issue
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const finalFooterWidget = page.locator('footer #sbms-hours-widget');
    
    // This assertion will document the current behavior
    // If it fails, it confirms the user's issue
    try {
      await expect(finalFooterWidget).toBeVisible({ timeout: 5000 });
      console.log('✅ Footer hours widget is working correctly');
    } catch (error) {
      console.log('❌ CONFIRMED: Footer hours widget is not visible - matches user report');
      throw error; // Re-throw to mark test as failed
    }
  });
});