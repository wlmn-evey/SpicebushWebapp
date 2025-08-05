/**
 * Footer HTML Source Debug Test
 * 
 * Investigates the actual HTML structure to determine if HoursWidget
 * is being rendered at all in the footer, or if it's a client-side issue.
 */

import { test, expect } from '@playwright/test';

test.describe('Footer HTML Source Analysis', () => {
  
  test('Analyze footer HTML structure and HoursWidget rendering', async ({ page }) => {
    console.log('🔍 Analyzing footer HTML structure...');
    
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Allow time for any client-side rendering
    
    // Get the complete HTML of the footer
    const footerHTML = await page.locator('footer').innerHTML();
    
    console.log('📄 Footer HTML structure analysis:');
    console.log('=====================================');
    
    // Check for HoursWidget related elements
    const checks = {
      'HoursWidget import/usage': footerHTML.includes('HoursWidget'),
      'Hours widget ID': footerHTML.includes('sbms-hours-widget'),
      'Hours widget classes': footerHTML.includes('bg-white rounded-lg'),
      'Hours list container': footerHTML.includes('hours-list'),  
      'Current time container': footerHTML.includes('current-time'),
      'Right column container': footerHTML.includes('bg-white/5 backdrop-blur-sm'),
      'Grid cols-2 class': footerHTML.includes('lg:grid-cols-2')
    };
    
    Object.entries(checks).forEach(([check, found]) => {
      const status = found ? '✅' : '❌';
      console.log(`${status} ${check}: ${found}`);
    });
    
    // Count the number of grid columns in the HTML
    const columnPattern = /<div class="w-full">/g;
    const columnMatches = footerHTML.match(columnPattern);
    const columnCount = columnMatches ? columnMatches.length : 0;
    
    console.log(`\n📊 Footer structure:`)
    console.log(`- Grid columns found in HTML: ${columnCount}`);
    console.log(`- Expected columns: 2`);
    
    // Check for specific footer sections
    const sectionsFound = {
      'School Info section': footerHTML.includes('warm community'),
      'Quick Links section': footerHTML.includes('Quick Links'),
      'Resources section': footerHTML.includes('Resources'),
      'Contact Info section': footerHTML.includes('Get in Touch'),
      'Hours Widget section': footerHTML.includes('School Hours') || footerHTML.includes('sbms-hours-widget')
    };
    
    console.log(`\n📋 Footer sections:`);
    Object.entries(sectionsFound).forEach(([section, found]) => {
      const status = found ? '✅' : '❌';
      console.log(`${status} ${section}: ${found}`);
    });
    
    // Save the complete footer HTML for inspection
    console.log(`\n💾 Saving footer HTML for inspection...`);
    await page.locator('footer').innerHTML().then(html => {
      require('fs').writeFileSync('test-results/footer-source.html', html);
    });
    
    // Compare with contact page
    console.log(`\n🆚 Comparing with contact page...`);
    await page.goto('/contact', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const contactPageHTML = await page.content();
    const contactHoursChecks = {
      'Hours widget ID on contact': contactPageHTML.includes('sbms-hours-widget'),
      'School Hours heading': contactPageHTML.includes('School Hours'),
      'Hours list on contact': contactPageHTML.includes('hours-list'),
      'Current time on contact': contactPageHTML.includes('current-time')
    };
    
    Object.entries(contactHoursChecks).forEach(([check, found]) => {
      const status = found ? '✅' : '❌';
      console.log(`${status} ${check}: ${found}`);
    });
    
    // Check if there are any JavaScript errors that might prevent rendering
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    // Reload homepage to catch any console messages
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️ Console errors found:`);
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (consoleWarnings.length > 0) {
      console.log(`\n⚠️ Console warnings found:`);
      consoleWarnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Check if it's a server-side rendering vs client-side rendering issue
    console.log(`\n🔍 Rendering analysis:`);
    
    // Check initial HTML (before JavaScript execution)
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const initialHTML = await response.text();
    
    const initialChecks = {
      'Hours widget in initial HTML': initialHTML.includes('sbms-hours-widget'),
      'HoursWidget component in initial HTML': initialHTML.includes('HoursWidget'),
      'Footer structure in initial HTML': initialHTML.includes('lg:grid-cols-2')
    };
    
    Object.entries(initialChecks).forEach(([check, found]) => {
      const status = found ? '✅' : '❌';
      console.log(`${status} ${check}: ${found}`);
    });
    
    // Final assessment
    console.log(`\n📋 ASSESSMENT:`);
    console.log(`==============`);
    
    if (!footerHTML.includes('sbms-hours-widget')) {
      console.log(`❌ CONFIRMED: HoursWidget is NOT rendered in the footer HTML`);
      console.log(`   This suggests:`);
      console.log(`   1. Build/compilation issue with the Footer.astro component`);
      console.log(`   2. Missing import or incorrect component reference`);
      console.log(`   3. Server-side rendering failure for the HoursWidget`);
      console.log(`   4. Conditional rendering that's hiding the widget`);
    } else {
      console.log(`✅ HoursWidget HTML is present but may have display issues`);
    }
    
    if (contactPageHTML.includes('sbms-hours-widget')) {
      console.log(`✅ HoursWidget renders correctly on contact page`);
      console.log(`   This suggests the component itself is working`);
    }
    
    // Create final diagnostic report
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      footerHasHoursWidget: footerHTML.includes('sbms-hours-widget'),
      contactPageHasHoursWidget: contactPageHTML.includes('sbms-hours-widget'),
      footerColumnCount: columnCount,
      consoleErrors: consoleErrors,
      consoleWarnings: consoleWarnings,
      checks: checks,
      sectionsFound: sectionsFound,
      initialRenderChecks: initialChecks
    };
    
    require('fs').writeFileSync('test-results/footer-diagnostic-report.json', JSON.stringify(diagnosticReport, null, 2));
    console.log(`\n💾 Diagnostic report saved to test-results/footer-diagnostic-report.json`);
  });
});