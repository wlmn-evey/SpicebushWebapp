const { chromium } = require('playwright');

async function setupStrapiBlog() {
  console.log('🚀 Starting Strapi blog setup with Playwright...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to Strapi admin
    console.log('📍 Navigating to Strapi admin...');
    await page.goto('http://localhost:1337/admin');
    await page.waitForLoadState('networkidle');
    
    // Check if login is needed
    if (await page.locator('input[name="email"]').isVisible()) {
      console.log('🔐 Logging in to Strapi...');
      await page.fill('input[name="email"]', 'evey@eveywinters.com');
      await page.fill('input[name="password"]', 'rtp9RJK-rza.dxh3buk');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      console.log('✅ Logged in successfully');
    }
    
    // Navigate to Content-Type Builder
    console.log('\n📝 Opening Content-Type Builder...');
    await page.click('text=Content-Type Builder');
    await page.waitForLoadState('networkidle');
    
    // Create new collection type
    console.log('📦 Creating new collection type...');
    await page.click('text=Create new collection type');
    await page.waitForTimeout(1000);
    
    // Enter display name
    console.log('📝 Setting display name: blog');
    await page.fill('input[name="displayName"]', 'blog');
    await page.press('input[name="displayName"]', 'Enter');
    await page.waitForTimeout(1000);
    
    // Add fields
    console.log('\n🔧 Adding fields...');
    
    // Field 1: Title
    console.log('  Adding title field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Text")');
    await page.click('text=Short text');
    await page.fill('input[name="name"]', 'title');
    await page.click('text=Advanced settings');
    await page.check('text=Required field');
    await page.click('button:has-text("Finish")');
    
    // Field 2: Content
    console.log('  Adding content field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Text")');
    await page.click('text=Rich text');
    await page.fill('input[name="name"]', 'content');
    await page.click('button:has-text("Finish")');
    
    // Field 3: Author
    console.log('  Adding author field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Text")');
    await page.click('text=Short text');
    await page.fill('input[name="name"]', 'author');
    await page.click('text=Advanced settings');
    await page.fill('input[name="default"]', 'Marketing Team 2');
    await page.click('button:has-text("Finish")');
    
    // Field 4: Publish Date
    console.log('  Adding publishDate field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Date")');
    await page.fill('input[name="name"]', 'publishDate');
    await page.click('button:has-text("Finish")');
    
    // Field 5: Slug
    console.log('  Adding slug field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Text")');
    await page.click('text=UID');
    await page.fill('input[name="name"]', 'slug');
    await page.selectOption('select', 'title');
    await page.click('button:has-text("Finish")');
    
    // Field 6: Featured Image
    console.log('  Adding featured_image field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Media")');
    await page.fill('input[name="name"]', 'featured_image');
    await page.click('text=Single media');
    await page.click('button:has-text("Finish")');
    
    // Field 7: URL
    console.log('  Adding url field...');
    await page.click('text=Add another field');
    await page.click('button:has-text("Text")');
    await page.click('text=Short text');
    await page.fill('input[name="name"]', 'url');
    await page.click('button:has-text("Finish")');
    
    // Save content type
    console.log('\n💾 Saving content type...');
    await page.click('button:has-text("Save")');
    
    console.log('⏳ Waiting for Strapi to restart (20 seconds)...');
    await page.waitForTimeout(20000);
    
    // Configure permissions
    console.log('\n🔐 Configuring permissions...');
    await page.goto('http://localhost:1337/admin/settings/users-permissions/roles');
    await page.waitForLoadState('networkidle');
    
    // Click on Public role
    await page.click('tr:has-text("Public")');
    await page.waitForTimeout(2000);
    
    // Expand blog section and check permissions
    console.log('  Setting public permissions for blog...');
    
    // Try to expand blog section if collapsed
    const blogSection = page.locator('text=Blog').first();
    if (await blogSection.isVisible()) {
      await blogSection.click();
    }
    
    // Check find and findOne
    await page.check('label:has-text("find") input[type="checkbox"]');
    await page.check('label:has-text("findOne") input[type="checkbox"]');
    
    // Save permissions
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
    
    console.log('\n✅ Blog content type created successfully!');
    console.log('📌 You can now run: node scripts/setup-blog-strapi.js');
    
    // Keep browser open for 5 seconds
    console.log('\n⏰ Closing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Keeping browser open for manual completion...');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
  }
}

// Run the setup
setupStrapiBlog();