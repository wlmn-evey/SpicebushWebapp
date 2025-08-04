const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_TOKEN = '69b5932cd3f26ec1f897425ed308bfba182842d0a6f76379352ed6c0c1337834e9eef22b4a8c5086a9dbd41b20dbaea7ab3d87bcbd8754d54cfbcb4c830c202abfb31f4a9e4effbf083fc3e4ba7774eea2bd27eea7a39c9ec27565243cb0eb509e8e8feb25d693c430d25b21cba132fe1c86f25083c3ae13b6e6e50a344ef173';
const STRAPI_URL = 'http://localhost:1337';
const IMAGES_DIR = path.join(__dirname, '../docs/blog/images');

async function uploadImages() {
  console.log('📸 Uploading blog images to Strapi...\n');
  
  const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => !f.startsWith('.'));
  const uploadedImages = {};
  
  for (const imageFile of imageFiles) {
    try {
      console.log(`  Uploading ${imageFile}...`);
      
      const imagePath = path.join(IMAGES_DIR, imageFile);
      const form = new FormData();
      
      // Create a proper file stream with correct headers
      const fileStream = fs.createReadStream(imagePath);
      form.append('files', fileStream, {
        filename: imageFile,
        contentType: imageFile.endsWith('.png') ? 'image/png' : 'image/jpeg'
      });
      
      const response = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          ...form.getHeaders()
        },
        body: form
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }
      
      const data = await response.json();
      uploadedImages[imageFile] = data[0];
      console.log(`  ✓ Uploaded ${imageFile} - ID: ${data[0].id}`);
      
    } catch (error) {
      console.error(`  ✗ Failed to upload ${imageFile}:`, error.message);
    }
  }
  
  console.log('\n📊 Upload Summary:');
  console.log(`  Total images: ${imageFiles.length}`);
  console.log(`  Successfully uploaded: ${Object.keys(uploadedImages).length}`);
  
  // Now let's update the blog posts with the featured images
  console.log('\n🔗 Linking images to blog posts...');
  
  try {
    // Get all blog posts
    const blogsResponse = await fetch(`${STRAPI_URL}/api/blogs`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    const blogsData = await blogsResponse.json();
    const blogs = blogsData.data || [];
    
    // Map images to blogs based on the slug
    const imageMapping = {
      'nurturing-growth-gardening-program': 'Feature-Image-WF-Flame-Lily-1-1024x536.png',
      'exploring-summer-camp': 'Feature-Image-Wild-Flowers-3-1024x536.png',
      'embracing-neurodiversity-adhd': 'Feature-Image-Wild-Flowers-2.png',
      'embracing-holistic-development': 'Feature-Image-Wild-Flowers-5.png',
      'exploring-universe-within-cosmic-curriculum': 'Feature-Image-Wild-Flowers-7.png'
    };
    
    for (const blog of blogs) {
      const slug = blog.attributes?.slug || blog.slug;
      const title = blog.attributes?.title || blog.title;
      const imageName = imageMapping[slug];
      
      if (imageName && uploadedImages[imageName]) {
        console.log(`  Updating "${title}" with image...`);
        
        const updateResponse = await fetch(`${STRAPI_URL}/api/blogs/${blog.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          body: JSON.stringify({
            data: {
              featured_image: uploadedImages[imageName].id
            }
          })
        });
        
        if (updateResponse.ok) {
          console.log(`  ✓ Updated successfully`);
        } else {
          const error = await updateResponse.text();
          console.log(`  ✗ Failed to update: ${error}`);
        }
      }
    }
    
    console.log('\n✅ Image upload and linking complete!');
    
  } catch (error) {
    console.error('Error linking images:', error.message);
  }
}

// Run the upload
uploadImages().catch(console.error);