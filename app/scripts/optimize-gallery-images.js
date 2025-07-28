import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const STAGING_PATH = path.join(projectRoot, 'public/images/gallery-staging');
const OUTPUT_PATH = path.join(projectRoot, 'public/images/optimized/gallery');

async function optimizeGalleryImages() {
  console.log('🖼️  Optimizing Gallery Images\n');
  console.log(`Source: ${STAGING_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);
  
  try {
    // Create output directory
    await fs.mkdir(OUTPUT_PATH, { recursive: true });
    
    // Get all categories
    const categories = await fs.readdir(STAGING_PATH);
    let totalProcessed = 0;
    let totalGenerated = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(STAGING_PATH, category);
      const stat = await fs.stat(categoryPath);
      
      if (!stat.isDirectory()) continue;
      
      console.log(`\n📁 Processing ${category} images...`);
      
      // Create category output directory
      const categoryOutput = path.join(OUTPUT_PATH, category);
      await fs.mkdir(categoryOutput, { recursive: true });
      
      // Get all images in category
      const images = await fs.readdir(categoryPath);
      
      for (const imageName of images) {
        const imagePath = path.join(categoryPath, imageName);
        const baseName = path.basename(imageName, path.extname(imageName));
        
        process.stdout.write(`\r  Processing: ${imageName}...`);
        
        try {
          // Generate primary WebP
          const primaryWebP = path.join(categoryOutput, `${baseName}.webp`);
          await sharp(imagePath)
            .webp({ quality: 85 })
            .toFile(primaryWebP);
          totalGenerated++;
          
          // Generate responsive sizes
          const sizes = [
            { width: 320, suffix: '320w' },
            { width: 640, suffix: '640w' },
            { width: 960, suffix: '960w' },
            { width: 1280, suffix: '1280w' },
            { width: 1920, suffix: '1920w' }
          ];
          
          for (const size of sizes) {
            // WebP version
            const webpPath = path.join(categoryOutput, `${baseName}-${size.suffix}.webp`);
            await sharp(imagePath)
              .resize(size.width, null, { 
                withoutEnlargement: true,
                fit: 'inside'
              })
              .webp({ quality: 85 })
              .toFile(webpPath);
            totalGenerated++;
            
            // JPG fallback for 640w and 1280w
            if (size.width === 640 || size.width === 1280) {
              const jpgPath = path.join(categoryOutput, `${baseName}-${size.suffix}.jpg`);
              await sharp(imagePath)
                .resize(size.width, null, {
                  withoutEnlargement: true,
                  fit: 'inside'
                })
                .jpeg({ quality: 85 })
                .toFile(jpgPath);
              totalGenerated++;
            }
          }
          
          totalProcessed++;
          process.stdout.write(`\r  ✅ Processed: ${imageName} (7 files generated)\n`);
          
        } catch (error) {
          console.error(`\n  ❌ Error processing ${imageName}:`, error.message);
        }
      }
      
      console.log(`  Completed ${category}: ${images.length} images`);
    }
    
    console.log('\n✅ Gallery optimization complete!');
    console.log(`Total images processed: ${totalProcessed}`);
    console.log(`Total files generated: ${totalGenerated}`);
    console.log(`Average files per image: ${(totalGenerated / totalProcessed).toFixed(1)}`);
    
    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      sourcePath: STAGING_PATH,
      outputPath: OUTPUT_PATH,
      stats: {
        totalProcessed,
        totalGenerated,
        averageFilesPerImage: totalGenerated / totalProcessed
      },
      categories: {}
    };
    
    // Count files per category
    for (const category of categories) {
      const categoryOutput = path.join(OUTPUT_PATH, category);
      try {
        const files = await fs.readdir(categoryOutput);
        report.categories[category] = {
          fileCount: files.length,
          webpCount: files.filter(f => f.endsWith('.webp')).length,
          jpgCount: files.filter(f => f.endsWith('.jpg')).length
        };
      } catch (error) {
        // Category directory might not exist
      }
    }
    
    await fs.writeFile(
      path.join(projectRoot, 'journal/2025-07-26-gallery-optimization-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Report saved to journal/2025-07-26-gallery-optimization-report.json');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
  }
}

optimizeGalleryImages();