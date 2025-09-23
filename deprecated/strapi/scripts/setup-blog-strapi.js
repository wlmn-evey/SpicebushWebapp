const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_TOKEN = '69b5932cd3f26ec1f897425ed308bfba182842d0a6f76379352ed6c0c1337834e9eef22b4a8c5086a9dbd41b20dbaea7ab3d87bcbd8754d54cfbcb4c830c202abfb31f4a9e4effbf083fc3e4ba7774eea2bd27eea7a39c9ec27565243cb0eb509e8e8feb25d693c430d25b21cba132fe1c86f25083c3ae13b6e6e50a344ef173';
const STRAPI_URL = 'http://localhost:1337';
const BLOGS_DIR = path.join(__dirname, '../docs/blog');
const IMAGES_DIR = path.join(__dirname, '../docs/blog/images');

// First, let's check what content types exist
async function checkExistingContentTypes() {
  try {
    // Try different possible endpoints
    const endpoints = ['/api/blogs', '/api/blog', '/api/posts', '/api/articles'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${STRAPI_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`
          }
        });
        
        if (response.ok) {
          console.log(`Found existing content type at: ${endpoint}`);
          return endpoint.replace('/api/', '');
        }
      } catch (e) {
        // Continue checking other endpoints
      }
    }
    
    console.log('No blog-like content type found.');
    return null;
  } catch (error) {
    console.error('Error checking content types:', error);
    return null;
  }
}

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
    const error = await response.text();
    throw new Error(`Failed to upload image: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  return data[0];
}

async function createContent(endpoint, data) {
  const response = await fetch(`${STRAPI_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`
    },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create content: ${response.statusText} - ${error}`);
  }

  return await response.json();
}

async function importBlogs() {
  console.log('Starting blog import process...\n');

  // Check what content type to use
  const contentType = await checkExistingContentTypes();
  
  if (!contentType) {
    console.error('\nNo blog content type found!');
    console.log('Please create a content type in Strapi admin panel first.');
    console.log('\nSuggested content type name: "blog" (singular)');
    console.log('Required fields:');
    console.log('- title (Text)');
    console.log('- content (Rich text)');
    console.log('- author (Text)');
    console.log('- publishDate (Date)');
    console.log('- slug (UID)');
    console.log('- featured_image (Media)');
    return;
  }

  // Upload images first
  console.log('\n📸 Uploading images...');
  const uploadedImages = {};

  const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => !f.startsWith('.'));
  
  for (const imageFile of imageFiles) {
    try {
      console.log(`  Uploading ${imageFile}...`);
      const imagePath = path.join(IMAGES_DIR, imageFile);
      const uploaded = await uploadImage(imagePath, imageFile);
      uploadedImages[imageFile] = uploaded.id;
      console.log(`  ✓ Uploaded ${imageFile}`);
    } catch (error) {
      console.error(`  ✗ Failed to upload ${imageFile}:`, error.message);
    }
  }

  // Import blog posts
  console.log('\n📝 Importing blog posts...');
  const blogFiles = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.md'));

  for (const blogFile of blogFiles) {
    const filePath = path.join(BLOGS_DIR, blogFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse metadata
    const lines = content.split('\n');
    let title = '';
    let author = 'Marketing Team 2';
    let publishDate = new Date().toISOString().split('T')[0];
    let url = '';
    let featureImageId = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
      } else if (line.includes('**Author:**')) {
        author = line.replace(/\*\*Author:\*\*\s*/, '').trim();
      } else if (line.includes('**Published:**') || line.includes('**Date:**')) {
        const dateMatch = line.match(/(\w+ \d+, \d{4}|\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          publishDate = new Date(dateMatch[1]).toISOString().split('T')[0];
        }
      } else if (line.includes('**URL:**')) {
        url = line.replace(/\*\*URL:\*\*\s*/, '').trim();
      }
    }

    // Find feature image
    const featureImageMatch = content.match(/!\[.*?\]\(images\/(Feature-Image-.*?\.png)\)/);
    if (featureImageMatch && uploadedImages[featureImageMatch[1]]) {
      featureImageId = uploadedImages[featureImageMatch[1]];
    }

    // Clean content (remove metadata lines and adjust image paths)
    let cleanContent = content
      .split('\n')
      .filter(line => !line.includes('**Author:**') && 
                      !line.includes('**Published:**') && 
                      !line.includes('**Date:**') && 
                      !line.includes('**URL:**'))
      .join('\n');

    // Remove image references for now (they're already uploaded)
    cleanContent = cleanContent.replace(/!\[.*?\]\(images\/.*?\)/g, '');

    const slug = blogFile.replace('.md', '');

    try {
      console.log(`\n  📄 Importing "${title}"...`);
      
      const blogData = {
        title,
        content: cleanContent,
        author,
        publishDate,
        slug,
        featured_image: featureImageId,
        url
      };

      await createContent(contentType, blogData);
      console.log(`  ✓ Successfully imported "${title}"`);
    } catch (error) {
      console.error(`  ✗ Failed to import "${title}":`, error.message);
    }
  }

  console.log('\n✅ Import process complete!');
}

// Run the import
importBlogs().catch(console.error);