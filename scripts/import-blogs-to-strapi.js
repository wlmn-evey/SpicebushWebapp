const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const STRAPI_URL = 'http://localhost:1337';
const BLOGS_DIR = path.join(__dirname, '../docs/blog');
const IMAGES_DIR = path.join(__dirname, '../docs/blog/images');

// You'll need to set this after creating an admin user
// Get this token from Strapi admin panel: Settings > API Tokens
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

async function uploadImage(imagePath, imageName) {
  const form = new FormData();
  form.append('files', fs.createReadStream(imagePath), imageName);

  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0];
}

async function createBlogPost(title, content, author, publishDate, slug, featureImageId, contentImageIds) {
  const blogData = {
    data: {
      title,
      content,
      author,
      publishDate,
      slug,
      featured_image: featureImageId,
      published_at: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    }
  };

  const response = await fetch(`${STRAPI_URL}/api/blogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify(blogData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create blog post: ${response.statusText} - ${error}`);
  }

  return await response.json();
}

async function importBlogs() {
  if (!API_TOKEN) {
    console.error('Please set STRAPI_API_TOKEN environment variable');
    console.log('1. Go to http://localhost:1337/admin');
    console.log('2. Create an admin account if you haven\'t already');
    console.log('3. Go to Settings > API Tokens');
    console.log('4. Create a new token with full access');
    console.log('5. Run this script with: STRAPI_API_TOKEN=your-token-here node scripts/import-blogs-to-strapi.js');
    return;
  }

  // First, upload all images
  console.log('Uploading images...');
  const uploadedImages = {};

  const imageFiles = fs.readdirSync(IMAGES_DIR);
  for (const imageFile of imageFiles) {
    if (imageFile.startsWith('.')) continue;
    
    try {
      console.log(`Uploading ${imageFile}...`);
      const imagePath = path.join(IMAGES_DIR, imageFile);
      const uploaded = await uploadImage(imagePath, imageFile);
      uploadedImages[imageFile] = uploaded.id;
      console.log(`✓ Uploaded ${imageFile}`);
    } catch (error) {
      console.error(`✗ Failed to upload ${imageFile}:`, error.message);
    }
  }

  // Then, import blog posts
  console.log('\nImporting blog posts...');
  const blogFiles = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.md'));

  for (const blogFile of blogFiles) {
    const filePath = path.join(BLOGS_DIR, blogFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse the markdown content
    const lines = content.split('\n');
    let title = '';
    let author = 'Marketing Team 2';
    let publishDate = new Date().toISOString();
    let featureImageId = null;
    
    // Extract metadata
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
      } else if (line.startsWith('**Author:**')) {
        author = line.replace('**Author:**', '').trim();
      } else if (line.includes('**Published:**') || line.includes('**Date:**')) {
        const dateMatch = line.match(/(\w+ \d+, \d{4}|\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          publishDate = new Date(dateMatch[1]).toISOString();
        }
      }
    }

    // Find feature image
    const featureImageMatch = content.match(/!\[.*?\]\(images\/(Feature-Image-.*?\.png)\)/);
    if (featureImageMatch && uploadedImages[featureImageMatch[1]]) {
      featureImageId = uploadedImages[featureImageMatch[1]];
    }

    // Create slug from filename
    const slug = blogFile.replace('.md', '');

    // Remove image markdown from content for now (you might want to keep them and update URLs)
    let cleanContent = content.replace(/!\[.*?\]\(images\/.*?\)/g, '');

    try {
      console.log(`\nImporting "${title}"...`);
      await createBlogPost(title, cleanContent, author, publishDate, slug, featureImageId, []);
      console.log(`✓ Imported "${title}"`);
    } catch (error) {
      console.error(`✗ Failed to import "${title}":`, error.message);
    }
  }

  console.log('\nImport complete!');
}

// First, let's check if the blog content type exists
async function checkContentTypes() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/blogs`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (response.status === 404) {
      console.log('Blog content type not found. Please create it in Strapi admin:');
      console.log('1. Go to Content-Type Builder');
      console.log('2. Create new collection type called "blog"');
      console.log('3. Add fields:');
      console.log('   - title (Text, Required)');
      console.log('   - content (Rich text)');
      console.log('   - author (Text)');
      console.log('   - publishDate (Date)');
      console.log('   - slug (UID based on title)');
      console.log('   - featured_image (Media, Single)');
      console.log('4. Save and restart Strapi');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking content types:', error.message);
    return false;
  }
}

// Main execution
(async () => {
  console.log('Checking Strapi setup...');
  
  if (!API_TOKEN) {
    console.error('Please set STRAPI_API_TOKEN environment variable');
    console.log('1. Go to http://localhost:1337/admin');
    console.log('2. Create an admin account if you haven\'t already');
    console.log('3. Go to Settings > API Tokens');
    console.log('4. Create a new token with full access');
    console.log('5. Run this script with: STRAPI_API_TOKEN=your-token-here node scripts/import-blogs-to-strapi.js');
    return;
  }
  
  const contentTypeExists = await checkContentTypes();
  if (!contentTypeExists) {
    return;
  }
  
  await importBlogs();
})();