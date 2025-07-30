import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:4321';

async function runAssessment() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== SPICEBUSH MONTESSORI SITE ASSESSMENT ===\n');
  
  // Core Pages Test
  console.log('1. CORE FUNCTIONALITY TESTS:');
  const pagesToTest = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/programs', name: 'Programs' },
    { path: '/admissions', name: 'Admissions' },
    { path: '/admissions/schedule-tour', name: 'Tour Scheduling' },
    { path: '/blog', name: 'Blog' },
    { path: '/contact', name: 'Contact' },
    { path: '/donate', name: 'Donate' }
  ];
  
  let passCount = 0;
  const issues = [];
  
  for (const testPage of pagesToTest) {
    try {
      const response = await page.goto(`${BASE_URL}${testPage.path}`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      const status = response?.status() || 0;
      const title = await page.title();
      const hasError = await page.$('.error-page, .error-message, [class*="500"], [class*="404"]');
      
      if (status === 200 && !hasError) {
        console.log(`✅ ${testPage.name}: OK (${title})`);
        passCount++;
      } else {
        console.log(`❌ ${testPage.name}: FAILED (Status: ${status})`);
        issues.push(`${testPage.name} page issues`);
      }
    } catch (error) {
      console.log(`❌ ${testPage.name}: ERROR - ${error.message}`);
      issues.push(`${testPage.name} failed to load`);
    }
  }
  
  console.log(`\nCore Pages: ${passCount}/${pagesToTest.length} passed\n`);
  
  // Mobile Navigation Test
  console.log('2. MOBILE NAVIGATION TEST:');
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  
  try {
    // Look for mobile menu button
    const menuButton = await page.$('button[aria-label*="menu" i], button.mobile-menu-button, button[class*="hamburger"]');
    if (menuButton) {
      await menuButton.click();
      await page.waitForTimeout(500);
      const mobileMenu = await page.$('.mobile-menu:visible, nav[aria-expanded="true"], .nav-mobile.active');
      if (mobileMenu) {
        console.log('✅ Mobile menu: Working');
      } else {
        console.log('❌ Mobile menu: Not opening properly');
        issues.push('Mobile menu not working');
      }
    } else {
      console.log('❌ Mobile menu button: Not found');
      issues.push('Mobile menu button missing');
    }
  } catch (error) {
    console.log('❌ Mobile navigation: ERROR - ' + error.message);
    issues.push('Mobile navigation error');
  }
  
  // Performance Check
  console.log('\n3. PERFORMANCE CHECK:');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE_URL);
  
  const metrics = await page.metrics();
  const performanceData = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart
    };
  });
  
  console.log(`DOM Content Loaded: ${performanceData.domContentLoaded}ms`);
  console.log(`Page Load Complete: ${performanceData.loadComplete}ms`);
  
  if (performanceData.domContentLoaded > 3000) {
    issues.push('Slow page load (>3s)');
  }
  
  // Console Errors Check
  console.log('\n4. CONSOLE ERRORS:');
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.reload();
  await page.waitForTimeout(2000);
  
  if (errors.length === 0) {
    console.log('✅ No console errors detected');
  } else {
    console.log(`❌ ${errors.length} console errors found`);
    errors.forEach(err => console.log(`  - ${err}`));
    issues.push(`${errors.length} console errors`);
  }
  
  // Form Functionality Test
  console.log('\n5. TOUR SCHEDULING FORM TEST:');
  await page.goto(`${BASE_URL}/admissions/schedule-tour`);
  
  try {
    const form = await page.$('form');
    const nameInput = await page.$('input[name*="name" i]:not([name*="child" i])');
    const emailInput = await page.$('input[type="email"]');
    const submitButton = await page.$('button[type="submit"]');
    
    if (form && nameInput && emailInput && submitButton) {
      console.log('✅ Tour form: All elements present');
    } else {
      console.log('❌ Tour form: Missing elements');
      issues.push('Tour form incomplete');
    }
  } catch (error) {
    console.log('❌ Tour form: ERROR - ' + error.message);
    issues.push('Tour form error');
  }
  
  // Summary
  console.log('\n=== ASSESSMENT SUMMARY ===');
  console.log(`\nCritical Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  const score = Math.max(0, 10 - issues.length);
  console.log(`\nOverall Score: ${score}/10`);
  console.log(`Production Ready: ${issues.length === 0 ? 'YES ✅' : 'NO ❌'}`);
  
  if (issues.length > 0) {
    console.log('\nRECOMMENDATIONS:');
    console.log('1. Fix all critical issues before production deployment');
    console.log('2. Implement comprehensive error monitoring');
    console.log('3. Optimize performance for better user experience');
    console.log('4. Add automated tests to prevent regression');
  }
  
  await browser.close();
}

runAssessment().catch(console.error);