import { chromium } from 'playwright';
import fs from 'fs/promises';

const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';
const PERFORMANCE_THRESHOLD = 3000; // 3 seconds

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  siteUrl: SITE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper to measure page load time
async function measurePageLoad(page, url, name) {
  const startTime = Date.now();
  let httpStatus = null;
  let error = null;
  
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    httpStatus = response.status();
  } catch (e) {
    error = e.message;
  }
  
  const loadTime = Date.now() - startTime;
  
  return {
    name,
    url,
    loadTime,
    httpStatus,
    error,
    passed: !error && httpStatus === 200 && loadTime < PERFORMANCE_THRESHOLD,
    warning: loadTime >= PERFORMANCE_THRESHOLD && loadTime < 5000
  };
}

// Main test runner
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Verification Tests');
  console.log(`Testing site at: ${SITE_URL}`);
  console.log(`Performance threshold: ${PERFORMANCE_THRESHOLD}ms`);
  console.log('─'.repeat(50));
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Define pages to test
  const pagesToTest = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About Page' },
    { path: '/admissions', name: 'Admissions Page' },
    { path: '/programs', name: 'Programs Page' },
    { path: '/contact', name: 'Contact Page' },
    { path: '/tuition-calculator', name: 'Tuition Calculator' },
    { path: '/blog', name: 'Blog Page' },
    { path: '/calendar', name: 'Calendar Page' }
  ];
  
  // Test each page
  for (const testPage of pagesToTest) {
    const result = await measurePageLoad(
      page, 
      `${SITE_URL}${testPage.path}`, 
      testPage.name
    );
    
    testResults.tests.push(result);
    testResults.summary.total++;
    
    if (result.error || result.httpStatus !== 200) {
      testResults.summary.failed++;
      console.log(`❌ ${result.name}: ${result.error || `HTTP ${result.httpStatus}`}`);
    } else if (result.warning) {
      testResults.summary.warnings++;
      console.log(`⚠️  ${result.name}: ${result.loadTime}ms (exceeds threshold)`);
    } else {
      testResults.summary.passed++;
      console.log(`✅ ${result.name}: ${result.loadTime}ms`);
    }
  }
  
  console.log('─'.repeat(50));
  
  // Additional performance checks
  console.log('\n📊 Additional Performance Metrics:');
  
  // Check for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Navigate to homepage for resource analysis
  await page.goto(`${SITE_URL}/`, { waitUntil: 'networkidle' });
  
  // Check for large resources
  const performanceMetrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const largeResources = resources.filter(r => r.transferSize > 500000); // 500KB
    
    return {
      totalResources: resources.length,
      largeResources: largeResources.map(r => ({
        name: r.name,
        size: Math.round(r.transferSize / 1024) + 'KB',
        duration: Math.round(r.duration) + 'ms'
      })),
      domContentLoaded: Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart),
      fullyLoaded: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart)
    };
  });
  
  console.log(`Total resources loaded: ${performanceMetrics.totalResources}`);
  console.log(`DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
  console.log(`Fully Loaded: ${performanceMetrics.fullyLoaded}ms`);
  
  if (performanceMetrics.largeResources.length > 0) {
    console.log('\n⚠️  Large resources detected:');
    performanceMetrics.largeResources.forEach(r => {
      console.log(`  - ${r.name}: ${r.size} (${r.duration})`);
    });
  }
  
  if (consoleErrors.length > 0) {
    console.log('\n❌ Console errors detected:');
    consoleErrors.forEach(err => console.log(`  - ${err}`));
    testResults.consoleErrors = consoleErrors;
  }
  
  testResults.performanceMetrics = performanceMetrics;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 TEST SUMMARY:');
  console.log(`Total tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  
  const avgLoadTime = Math.round(
    testResults.tests.reduce((sum, t) => sum + (t.loadTime || 0), 0) / testResults.tests.length
  );
  console.log(`\nAverage page load time: ${avgLoadTime}ms`);
  
  if (testResults.summary.failed === 0 && avgLoadTime < PERFORMANCE_THRESHOLD) {
    console.log('\n🎉 All performance tests passed!');
    console.log('The site is loading properly without HTTP 500 errors.');
    console.log(`Average load time (${avgLoadTime}ms) is well below the ${PERFORMANCE_THRESHOLD}ms threshold.`);
  } else if (testResults.summary.failed > 0) {
    console.log('\n❌ Some tests failed. Please check the errors above.');
  } else if (avgLoadTime >= PERFORMANCE_THRESHOLD) {
    console.log(`\n⚠️  Performance issues detected. Average load time exceeds ${PERFORMANCE_THRESHOLD}ms.`);
  }
  
  // Write detailed results to file
  await fs.writeFile(
    'performance-test-results.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('\nDetailed results saved to: performance-test-results.json');
  
  await browser.close();
  
  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run tests
runPerformanceTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});