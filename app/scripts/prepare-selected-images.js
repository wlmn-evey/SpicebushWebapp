import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const MAIN_LIBRARY_PATH = path.join(projectRoot, '..', 'Website Photos, Spicebush Montessori School 2');
const CONVERTED_PATH = path.join(MAIN_LIBRARY_PATH, 'converted-from-heic');
const STAGING_PATH = path.join(projectRoot, 'public/images/gallery-staging');
const METADATA_FILE = path.join(projectRoot, 'journal/2025-07-26-selected-images-metadata.json');

async function prepareSelectedImages() {
  console.log('📋 Preparing selected images for optimization\n');
  
  try {
    // Create staging directory
    await fs.mkdir(STAGING_PATH, { recursive: true });
    
    // Load metadata
    const metadataContent = await fs.readFile(METADATA_FILE, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    console.log(`Found ${metadata.totalSelected} selected images to prepare\n`);
    
    let copiedCount = 0;
    let missingCount = 0;
    const copyLog = [];
    
    // Process each selected image
    for (const imageData of metadata.images) {
      const { originalFile, category, seoFilename } = imageData;
      
      // Determine source path
      let sourcePath;
      if (originalFile.includes('converted-from-heic/')) {
        sourcePath = path.join(MAIN_LIBRARY_PATH, originalFile);
      } else {
        sourcePath = path.join(MAIN_LIBRARY_PATH, originalFile);
      }
      
      // Create category subdirectory
      const categoryDir = path.join(STAGING_PATH, category);
      await fs.mkdir(categoryDir, { recursive: true });
      
      // Determine target filename (remove .webp and use original extension)
      const originalExt = path.extname(originalFile);
      const targetName = seoFilename.replace('.webp', originalExt);
      const targetPath = path.join(categoryDir, targetName);
      
      try {
        // Copy file
        await fs.copyFile(sourcePath, targetPath);
        copiedCount++;
        copyLog.push({
          source: originalFile,
          target: `gallery-staging/${category}/${targetName}`,
          status: 'success'
        });
        console.log(`✅ Copied: ${originalFile} → ${category}/${targetName}`);
      } catch (error) {
        missingCount++;
        copyLog.push({
          source: originalFile,
          target: `gallery-staging/${category}/${targetName}`,
          status: 'missing',
          error: error.message
        });
        console.log(`❌ Missing: ${originalFile}`);
      }
    }
    
    // Create copy log
    const logContent = {
      timestamp: new Date().toISOString(),
      totalSelected: metadata.totalSelected,
      successfullyCopied: copiedCount,
      missing: missingCount,
      stagingPath: STAGING_PATH,
      files: copyLog
    };
    
    await fs.writeFile(
      path.join(projectRoot, 'journal/2025-07-26-image-staging-log.json'),
      JSON.stringify(logContent, null, 2)
    );
    
    console.log('\n📊 Summary:');
    console.log(`Successfully copied: ${copiedCount} images`);
    console.log(`Missing: ${missingCount} images`);
    console.log(`\n📁 Images staged at: ${STAGING_PATH}`);
    console.log('\n✅ Ready for optimization!');
    
    // Create optimization instructions
    const instructions = `# Image Optimization Instructions

## Staged Images Location
${STAGING_PATH}

## Categories:
${Object.keys(metadata.byCategory).map(cat => `- ${cat}: ${metadata.byCategory[cat]} images`).join('\n')}

## Next Steps:
1. Run the optimization script on the staged images
2. Generate WebP versions and responsive sizes
3. Move optimized images to /public/images/optimized/gallery/
4. Test with OptimizedImage component

## Command to optimize:
\`\`\`bash
node scripts/optimize-gallery-images.js
\`\`\`
`;
    
    await fs.writeFile(
      path.join(projectRoot, 'journal/2025-07-26-optimization-instructions.md'),
      instructions
    );
    
  } catch (error) {
    console.error('❌ Error preparing images:', error);
  }
}

prepareSelectedImages();