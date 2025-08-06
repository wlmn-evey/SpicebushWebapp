import { chromium } from 'playwright';

async function checkSupabaseConfig() {
  console.log('🔍 Checking Supabase Configuration on Live Site\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the magic login page
    await page.goto('https://spicebush-testing.netlify.app/auth/magic-login');
    
    // Check if the page loads without errors
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);
    
    // Try to trigger the magic link function
    await page.fill('#email', 'test@spicebushmontessori.org');
    
    // Intercept the Supabase API call
    let supabaseCallMade = false;
    let supabaseError = null;
    
    page.on('request', request => {
      if (request.url().includes('supabase.co')) {
        supabaseCallMade = true;
        console.log(`\n🌐 Supabase API Call: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('supabase.co')) {
        console.log(`📥 Supabase Response: ${response.status()}`);
        if (response.status() >= 400) {
          supabaseError = `HTTP ${response.status()}`;
        }
      }
    });
    
    // Click the button
    await page.click('#submit-button');
    
    // Wait for potential API call
    await page.waitForTimeout(3000);
    
    // Check results
    const alertVisible = await page.isVisible('#auth-alert');
    const successVisible = await page.isVisible('#success-message');
    
    if (!supabaseCallMade) {
      console.log('\n❌ No Supabase API call was made!');
      console.log('This suggests:');
      console.log('1. Supabase client is not initialized (missing env vars)');
      console.log('2. JavaScript error preventing the call');
      console.log('3. Form validation failing client-side');
    }
    
    if (alertVisible) {
      const alertText = await page.textContent('#auth-alert-message');
      console.log(`\n⚠️ Alert shown: ${alertText}`);
    }
    
    if (successVisible) {
      console.log('\n✅ Success message shown - magic link sent!');
    }
    
    if (!alertVisible && !successVisible && !supabaseCallMade) {
      console.log('\n❓ No response detected - likely a client-side error');
    }
    
    // Check console for specific Supabase error
    await page.evaluate(() => {
      console.log('Checking Supabase in browser context...');
    });
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check if PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set in Netlify');
  console.log('2. Verify the environment variables are available during build');
  console.log('3. Check browser console for specific JavaScript errors');
}

checkSupabaseConfig().catch(console.error);