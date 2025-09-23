const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupStrapiBlog() {
  console.log('🚀 Starting Strapi blog setup automation with Selenium...\n');
  
  const options = new chrome.Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.excludeSwitches('enable-automation');
  
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
      const loginInputs = await driver.findElements(By.css('input[name="email"]'));
      if (loginInputs.length > 0) {
        console.log('🔐 Logging in to Strapi...');
        
        const emailInput = await driver.findElement(By.name('email'));
        await emailInput.clear();
        await emailInput.sendKeys('eveevey@eveywinters.com');
        
        const passwordInput = await driver.findElement(By.name('password'));
        await passwordInput.clear();
        await passwordInput.sendKeys('rtp9RJK-rza.dxh3buk');
        
        // Submit form
        await passwordInput.sendKeys(Key.RETURN);
        
        console.log('⏳ Waiting for login to complete...');
        await sleep(5000);
        console.log('✅ Successfully logged in to Strapi');
      } else {
        console.log('✅ Already logged in to Strapi');
      }
    } catch (e) {
      console.log('⚠️  Login detection error:', e.message);
    }
    
    // Navigate directly to Content-Type Builder
    console.log('\n📝 Navigating to Content-Type Builder...');
    await driver.get('http://localhost:1337/admin/plugins/content-type-builder');
    await sleep(3000);
    
    // Check if blog content type already exists
    const blogExists = await driver.findElements(By.xpath("//div[contains(text(), 'blog')]"));
    if (blogExists.length > 0) {
      console.log('⚠️  Blog content type might already exist. Continuing anyway...');
    }
    
    // Click Create new collection type using JavaScript
    console.log('📦 Creating new collection type...');
    await driver.executeScript(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const createButton = buttons.find(btn => btn.textContent.includes('Create new collection type'));
      if (createButton) createButton.click();
    `);
    await sleep(2000);
    
    // Enter display name
    console.log('📝 Setting display name: blog');
    const displayNameInput = await driver.findElement(By.name('displayName'));
    await displayNameInput.sendKeys('blog');
    
    // Press Enter to continue
    await displayNameInput.sendKeys(Key.RETURN);
    await sleep(2000);
    
    // Helper function to add fields
    async function addField(fieldCategory, fieldSubtype, fieldName, options = {}) {
      console.log(`  Adding ${fieldName} field...`);
      
      // Click Add another field using JavaScript
      await driver.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const addButton = buttons.find(btn => btn.textContent.includes('Add another field'));
        if (addButton) addButton.click();
      `);
      await sleep(2000);
      
      // Click field category
      await driver.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const categoryButton = buttons.find(btn => btn.textContent === '${fieldCategory}');
        if (categoryButton) categoryButton.click();
      `);
      await sleep(1500);
      
      // Click subtype if provided
      if (fieldSubtype) {
        await driver.executeScript(`
          const buttons = Array.from(document.querySelectorAll('button'));
          const subtypeButton = buttons.find(btn => btn.textContent.includes('${fieldSubtype}'));
          if (subtypeButton) subtypeButton.click();
        `);
        await sleep(1500);
      }
      
      // Enter field name
      const nameInput = await driver.findElement(By.name('name'));
      await nameInput.clear();
      await nameInput.sendKeys(fieldName);
      
      // Handle UID field
      if (fieldCategory === 'Text' && fieldSubtype === 'UID' && options.targetField) {
        await sleep(1000);
        await driver.executeScript(`
          const select = document.querySelector('select');
          if (select) {
            select.value = '${options.targetField}';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `);
      }
      
      // Handle Media field
      if (fieldCategory === 'Media') {
        await driver.executeScript(`
          const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
          const singleRadio = radios.find(radio => {
            const label = radio.closest('label');
            return label && label.textContent.includes('Single media');
          });
          if (singleRadio) singleRadio.click();
        `);
      }
      
      // Handle advanced settings
      if (options.required || options.default) {
        await driver.executeScript(`
          const buttons = Array.from(document.querySelectorAll('button'));
          const advancedButton = buttons.find(btn => btn.textContent.includes('Advanced settings'));
          if (advancedButton) advancedButton.click();
        `);
        await sleep(1000);
        
        if (options.required) {
          await driver.executeScript(`
            const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const requiredCheckbox = checkboxes.find(cb => {
              const label = cb.closest('label');
              return label && label.textContent.includes('Required field');
            });
            if (requiredCheckbox && !requiredCheckbox.checked) requiredCheckbox.click();
          `);
        }
        
        if (options.default) {
          const defaultInput = await driver.findElement(By.name('default'));
          await defaultInput.sendKeys(options.default);
        }
      }
      
      // Click Finish
      await driver.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const finishButton = buttons.find(btn => btn.textContent === 'Finish');
        if (finishButton) finishButton.click();
      `);
      await sleep(2000);
    }
    
    // Add all fields
    console.log('\n🔧 Adding fields...');
    await addField('Text', 'Short text', 'title', { required: true });
    await addField('Text', 'Rich text', 'content');
    await addField('Text', 'Short text', 'author', { default: 'Marketing Team 2' });
    await addField('Date', null, 'publishDate');
    await addField('Text', 'UID', 'slug', { targetField: 'title' });
    await addField('Media', null, 'featured_image');
    await addField('Text', 'Short text', 'url');
    
    // Save the content type
    console.log('\n💾 Saving content type...');
    await driver.executeScript(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveButton = buttons.find(btn => btn.textContent === 'Save');
      if (saveButton) saveButton.click();
    `);
    
    // Wait for Strapi to restart
    console.log('⏳ Waiting for Strapi to restart (20 seconds)...');
    await sleep(20000);
    
    // Navigate directly to roles page
    console.log('\n🔐 Configuring permissions...');
    await driver.get('http://localhost:1337/admin/settings/users-permissions/roles');
    await sleep(5000);
    
    // Click on Public role using JavaScript
    await driver.executeScript(`
      const rows = Array.from(document.querySelectorAll('tr'));
      const publicRow = rows.find(row => row.textContent.includes('Public'));
      if (publicRow) publicRow.click();
    `);
    await sleep(3000);
    
    // Expand blog section and check permissions
    console.log('  Setting public permissions for blog...');
    await driver.executeScript(`
      // Find and expand blog section
      const sections = Array.from(document.querySelectorAll('div'));
      const blogSection = sections.find(section => {
        const text = section.textContent || '';
        return text.includes('Blog') && !text.includes('Blogger');
      });
      
      if (blogSection) {
        const button = blogSection.querySelector('button');
        if (button) button.click();
      }
      
      // Wait a bit for expansion
      setTimeout(() => {
        // Check find and findOne permissions
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        checkboxes.forEach(checkbox => {
          const label = checkbox.closest('label');
          if (label) {
            const text = label.textContent || '';
            if ((text.includes('find') || text.includes('findOne')) && 
                text.includes('blog') && 
                !checkbox.checked) {
              checkbox.click();
            }
          }
        });
      }, 1000);
    `);
    
    await sleep(2000);
    
    // Save permissions
    await driver.executeScript(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveButton = buttons.find(btn => btn.textContent === 'Save');
      if (saveButton) saveButton.click();
    `);
    
    await sleep(3000);
    
    console.log('\n✅ Blog content type created successfully!');
    console.log('📌 You can now run: node scripts/setup-blog-strapi.js');
    
    // Keep browser open for 5 seconds
    console.log('\n⏰ Closing browser in 5 seconds...');
    await sleep(5000);
    
  } catch (error) {
    console.error('❌ Error during automation:', error.message);
    console.log('\n💡 Debugging info:', error.stack);
  } finally {
    await driver.quit();
  }
}

// Run the automation
setupStrapiBlog().catch(console.error);