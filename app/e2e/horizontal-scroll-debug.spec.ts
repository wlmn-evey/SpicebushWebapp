import { test, expect } from '@playwright/test';

test.describe('Horizontal Scroll Debug', () => {
  test('Find elements causing horizontal scroll', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for horizontal scroll
    const scrollInfo = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      return {
        bodyWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        htmlWidth: html.scrollWidth,
        htmlClientWidth: html.clientWidth,
        hasHorizontalScroll: html.scrollWidth > html.clientWidth || body.scrollWidth > body.clientWidth
      };
    });
    
    console.log('Scroll info:', scrollInfo);
    
    // Find elements that might be causing overflow
    const overflowingElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const overflowing = [];
      const viewportWidth = window.innerWidth;
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        
        // Check if element extends beyond viewport
        if (rect.right > viewportWidth || rect.width > viewportWidth) {
          overflowing.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            width: rect.width,
            right: rect.right,
            left: rect.left,
            // Include some style info
            position: computed.position,
            display: computed.display,
            overflow: computed.overflow,
            // Get a selector for the element
            selector: el.id ? `#${el.id}` : 
                     el.className ? `.${el.className.split(' ').join('.')}` : 
                     el.tagName.toLowerCase()
          });
        }
      });
      
      return overflowing;
    });
    
    console.log('Overflowing elements:', overflowingElements);
    
    // Get more info about the overflowing link
    if (overflowingElements.length > 0) {
      const linkInfo = await page.evaluate(() => {
        const links = document.querySelectorAll('a.text-earth-brown.hover\\:text-forest-canopy.transition-colors');
        const overflowingLinks = [];
        
        links.forEach(link => {
          const rect = link.getBoundingClientRect();
          if (rect.right > window.innerWidth) {
            overflowingLinks.push({
              text: link.textContent?.trim(),
              href: link.getAttribute('href'),
              parent: link.parentElement?.className,
              grandparent: link.parentElement?.parentElement?.className,
              rect: {
                left: rect.left,
                right: rect.right,
                width: rect.width
              }
            });
          }
        });
        
        return overflowingLinks;
      });
      
      console.log('Overflowing link details:', linkInfo);
    }
    
    // Also check for elements with fixed widths
    const fixedWidthElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const fixed = [];
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        const width = computed.width;
        
        // Check for fixed pixel widths
        if (width.includes('px')) {
          const pixelWidth = parseInt(width);
          if (pixelWidth > 300) { // Elements wider than 300px on mobile might be problematic
            fixed.push({
              tagName: el.tagName,
              className: el.className,
              id: el.id,
              width: width,
              selector: el.id ? `#${el.id}` : 
                       el.className ? `.${el.className.split(' ').join('.')}` : 
                       el.tagName.toLowerCase()
            });
          }
        }
      });
      
      return fixed;
    });
    
    console.log('Fixed width elements:', fixedWidthElements);
    
    // Expect no horizontal scroll
    expect(scrollInfo.hasHorizontalScroll).toBe(false);
  });
});