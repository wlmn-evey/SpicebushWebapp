import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:4321';

// Pages to test
const PAGES = [
  '/',
  '/about',
  '/admissions',
  '/admissions/schedule-tour',
  '/admissions/tuition-calculator',
  '/blog',
  '/contact',
  '/donate',
  '/resources/faq',
  '/our-principles'
];

// Store all issues found
const issues = {
  consoleErrors: [],
  networkErrors: [],
  brokenImages: [],
  missingElements: [],
  formIssues: [],
  mobileIssues: []
};

async function testPage(browser, url, pageName) {
  console.log(`\n📄 Testing ${pageName} (${url})...`);
  const page = await browser.newPage();
  
  // Set up error tracking
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        page: pageName,
        message: msg.text(),
        location: msg.location()
      });
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push({
      page: pageName,
      message: error.message,
      stack: error.stack
    });
  });
  
  page.on('requestfailed', request => {
    networkErrors.push({
      page: pageName,
      url: request.url(),
      error: request.failure().errorText
    });
  });
  
  try {
    // Navigate to page
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Check response status
    if (response.status() >= 400) {
      issues.networkErrors.push({
        page: pageName,
        status: response.status(),
        url: url
      });
    }
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    // Check for images
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        displayed: img.offsetWidth > 0 && img.offsetHeight > 0
      }));
    });
    
    // Find broken images
    const brokenImages = images.filter(img => 
      !img.complete || 
      img.naturalWidth === 0 || 
      img.naturalHeight === 0 ||
      !img.displayed
    );
    
    if (brokenImages.length > 0) {
      brokenImages.forEach(img => {
        issues.brokenImages.push({
          page: pageName,
          src: img.src,
          alt: img.alt,
          reason: !img.complete ? 'not loaded' : 
                  img.naturalWidth === 0 ? 'zero width' :
                  img.naturalHeight === 0 ? 'zero height' :
                  'not displayed'
        });
      });
    }
    
    // Add console errors to issues
    if (consoleErrors.length > 0) {
      issues.consoleErrors.push(...consoleErrors);
    }
    
    // Add network errors to issues
    if (networkErrors.length > 0) {
      issues.networkErrors.push(...networkErrors);
    }
    
    console.log(`  ✓ Page loaded successfully`);
    console.log(`  ℹ Images: ${images.length} total, ${brokenImages.length} broken`);
    console.log(`  ℹ Console errors: ${consoleErrors.length}`);
    console.log(`  ℹ Network errors: ${networkErrors.length}`);
    
  } catch (error) {
    console.error(`  ✗ Error testing page: ${error.message}`);
    issues.networkErrors.push({
      page: pageName,
      error: error.message
    });
  } finally {
    await page.close();
  }
}

async function testSpecificFunctionality(browser) {
  console.log('\n🔧 Testing Specific Functionality...\n');
  
  // Test Schedule Tour Form
  console.log('Testing Schedule Tour Form...');
  const tourPage = await browser.newPage();
  try {
    await tourPage.goto(`${BASE_URL}/admissions/schedule-tour`, { waitUntil: 'networkidle2' });
    
    // Check for form
    const hasForm = await tourPage.$('form') !== null;
    const formInputs = await tourPage.$$eval('form input, form textarea, form select', 
      els => els.map(el => ({ 
        type: el.type || el.tagName.toLowerCase(), 
        name: el.name,
        required: el.required 
      }))
    );
    
    if (!hasForm) {
      issues.formIssues.push({
        page: 'Schedule Tour',
        issue: 'No form element found'
      });
    } else {
      console.log(`  ✓ Form found with ${formInputs.length} inputs`);
      console.log(`  ✓ Required fields: ${formInputs.filter(i => i.required).length}`);
    }
  } catch (error) {
    issues.formIssues.push({
      page: 'Schedule Tour',
      issue: error.message
    });
  } finally {
    await tourPage.close();
  }
  
  // Test Tuition Calculator
  console.log('\nTesting Tuition Calculator...');
  const calcPage = await browser.newPage();
  try {
    await calcPage.goto(`${BASE_URL}/admissions/tuition-calculator`, { waitUntil: 'networkidle2' });
    
    // Check for calculator elements
    const hasCalculator = await calcPage.$('.tuition-calculator, [data-tuition-calculator]') !== null;
    const hasSelects = await calcPage.$$('select, input[type="radio"]');
    const hasResults = await calcPage.$('.results, .tuition-results, [data-results]') !== null;
    
    console.log(`  ✓ Calculator found: ${hasCalculator}`);
    console.log(`  ✓ Selection inputs: ${hasSelects.length}`);
    console.log(`  ✓ Results area found: ${hasResults}`);
    
    // Try to interact with calculator
    if (hasSelects.length > 0) {
      // Click first radio or select first option
      await hasSelects[0].click();
      await calcPage.waitForTimeout(500);
    }
    
  } catch (error) {
    issues.formIssues.push({
      page: 'Tuition Calculator',
      issue: error.message
    });
  } finally {
    await calcPage.close();
  }
  
  // Test FAQ Accordion
  console.log('\nTesting FAQ Accordion...');
  const faqPage = await browser.newPage();
  try {
    await faqPage.goto(`${BASE_URL}/resources/faq`, { waitUntil: 'networkidle2' });
    
    // Check for FAQ items
    const faqItems = await faqPage.$$('details, .faq-item, [data-faq-item]');
    console.log(`  ✓ Found ${faqItems.length} FAQ items`);
    
    if (faqItems.length > 0) {
      // Try to click first FAQ
      const firstItem = faqItems[0];
      const isDetails = await firstItem.evaluate(el => el.tagName.toLowerCase() === 'details');
      
      if (isDetails) {
        const summary = await firstItem.$('summary');
        if (summary) {
          await summary.click();
          await faqPage.waitForTimeout(500);
          const isOpen = await firstItem.evaluate(el => el.open);
          console.log(`  ✓ First FAQ item ${isOpen ? 'opened' : 'failed to open'}`);
        }
      }
    } else {
      issues.missingElements.push({
        page: 'FAQ',
        element: 'FAQ items'
      });
    }
    
  } catch (error) {
    issues.missingElements.push({
      page: 'FAQ',
      issue: error.message
    });
  } finally {
    await faqPage.close();
  }
}

async function testMobileView(browser) {
  console.log('\n📱 Testing Mobile View...\n');
  
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Check for mobile menu
    const mobileMenu = await page.$('[aria-label*="menu"], .mobile-menu, .hamburger, button:has-text("Menu")');
    const hasBottomNav = await page.$('.mobile-bottom-nav, nav.fixed.bottom-0, [data-mobile-nav]') !== null;
    
    console.log(`  ✓ Mobile menu found: ${mobileMenu !== null}`);
    console.log(`  ✓ Bottom navigation found: ${hasBottomNav}`);
    
    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    
    if (hasHorizontalScroll) {
      issues.mobileIssues.push({
        page: 'Homepage',
        issue: 'Horizontal scroll detected on mobile'
      });
    }
    
    console.log(`  ✓ No horizontal scroll: ${!hasHorizontalScroll}`);
    
  } catch (error) {
    issues.mobileIssues.push({
      page: 'Mobile Test',
      issue: error.message
    });
  } finally {
    await page.close();
  }
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Browser Tests...');
  console.log(`Testing: ${BASE_URL}\n`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Test all pages
    for (const path of PAGES) {
      await testPage(browser, BASE_URL + path, path);
    }
    
    // Test specific functionality
    await testSpecificFunctionality(browser);
    
    // Test mobile view
    await testMobileView(browser);
    
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST REPORT SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  let totalIssues = 0;
  
  // Console Errors
  if (issues.consoleErrors.length > 0) {
    console.log(`\n❌ CONSOLE ERRORS (${issues.consoleErrors.length}):`);
    issues.consoleErrors.forEach(err => {
      console.log(`  📄 ${err.page}: ${err.message}`);
    });
    totalIssues += issues.consoleErrors.length;
  }
  
  // Network Errors
  if (issues.networkErrors.length > 0) {
    console.log(`\n❌ NETWORK ERRORS (${issues.networkErrors.length}):`);
    issues.networkErrors.forEach(err => {
      console.log(`  📄 ${err.page}: ${err.url || err.error} ${err.status ? `(${err.status})` : ''}`);
    });
    totalIssues += issues.networkErrors.length;
  }
  
  // Broken Images
  if (issues.brokenImages.length > 0) {
    console.log(`\n🖼️  BROKEN IMAGES (${issues.brokenImages.length}):`);
    issues.brokenImages.forEach(img => {
      console.log(`  📄 ${img.page}: ${img.src}`);
      console.log(`     Alt: "${img.alt}" | Reason: ${img.reason}`);
    });
    totalIssues += issues.brokenImages.length;
  }
  
  // Form Issues
  if (issues.formIssues.length > 0) {
    console.log(`\n📝 FORM ISSUES (${issues.formIssues.length}):`);
    issues.formIssues.forEach(issue => {
      console.log(`  📄 ${issue.page}: ${issue.issue}`);
    });
    totalIssues += issues.formIssues.length;
  }
  
  // Missing Elements
  if (issues.missingElements.length > 0) {
    console.log(`\n⚠️  MISSING ELEMENTS (${issues.missingElements.length}):`);
    issues.missingElements.forEach(issue => {
      console.log(`  📄 ${issue.page}: ${issue.element || issue.issue}`);
    });
    totalIssues += issues.missingElements.length;
  }
  
  // Mobile Issues
  if (issues.mobileIssues.length > 0) {
    console.log(`\n📱 MOBILE ISSUES (${issues.mobileIssues.length}):`);
    issues.mobileIssues.forEach(issue => {
      console.log(`  📄 ${issue.page}: ${issue.issue}`);
    });
    totalIssues += issues.mobileIssues.length;
  }
  
  console.log('\n' + '='.repeat(60));
  if (totalIssues === 0) {
    console.log('✅ ALL TESTS PASSED! No issues found.');
  } else {
    console.log(`❌ TOTAL ISSUES FOUND: ${totalIssues}`);
    console.log('\nPRIORITY FIXES:');
    console.log('1. Fix any 404 errors (missing /programs page)');
    console.log('2. Ensure Schedule Tour form is properly rendered');
    console.log('3. Fix any broken images');
    console.log('4. Address JavaScript console errors');
    console.log('5. Verify mobile navigation functionality');
  }
  console.log('='.repeat(60) + '\n');
}

// Run the tests
runTests().catch(console.error);