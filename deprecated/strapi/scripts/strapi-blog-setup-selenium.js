const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupStrapiBlog() {
  console.log('🚀 Starting Strapi blog setup automation with Selenium...\n');
  
  // Configure Chrome options
  const options = new chrome.Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.excludeSwitches('enable-automation');
  
  // Build the driver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Navigate to Strapi admin
    console.log('📍 Navigating to Strapi admin...');
    await driver.get('http://localhost:1337/admin');
    await sleep(3000);
    
    // Check if we need to login
    try {
      await driver.wait(until.elementLocated(By.css('nav, input[name="email"]')), 5000);
      
      const loginInputs = await driver.findElements(By.css('input[name="email"]'));
      if (loginInputs.length > 0) {
        console.log('🔐 Logging in to Strapi...');
        
        // Enter email
        const emailInput = await driver.findElement(By.name('email'));
        await emailInput.sendKeys('evey@eveywinters.com');
        
        // Enter password
        const passwordInput = await driver.findElement(By.name('password'));
        await passwordInput.sendKeys('rtp9RJK-rza.dxh3buk');
        
        // Click login button
        const loginButton = await driver.findElement(By.xpath("//button[@type='submit']"));
        await loginButton.click();
        
        // Wait for login to complete
        await sleep(3000);
        console.log('✅ Successfully logged in to Strapi');
      } else {
        console.log('✅ Already logged in to Strapi');
      }
    } catch (e) {
      console.log('⚠️  Could not determine login status, attempting to continue...');
    }
    
    // Click on Content-Type Builder
    console.log('\n📝 Opening Content-Type Builder...');
    await sleep(2000); // Wait for navigation to load
    
    try {
      // Try different selectors for Content-Type Builder
      let clicked = false;
      
      // Try by link text
      try {
        const ctbLink = await driver.findElement(By.linkText('Content-Type Builder'));
        await ctbLink.click();
        clicked = true;
      } catch (e) {
        // Try by partial link text
        try {
          const ctbLink = await driver.findElement(By.partialLinkText('Content-Type'));
          await ctbLink.click();
          clicked = true;
        } catch (e2) {
          // Try by href
          const ctbLink = await driver.findElement(By.css('a[href*="content-type-builder"]'));
          await ctbLink.click();
          clicked = true;
        }
      }
      
      if (!clicked) {
        throw new Error('Could not find Content-Type Builder link');
      }
    } catch (e) {
      console.error('Could not find Content-Type Builder link:', e.message);
      throw e;
    }
    
    await sleep(3000);
    
    // Click Create new collection type
    console.log('📦 Creating new collection type...');
    const createButton = await driver.findElement(By.xpath("//button[contains(text(), 'Create new collection type')]"));
    await createButton.click();
    await sleep(2000);
    
    // Enter display name
    console.log('📝 Setting display name: blog');
    const displayNameInput = await driver.findElement(By.name('displayName'));
    await displayNameInput.sendKeys('blog');
    
    // Click Continue
    const continueButton = await driver.findElement(By.xpath("//button[@type='submit']"));
    await continueButton.click();
    await sleep(2000);
    
    // Helper function to add fields
    async function addField(fieldType, fieldName, options = {}) {
      console.log(`  Adding ${fieldName} field...`);
      
      // Click Add another field
      const addFieldButton = await driver.findElement(By.xpath("//button[contains(text(), 'Add another field')]"));
      await addFieldButton.click();
      await sleep(1500);
      
      // Select field type
      switch(fieldType) {
        case 'text-short':
          await driver.findElement(By.xpath("//button[text()='Text']")).click();
          await sleep(1000);
          await driver.findElement(By.xpath("//button[contains(text(), 'Short text')]")).click();
          break;
        case 'text-rich':
          await driver.findElement(By.xpath("//button[text()='Text']")).click();
          await sleep(1000);
          await driver.findElement(By.xpath("//button[contains(text(), 'Rich text')]")).click();
          break;
        case 'uid':
          await driver.findElement(By.xpath("//button[text()='Text']")).click();
          await sleep(1000);
          await driver.findElement(By.xpath("//button[contains(text(), 'UID')]")).click();
          break;
        case 'date':
          await driver.findElement(By.xpath("//button[text()='Date']")).click();
          break;
        case 'media':
          await driver.findElement(By.xpath("//button[text()='Media']")).click();
          break;
      }
      await sleep(1500);
      
      // Enter field name
      const nameInput = await driver.findElement(By.name('name'));
      await nameInput.clear();
      await nameInput.sendKeys(fieldName);
      
      // Handle UID target field
      if (fieldType === 'uid' && options.targetField) {
        await sleep(500);
        const select = await driver.findElement(By.css('select'));
        await select.sendKeys(options.targetField);
      }
      
      // Handle media configuration
      if (fieldType === 'media') {
        const singleMediaRadio = await driver.findElement(By.xpath("//label[contains(text(), 'Single media')]//input[@type='radio']"));
        await singleMediaRadio.click();
      }
      
      // Handle advanced settings
      if (options.required || options.default) {
        const advancedButton = await driver.findElement(By.xpath("//button[contains(text(), 'Advanced settings')]"));
        await advancedButton.click();
        await sleep(500);
        
        if (options.required) {
          const requiredCheckbox = await driver.findElement(By.xpath("//label[contains(text(), 'Required field')]//input[@type='checkbox']"));
          const isChecked = await requiredCheckbox.isSelected();
          if (!isChecked) {
            await requiredCheckbox.click();
          }
        }
        
        if (options.default) {
          const defaultInput = await driver.findElement(By.name('default'));
          await defaultInput.sendKeys(options.default);
        }
      }
      
      // Click Finish
      const finishButton = await driver.findElement(By.xpath("//button[text()='Finish']"));
      await finishButton.click();
      await sleep(2000);
    }
    
    // Add all fields
    console.log('\n🔧 Adding fields...');
    await addField('text-short', 'title', { required: true });
    await addField('text-rich', 'content');
    await addField('text-short', 'author', { default: 'Marketing Team 2' });
    await addField('date', 'publishDate');
    await addField('uid', 'slug', { targetField: 'title' });
    await addField('media', 'featured_image');
    await addField('text-short', 'url');
    
    // Save the content type
    console.log('\n💾 Saving content type...');
    const saveButton = await driver.findElement(By.xpath("//button[text()='Save']"));
    await saveButton.click();
    
    // Wait for Strapi to restart
    console.log('⏳ Waiting for Strapi to restart (15 seconds)...');
    await sleep(15000);
    
    // Navigate to Settings > Roles
    console.log('\n🔐 Configuring permissions...');
    await driver.get('http://localhost:1337/admin/settings/users-permissions/roles');
    await sleep(3000);
    
    // Click on Public role
    const publicRole = await driver.findElement(By.xpath("//tr[contains(., 'Public')]"));
    await publicRole.click();
    await sleep(3000);
    
    // Find blog section and expand it
    console.log('  Setting public permissions for blog...');
    try {
      const blogSection = await driver.findElement(By.xpath("//div[contains(text(), 'Blog')]"));
      const expandButton = await blogSection.findElement(By.xpath(".//button"));
      await expandButton.click();
      await sleep(1000);
    } catch (e) {
      console.log('  Blog section might already be expanded');
    }
    
    // Check find and findOne permissions
    const findCheckboxes = await driver.findElements(By.xpath("//label[contains(text(), 'find')]//input[@type='checkbox']"));
    for (const checkbox of findCheckboxes) {
      const label = await checkbox.findElement(By.xpath("..")).getText();
      if (label.includes('Blog')) {
        const isChecked = await checkbox.isSelected();
        if (!isChecked) {
          await checkbox.click();
        }
      }
    }
    
    // Save permissions
    const savePermissionsButton = await driver.findElement(By.xpath("//button[text()='Save']"));
    await savePermissionsButton.click();
    await sleep(3000);
    
    console.log('\n✅ Blog content type created successfully!');
    console.log('📌 You can now run: node scripts/setup-blog-strapi.js');
    
    // Keep browser open for 5 seconds
    console.log('\n⏰ Closing browser in 5 seconds...');
    await sleep(5000);
    
  } catch (error) {
    console.error('❌ Error during automation:', error.message);
    console.log('\n💡 Tips:');
    console.log('  - Make sure you are logged into Strapi admin');
    console.log('  - Make sure Strapi is running at http://localhost:1337');
    console.log('  - Check if Chrome browser is up to date');
  } finally {
    await driver.quit();
  }
}

// Run the automation
setupStrapiBlog().catch(console.error);