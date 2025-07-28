const { chromium } = require('playwright');

// QA Review Script for Spicebush Montessori School Website
// Testing site running in Docker at http://localhost:4321

async function runQAReview() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const issues = [];
  const baseURL = 'http://localhost:4321';

  // Helper function to check for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        url: page.url(),
        message: msg.text()
      });
    }
  });

  // Helper function to check page load and images
  async function checkPage(name, path) {
    console.log(`\nTesting ${name}...`);
    try {
      const response = await page.goto(`${baseURL}${path}`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      if (!response.ok()) {
        issues.push({
          severity: 'HIGH',
          page: name,
          issue: `Page returned status ${response.status()}`,
          url: `${baseURL}${path}`
        });
        return false;
      }

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter(img => !img.complete || img.naturalHeight === 0)
          .map(img => ({
            src: img.src,
            alt: img.alt
          }));
      });

      if (brokenImages.length > 0) {
        issues.push({
          severity: 'MEDIUM',
          page: name,
          issue: 'Broken images found',
          details: brokenImages
        });
      }

      return true;
    } catch (error) {
      issues.push({
        severity: 'HIGH',
        page: name,
        issue: `Failed to load page: ${error.message}`,
        url: `${baseURL}${path}`
      });
      return false;
    }
  }

  // Test 1: Check all pages load
  console.log('=== TESTING PAGE LOADS ===');
  const pages = [
    { name: 'Homepage', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Programs', path: '/programs' },
    { name: 'Admissions', path: '/admissions' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Schedule Tour', path: '/schedule-tour' }
  ];

  for (const pageInfo of pages) {
    await checkPage(pageInfo.name, pageInfo.path);
  }

  // Test 2: Navigation functionality
  console.log('\n=== TESTING NAVIGATION ===');
  await page.goto(baseURL);
  
  // Test desktop navigation
  try {
    const navLinks = await page.$$('nav a');
    console.log(`Found ${navLinks.length} navigation links`);
    
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      if (href && !href.startsWith('http') && href !== '#') {
        try {
          await link.click();
          await page.waitForLoadState('networkidle');
          console.log(`✓ Navigation to ${text} (${href}) successful`);
        } catch (error) {
          issues.push({
            severity: 'HIGH',
            page: 'Navigation',
            issue: `Failed to navigate to ${text} (${href})`,
            error: error.message
          });
        }
        await page.goto(baseURL); // Return to homepage
      }
    }
  } catch (error) {
    issues.push({
      severity: 'HIGH',
      page: 'Navigation',
      issue: 'Navigation test failed',
      error: error.message
    });
  }

  // Test mobile navigation
  console.log('\n=== TESTING MOBILE NAVIGATION ===');
  await context.setViewportSize({ width: 375, height: 667 });
  await page.goto(baseURL);
  
  try {
    // Look for mobile menu button
    const mobileMenuButton = await page.$('[aria-label*="menu"], button:has-text("Menu"), .mobile-menu-button, .hamburger');
    
    if (mobileMenuButton) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);
      
      const mobileMenuVisible = await page.isVisible('nav[aria-expanded="true"], .mobile-menu:visible, .navigation-menu:visible');
      
      if (!mobileMenuVisible) {
        issues.push({
          severity: 'HIGH',
          page: 'Mobile Navigation',
          issue: 'Mobile menu does not open when clicked'
        });
      } else {
        console.log('✓ Mobile menu opens successfully');
      }
    } else {
      issues.push({
        severity: 'HIGH',
        page: 'Mobile Navigation',
        issue: 'Mobile menu button not found'
      });
    }
  } catch (error) {
    issues.push({
      severity: 'HIGH',
      page: 'Mobile Navigation',
      issue: 'Mobile navigation test failed',
      error: error.message
    });
  }

  // Reset viewport
  await context.setViewportSize({ width: 1920, height: 1080 });

  // Test 3: Forms functionality
  console.log('\n=== TESTING FORMS ===');
  
  // Test Schedule Tour form
  await page.goto(`${baseURL}/schedule-tour`);
  try {
    // Fill out the form
    await page.fill('input[name="parentName"], input[name="name"], input[type="text"]:first-of-type', 'Test Parent');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="phone"], input[type="tel"]', '555-123-4567');
    
    // Check if submit button exists
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      console.log('✓ Schedule Tour form fields can be filled');
    } else {
      issues.push({
        severity: 'HIGH',
        page: 'Schedule Tour',
        issue: 'Submit button not found on form'
      });
    }
  } catch (error) {
    issues.push({
      severity: 'HIGH',
      page: 'Schedule Tour',
      issue: 'Failed to interact with Schedule Tour form',
      error: error.message
    });
  }

  // Test 4: Tuition Calculator
  console.log('\n=== TESTING TUITION CALCULATOR ===');
  await page.goto(`${baseURL}/admissions`);
  
  try {
    // Look for tuition calculator
    const calculatorExists = await page.isVisible('.tuition-calculator, #tuition-calculator, [data-calculator]');
    
    if (calculatorExists) {
      // Try to interact with calculator
      const programSelect = await page.$('select[name*="program"], .program-select');
      if (programSelect) {
        await programSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        // Check if calculation result appears
        const resultVisible = await page.isVisible('.tuition-result, .calculation-result, .total-cost');
        if (resultVisible) {
          console.log('✓ Tuition calculator is functional');
        } else {
          issues.push({
            severity: 'MEDIUM',
            page: 'Tuition Calculator',
            issue: 'Calculator does not show results after selection'
          });
        }
      } else {
        issues.push({
          severity: 'MEDIUM',
          page: 'Tuition Calculator',
          issue: 'Program selection dropdown not found'
        });
      }
    } else {
      issues.push({
        severity: 'MEDIUM',
        page: 'Tuition Calculator',
        issue: 'Tuition calculator not found on Admissions page'
      });
    }
  } catch (error) {
    issues.push({
      severity: 'MEDIUM',
      page: 'Tuition Calculator',
      issue: 'Failed to test tuition calculator',
      error: error.message
    });
  }

  // Test 5: CMS Content
  console.log('\n=== TESTING CMS CONTENT ===');
  
  // Check blog posts
  await page.goto(`${baseURL}/blog`);
  const blogPosts = await page.$$('.blog-post, article, .post-card');
  if (blogPosts.length === 0) {
    issues.push({
      severity: 'HIGH',
      page: 'Blog',
      issue: 'No blog posts found - CMS content may not be rendering'
    });
  } else {
    console.log(`✓ Found ${blogPosts.length} blog posts`);
  }

  // Check staff on About page
  await page.goto(`${baseURL}/about`);
  const staffMembers = await page.$$('.staff-member, .team-member, [data-staff]');
  if (staffMembers.length === 0) {
    issues.push({
      severity: 'MEDIUM',
      page: 'About',
      issue: 'No staff members found - CMS content may not be rendering'
    });
  } else {
    console.log(`✓ Found ${staffMembers.length} staff members`);
  }

  // Check testimonials
  const testimonials = await page.$$('.testimonial, blockquote, [data-testimonial]');
  if (testimonials.length === 0) {
    issues.push({
      severity: 'LOW',
      page: 'Various',
      issue: 'No testimonials found - CMS content may not be rendering'
    });
  } else {
    console.log(`✓ Found ${testimonials.length} testimonials`);
  }

  // Test 6: Mobile Responsiveness
  console.log('\n=== TESTING MOBILE RESPONSIVENESS ===');
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    await context.setViewportSize(viewport);
    await page.goto(baseURL);
    
    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    if (hasHorizontalScroll) {
      issues.push({
        severity: 'MEDIUM',
        page: 'Homepage',
        issue: `Horizontal scroll detected at ${viewport.name} viewport (${viewport.width}x${viewport.height})`
      });
    } else {
      console.log(`✓ No horizontal scroll at ${viewport.name} viewport`);
    }
  }

  // Compile console errors
  if (consoleErrors.length > 0) {
    const uniqueErrors = {};
    consoleErrors.forEach(error => {
      const key = `${error.url}|${error.message}`;
      if (!uniqueErrors[key]) {
        uniqueErrors[key] = error;
      }
    });
    
    Object.values(uniqueErrors).forEach(error => {
      issues.push({
        severity: 'MEDIUM',
        page: error.url,
        issue: 'JavaScript console error',
        error: error.message
      });
    });
  }

  // Generate report
  console.log('\n\n=== QA REVIEW SUMMARY ===\n');
  
  if (issues.length === 0) {
    console.log('✅ No issues found! The website appears to be functioning correctly.');
  } else {
    console.log(`Found ${issues.length} issue(s):\n`);
    
    // Sort by severity
    const severityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.page}: ${issue.issue}`);
      if (issue.error) console.log(`   Error: ${issue.error}`);
      if (issue.details) console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`);
      if (issue.url) console.log(`   URL: ${issue.url}`);
      console.log('');
    });
  }

  await browser.close();
  return issues;
}

// Run the QA review
runQAReview().catch(console.error);