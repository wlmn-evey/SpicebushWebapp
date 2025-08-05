/**
 * Footer Responsive Layout Debug Test
 * 
 * Tests footer hours widget visibility across different viewport sizes
 * to confirm if the issue is related to responsive design breakpoints.
 */

import { test, expect } from '@playwright/test';

const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  large: { width: 1280, height: 800 },
  xl: { width: 1440, height: 900 }
};

test.describe('Footer Hours Widget Responsive Behavior', () => {
  
  Object.entries(viewports).forEach(([deviceName, viewport]) => {
    test(`Check footer hours widget on ${deviceName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize(viewport);
      
      console.log(`📱 Testing ${deviceName} viewport: ${viewport.width}x${viewport.height}`);
      
      // Navigate to homepage
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Wait for page to fully load
      await page.waitForTimeout(2000);
      
      // Check footer structure
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      // Scroll to footer
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // Take screenshot for this viewport
      await footer.screenshot({ 
        path: `test-results/footer-${deviceName}-${viewport.width}x${viewport.height}.png`
      });
      
      // Check main footer grid layout
      const mainGrid = footer.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
      const mainGridVisible = await mainGrid.isVisible();
      console.log(`${deviceName}: Main grid visible: ${mainGridVisible}`);
      
      // Count visible columns in the main grid
      const columns = footer.locator('.grid.grid-cols-1.lg\\:grid-cols-2 > .w-full');
      const columnCount = await columns.count();
      console.log(`${deviceName}: Column count: ${columnCount}`);
      
      // Check visibility of each column
      for (let i = 0; i < columnCount; i++) {
        const column = columns.nth(i);
        const isVisible = await column.isVisible();
        console.log(`${deviceName}: Column ${i + 1} visible: ${isVisible}`);
        
        if (i === 1) { // Right column (hours widget)
          const hoursWidget = column.locator('#sbms-hours-widget');
          const hoursWidgetExists = await hoursWidget.count() > 0;
          const hoursWidgetVisible = hoursWidgetExists ? await hoursWidget.isVisible() : false;
          
          console.log(`${deviceName}: Hours widget exists: ${hoursWidgetExists}`);
          console.log(`${deviceName}: Hours widget visible: ${hoursWidgetVisible}`);
          
          // For large screens (lg breakpoint and above), widget should be visible
          if (viewport.width >= 1024) { // lg breakpoint in Tailwind is 1024px
            console.log(`${deviceName}: Should show hours widget (>= lg breakpoint)`);
            await expect(column).toBeVisible();
            if (hoursWidgetExists) {
              await expect(hoursWidget).toBeVisible();
            }
          } else {
            console.log(`${deviceName}: Hours widget may be hidden (< lg breakpoint)`);
          }
        }
      }
      
      // Check computed styles of the main grid
      const gridComputedStyle = await mainGrid.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          gap: style.gap
        };
      });
      
      console.log(`${deviceName}: Grid computed styles:`, JSON.stringify(gridComputedStyle, null, 2));
      
      // Check if this viewport size explains the issue
      const isLargeScreen = viewport.width >= 1024;
      const hoursWidgetInFooter = await footer.locator('#sbms-hours-widget').count() > 0;
      const hoursWidgetVisible = hoursWidgetInFooter ? await footer.locator('#sbms-hours-widget').isVisible() : false;
      
      console.log(`${deviceName}: Summary:`);
      console.log(`  - Is large screen (>= 1024px): ${isLargeScreen}`);
      console.log(`  - Hours widget in footer: ${hoursWidgetInFooter}`);
      console.log(`  - Hours widget visible: ${hoursWidgetVisible}`);
      console.log(`  - Expected visibility: ${isLargeScreen}`);
      console.log(`  - Matches expectation: ${hoursWidgetVisible === isLargeScreen}`);
      
      // For debugging, also check the contact page on the same viewport
      await page.goto('/contact', { waitUntil: 'networkidle' });
      const contactWidget = page.locator('#sbms-hours-widget').first();
      const contactWidgetVisible = await contactWidget.isVisible();
      console.log(`${deviceName}: Contact page widget visible: ${contactWidgetVisible}`);
    });
  });
  
  test('Compare footer behavior across all viewports', async ({ page }) => {
    const results = {};
    
    for (const [deviceName, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      
      const hoursWidget = footer.locator('#sbms-hours-widget');
      const exists = await hoursWidget.count() > 0;
      const visible = exists ? await hoursWidget.isVisible() : false;
      
      results[deviceName] = {
        viewport,
        widgetExists: exists,
        widgetVisible: visible,
        isLargeScreen: viewport.width >= 1024
      };
    }
    
    console.log('📊 Footer Hours Widget Visibility Summary:');
    console.log('================================================');
    
    Object.entries(results).forEach(([device, result]) => {
      const status = result.widgetVisible ? '✅ VISIBLE' : '❌ HIDDEN';
      const expected = result.isLargeScreen ? 'Should be visible' : 'May be hidden';
      console.log(`${device.padEnd(8)}: ${status.padEnd(12)} (${expected})`);
    });
    
    // Determine if the issue is responsive-related
    const largeScreenResults = Object.values(results).filter(r => r.isLargeScreen);
    const allLargeScreensVisible = largeScreenResults.every(r => r.widgetVisible);
    const anyLargeScreenVisible = largeScreenResults.some(r => r.widgetVisible);
    
    console.log('\n🔍 Analysis:');
    if (allLargeScreensVisible) {
      console.log('✅ Hours widget works correctly on large screens');
      console.log('ℹ️  Widget is hidden on small screens by responsive design');
    } else if (anyLargeScreenVisible) {
      console.log('⚠️  Inconsistent behavior across large screen sizes');
    } else {
      console.log('❌ Hours widget not visible on any screen size - deeper issue');
    }
  });
});