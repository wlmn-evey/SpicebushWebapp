import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../.astro/content-generated-modules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function testImageSystem() {
  console.log('🔍 Testing Photo Optimization System\n');
  
  const issues = [];
  let photoCount = 0;
  let missingImages = 0;
  let successfulImages = 0;
  
  try {
    // Get all photo entries
    const photos = await getCollection('photos');
    photoCount = photos.length;
    
    console.log(`📸 Found ${photoCount} photo entries in CMS\n`);
    
    // Test each photo
    for (const photo of photos) {
      const { slug, data } = photo;
      const { category, optimizedFilename } = data;
      
      console.log(`Testing: ${slug}`);
      
      // Check if optimized WebP exists
      const webpPath = path.join(projectRoot, 'public/images/optimized', category, optimizedFilename);
      try {
        await fs.access(webpPath);
        console.log(`  ✅ WebP exists: ${optimizedFilename}`);
      } catch (error) {
        issues.push(`❌ Missing WebP: ${webpPath}`);
        missingImages++;
        console.log(`  ❌ Missing WebP: ${optimizedFilename}`);
      }
      
      // Check responsive variants
      const sizes = ['320w', '640w', '960w', '1280w'];
      for (const size of sizes) {
        const variantPath = path.join(projectRoot, 'public/images/optimized', category, `${slug}-${size}.webp`);
        try {
          await fs.access(variantPath);
          successfulImages++;
        } catch (error) {
          issues.push(`❌ Missing variant: ${slug}-${size}.webp`);
          missingImages++;
          console.log(`  ❌ Missing variant: ${size}`);
        }
      }
      
      // Check JPG fallbacks
      const jpgSizes = ['640w', '1280w'];
      for (const size of jpgSizes) {
        const jpgPath = path.join(projectRoot, 'public/images/optimized', category, `${slug}-${size}.jpg`);
        try {
          await fs.access(jpgPath);
          successfulImages++;
        } catch (error) {
          issues.push(`❌ Missing JPG fallback: ${slug}-${size}.jpg`);
          missingImages++;
          console.log(`  ❌ Missing JPG: ${size}`);
        }
      }
      
      // Validate focal points
      if (!data.primaryFocalX || !data.primaryFocalY) {
        issues.push(`⚠️  Missing focal points: ${slug}`);
        console.log(`  ⚠️  Missing focal points`);
      } else {
        console.log(`  ✅ Focal points: ${data.primaryFocalX}%, ${data.primaryFocalY}%`);
      }
      
      console.log('');
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`Total photo entries: ${photoCount}`);
    console.log(`Expected image files: ${photoCount * 7} (7 per photo)`);
    console.log(`Successful images: ${successfulImages}`);
    console.log(`Missing images: ${missingImages}`);
    console.log(`Issues found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  ISSUES TO FIX:');
      issues.slice(0, 10).forEach(issue => console.log(issue));
      if (issues.length > 10) {
        console.log(`... and ${issues.length - 10} more issues`);
      }
    } else {
      console.log('\n✅ All tests passed! Photo system is working correctly.');
    }
    
    // Test specific pages
    console.log('\n🌐 PAGE RECOMMENDATIONS:');
    console.log('Test these pages in your browser:');
    console.log('- http://localhost:4322/ (Homepage)');
    console.log('- http://localhost:4322/about (About page)');
    console.log('- http://localhost:4322/admissions (Admissions)');
    console.log('- http://localhost:4322/photo-test-simple (Simple test)');
    console.log('- http://localhost:4322/test-focal-points (Focal points demo)');
    console.log('- http://localhost:4322/photo-focal-demo (Interactive demo)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImageSystem();