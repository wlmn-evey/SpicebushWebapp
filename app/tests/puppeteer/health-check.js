const puppeteer = require('puppeteer');

const TEST_URL = 'https://spicebush-testing.netlify.app';

async function healthCheck() {
  console.log('🧪 Testing site health...');
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    const page = await browser.newPage();
    console.log('📍 Navigating to:', TEST_URL);
    
    const response = await page.goto(TEST_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    const status = response.status();
    const timestamp = new Date().toISOString();
    
    await page.screenshot({ 
      path: `tests/screenshots/health-${Date.now()}.png`,
      fullPage: true
    });
    
    if (status >= 500) {
      throw new Error(`Server error: ${status}`);
    }
    
    console.log(`✅ Site responding: ${status}`);
    console.log(`📸 Screenshot saved`);
    console.log(`⏰ Tested at: ${timestamp}`);
    
    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate to auth page
    console.log('📍 Testing auth page...');
    await page.goto(`${TEST_URL}/auth/sign-in`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.screenshot({ 
      path: `tests/screenshots/auth-${Date.now()}.png`
    });
    
    const authUrl = page.url();
    console.log(`✅ Auth page loaded: ${authUrl}`);
    
    // Summary
    console.log('\n📊 Health Check Results:');
    console.log(`  Site Status: ${status === 200 ? '✅' : '❌'} (${status})`);
    console.log(`  Auth Page: ${authUrl.includes('auth') ? '✅' : '❌'}`);
    console.log(`  Console Errors: ${errors.length === 0 ? '✅ None' : `❌ ${errors.length} errors`}`);
    
    return { 
      success: status === 200, 
      status,
      authWorks: authUrl.includes('auth'),
      errors: errors.length
    };
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  healthCheck().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { healthCheck };