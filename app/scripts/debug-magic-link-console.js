import { chromium } from 'playwright';

async function debugMagicLink() {
  console.log('🔍 Debugging Magic Link Console Errors');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleMessages = [];
  const pageErrors = [];
  const networkErrors = [];
  
  // Capture all console messages
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };
    consoleMessages.push(entry);
    
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  // Capture failed network requests
  page.on('requestfailed', request => {
    const failure = {
      url: request.url(),
      error: request.failure().errorText
    };
    networkErrors.push(failure);
    console.log(`❌ Network Error: ${request.url()} - ${request.failure().errorText}`);
  });
  
  // Intercept and log API calls
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('auth')) {
      console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('supabase') || response.url().includes('auth')) {
      console.log(`📥 API Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('\n📍 Loading page...');
    await page.goto('https://spicebush-testing.netlify.app/auth/magic-login', {
      waitUntil: 'networkidle'
    });
    
    // Check if Supabase is configured
    const supabaseConfig = await page.evaluate(() => {
      try {
        // Check if environment variables are available
        const hasSupabaseUrl = typeof import.meta !== 'undefined' && 
                              import.meta.env && 
                              import.meta.env.PUBLIC_SUPABASE_URL;
        const hasSupabaseKey = typeof import.meta !== 'undefined' && 
                              import.meta.env && 
                              import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
        
        return {
          hasSupabaseUrl,
          hasSupabaseKey,
          windowHasAuth: typeof window.auth !== 'undefined'
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\n🔧 Supabase Configuration:', supabaseConfig);
    
    // Try to send a magic link
    console.log('\n📧 Testing magic link send...');
    await page.fill('#email', 'test@spicebushmontessori.org');
    
    // Monitor console before clicking
    console.log('🔘 Clicking send button...');
    await page.click('#submit-button');
    
    // Wait for any response
    await page.waitForTimeout(5000);
    
    // Check final state
    const finalState = await page.evaluate(() => {
      const successVisible = document.querySelector('#success-message')?.classList.contains('hidden') === false;
      const alertVisible = document.querySelector('#auth-alert')?.classList.contains('hidden') === false;
      const alertMessage = document.querySelector('#auth-alert-message')?.textContent;
      const buttonDisabled = document.querySelector('#submit-button')?.disabled;
      
      return {
        successVisible,
        alertVisible,
        alertMessage,
        buttonDisabled
      };
    });
    
    console.log('\n📊 Final State:', finalState);
    
    // Summary
    console.log('\n📋 Error Summary:');
    console.log(`- Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`- Page Errors: ${pageErrors.length}`);
    console.log(`- Network Errors: ${networkErrors.length}`);
    
    if (consoleMessages.filter(m => m.type === 'error').length > 0) {
      console.log('\n🔍 Console Error Details:');
      consoleMessages.filter(m => m.type === 'error').forEach(msg => {
        console.log(`  - ${msg.text}`);
        if (msg.location) {
          console.log(`    at ${msg.location.url}:${msg.location.lineNumber}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Debug complete');
  }
}

debugMagicLink().catch(console.error);