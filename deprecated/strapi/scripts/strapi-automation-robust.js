const { chromium } = require('playwright');

async function waitAndClick(page, selector, options = {}) {
  try {
    await page.waitForSelector(selector, { timeout: 10000, ...options });
    await page.click(selector);
    return true;
  } catch (e) {
    console.log(`Could not click: ${selector}`);
    return false;
  }
}

async function setupStrapiBlog() {
  console.log('🚀 Starting Strapi blog setup automation...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to Strapi admin
    console.log('📍 Navigating to Strapi admin...');
    await page.goto('http://localhost:1337/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Check if login is needed
    const emailInput = await page.$('input[name="email"]');
    if (emailInput) {
      console.log('🔐 Logging in to Strapi...');
      await page.fill('input[name="email"]', 'evey@eveywinters.com');
      await page.fill('input[name="password"]', 'rtp9RJK-rza.dxh3buk');
      await page.keyboard.press('Enter');
      
      // Wait for navigation after login
      await page.waitForURL('**/admin/**', { timeout: 10000 });
      await page.waitForTimeout(3000);
      console.log('✅ Logged in successfully');
    }
    
    // Navigate to Content-Type Builder - try multiple methods
    console.log('\n📝 Opening Content-Type Builder...');
    
    // Method 1: Direct navigation
    await page.goto('http://localhost:1337/admin/plugins/content-type-builder', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Create new collection type
    console.log('📦 Creating new collection type...');
    
    // Try to find the create button with various selectors
    const createClicked = await waitAndClick(page, 'button:has-text("Create new collection type")') ||
                         await waitAndClick(page, 'button:has-text("Create new Collection Type")') ||
                         await waitAndClick(page, 'button:has-text("Create")');
    
    if (!createClicked) {
      console.log('⚠️  Could not find create button, trying alternative approach...');
      // Try clicking any button that might be the create button
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('create') && text.toLowerCase().includes('collection')) {
          await button.click();
          break;
        }
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Enter display name
    console.log('📝 Setting display name: blog');
    
    // Try multiple selectors for the display name input
    const nameInput = await page.$('input[name="displayName"]') || 
                     await page.$('input[placeholder*="name"]') ||
                     await page.$('input[type="text"]');
    
    if (nameInput) {
      await nameInput.fill('blog');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
    } else {
      console.log('⚠️  Could not find display name input');
    }
    
    await page.waitForTimeout(2000);
    
    // Helper function to add fields with better error handling
    async function addField(fieldConfig) {
      console.log(`  Adding ${fieldConfig.name} field...`);
      
      try {
        // Click Add another field
        await waitAndClick(page, 'button:has-text("Add another field")') ||
        await waitAndClick(page, 'button:has-text("Add field")') ||
        await waitAndClick(page, 'button:has-text("Add")');
        
        await page.waitForTimeout(1500);
        
        // Select field category
        if (fieldConfig.category) {
          await waitAndClick(page, `button:has-text("${fieldConfig.category}")`);
          await page.waitForTimeout(1000);
        }
        
        // Select field type
        if (fieldConfig.type) {
          await waitAndClick(page, `button:has-text("${fieldConfig.type}")`);
          await page.waitForTimeout(1000);
        }
        
        // Enter field name
        const fieldNameInput = await page.$('input[name="name"]') || 
                              await page.$('input[placeholder*="name"]');
        if (fieldNameInput) {
          await fieldNameInput.fill(fieldConfig.name);
        }
        
        // Handle special configurations
        if (fieldConfig.name === 'slug') {
          // For UID field, select target field
          const select = await page.$('select');
          if (select) {
            await select.selectOption('title');
          }
        }
        
        if (fieldConfig.name === 'featured_image') {
          // For media field, select single media
          const singleMediaOption = await page.$('label:has-text("Single media")');
          if (singleMediaOption) {
            await singleMediaOption.click();
          }
        }
        
        // Handle advanced settings
        if (fieldConfig.required || fieldConfig.default) {
          await waitAndClick(page, 'button:has-text("Advanced settings")');
          await page.waitForTimeout(500);
          
          if (fieldConfig.required) {
            const requiredCheckbox = await page.$('label:has-text("Required field") input[type="checkbox"]');
            if (requiredCheckbox) {
              await requiredCheckbox.check();
            }
          }
          
          if (fieldConfig.default) {
            const defaultInput = await page.$('input[name="default"]');
            if (defaultInput) {
              await defaultInput.fill(fieldConfig.default);
            }
          }
        }
        
        // Click Finish
        await waitAndClick(page, 'button:has-text("Finish")');
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`    ⚠️  Error adding ${fieldConfig.name}: ${error.message}`);
      }
    }
    
    // Add all fields
    console.log('\n🔧 Adding fields...');
    
    const fields = [
      { name: 'title', category: 'Text', type: 'Short text', required: true },
      { name: 'content', category: 'Text', type: 'Rich text' },
      { name: 'author', category: 'Text', type: 'Short text', default: 'Marketing Team 2' },
      { name: 'publishDate', category: 'Date' },
      { name: 'slug', category: 'Text', type: 'UID' },
      { name: 'featured_image', category: 'Media' },
      { name: 'url', category: 'Text', type: 'Short text' }
    ];
    
    for (const field of fields) {
      await addField(field);
    }
    
    // Save content type
    console.log('\n💾 Saving content type...');
    await waitAndClick(page, 'button:has-text("Save")');
    
    console.log('⏳ Waiting for Strapi to restart (20 seconds)...');
    await page.waitForTimeout(20000);
    
    // Configure permissions
    console.log('\n🔐 Configuring permissions...');
    await page.goto('http://localhost:1337/admin/settings/users-permissions/roles', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Click on Public role
    const publicRole = await page.$('tr:has-text("Public")');
    if (publicRole) {
      await publicRole.click();
      await page.waitForTimeout(2000);
      
      // Find blog permissions
      console.log('  Setting public permissions for blog...');
      
      // Try to find and check the permissions
      const findCheckboxes = await page.$$('input[type="checkbox"]');
      for (const checkbox of findCheckboxes) {
        const parent = await checkbox.evaluateHandle(el => el.closest('label'));
        if (parent) {
          const text = await parent.evaluate(el => el.textContent);
          if (text && text.toLowerCase().includes('find') && text.toLowerCase().includes('blog')) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await checkbox.check();
            }
          }
        }
      }
      
      // Save permissions
      await waitAndClick(page, 'button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n✅ Setup process completed!');
    console.log('📌 Run this command to check if it worked: node scripts/setup-blog-strapi.js');
    
    // Keep browser open for verification
    console.log('\n⏰ Closing browser in 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 The browser will remain open for manual intervention...');
    
    // Show current URL for debugging
    console.log('Current URL:', page.url());
    
    // Keep browser open for manual completion
    await page.waitForTimeout(60000);
  } finally {
    await browser.close();
  }
}

// Run the setup
setupStrapiBlog().catch(console.error);