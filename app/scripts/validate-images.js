import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function validateImages() {
  console.log('🔍 Validating Photo Optimization System\n');
  
  const optimizedDir = path.join(projectRoot, 'public/images/optimized');
  const photosDir = path.join(projectRoot, 'src/content/photos');
  
  try {
    // Get all photo markdown files
    const photoFiles = await fs.readdir(photosDir);
    const mdFiles = photoFiles.filter(f => f.endsWith('.md'));
    
    console.log(`📸 Found ${mdFiles.length} photo entries\n`);
    
    let totalExpected = 0;
    let totalFound = 0;
    let issues = [];
    
    // Check each category
    const categories = ['homepage', 'about', 'programs', 'admissions', 'gallery', 'teachers'];
    
    for (const category of categories) {
      const categoryDir = path.join(optimizedDir, category);
      
      try {
        const files = await fs.readdir(categoryDir);
        const imageFiles = files.filter(f => f.endsWith('.webp') || f.endsWith('.jpg'));
        
        console.log(`📁 ${category}: ${imageFiles.length} images`);
        
        // Count WebP and JPG files
        const webpFiles = imageFiles.filter(f => f.endsWith('.webp'));
        const jpgFiles = imageFiles.filter(f => f.endsWith('.jpg'));
        
        console.log(`   - WebP: ${webpFiles.length}`);
        console.log(`   - JPG: ${jpgFiles.length}`);
        
        totalFound += imageFiles.length;
        
        // Check for common sizes
        const hasAllSizes = ['320w', '640w', '960w', '1280w'].every(size => 
          webpFiles.some(f => f.includes(`-${size}.`))
        );
        
        if (!hasAllSizes) {
          issues.push(`⚠️  ${category}: Missing some responsive sizes`);
        }
        
      } catch (error) {
        console.log(`📁 ${category}: Directory not found`);
        issues.push(`❌ Missing category directory: ${category}`);
      }
    }
    
    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`Photo entries: ${mdFiles.length}`);
    console.log(`Total image files found: ${totalFound}`);
    console.log(`Average per photo: ${(totalFound / mdFiles.length).toFixed(1)} files`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✅ Image validation passed!');
    }
    
    // List specific test URLs
    console.log('\n🌐 TEST PAGES:');
    console.log('Visit these pages to test the photo system:');
    console.log('');
    console.log('1. Homepage: http://localhost:4322/');
    console.log('   - Hero image with autumn scene');
    console.log('   - Photo features with math and globe images');
    console.log('   - Logo in header/footer');
    console.log('');
    console.log('2. About: http://localhost:4322/about');
    console.log('   - Hero with mixed-age learning');
    console.log('   - Story sections with hourglass and sound cylinders');
    console.log('');
    console.log('3. Simple Test: http://localhost:4322/photo-test-simple');
    console.log('   - Direct image loading test');
    console.log('   - WebP and JPG comparison');
    console.log('');
    console.log('4. Focal Demo: http://localhost:4322/photo-focal-demo');
    console.log('   - Interactive focal point demonstration');
    console.log('   - Shows responsive behavior');
    console.log('');
    console.log('💡 Resize browser window to test responsive behavior!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

validateImages();