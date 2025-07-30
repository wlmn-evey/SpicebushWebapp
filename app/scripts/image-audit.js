#!/usr/bin/env node
/**
 * Image Audit Script
 * Identifies unused images and large files that can be removed for performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Directories to scan
const imageDir = path.join(projectRoot, 'public', 'images');
const srcDir = path.join(projectRoot, 'src');

// Get all image files
function getAllImages(dir) {
  const images = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(item)) {
        const relativePath = path.relative(imageDir, fullPath);
        const size = stat.size;
        images.push({
          path: fullPath,
          relativePath,
          name: item,
          size,
          sizeKB: Math.round(size / 1024),
          sizeMB: Math.round(size / (1024 * 1024) * 100) / 100
        });
      }
    }
  }
  
  scanDir(dir);
  return images;
}

// Get all source files
function getAllSourceFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDir(fullPath);
      } else if (/\.(astro|ts|tsx|js|jsx|md)$/i.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

// Check if image is referenced in source files
function isImageReferenced(imagePath, sourceFiles) {
  const imageBaseName = path.basename(imagePath, path.extname(imagePath));
  const relativeImagePath = imagePath.replace(/^.*\/public\//, '/');
  
  for (const sourceFile of sourceFiles) {
    try {
      const content = fs.readFileSync(sourceFile, 'utf8');
      
      // Check for various reference patterns
      if (
        content.includes(relativeImagePath) ||
        content.includes(imageBaseName) ||
        content.includes(path.basename(imagePath)) ||
        content.includes(imagePath.split('/').pop())
      ) {
        return true;
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return false;
}

// Main audit function
function auditImages() {
  console.log('🔍 Starting image audit...\n');
  
  const images = getAllImages(imageDir);
  const sourceFiles = getAllSourceFiles(srcDir);
  
  console.log(`Found ${images.length} images`);
  console.log(`Scanning ${sourceFiles.length} source files\n`);
  
  // Categorize images
  const unused = [];
  const large = [];
  const stagingFiles = [];
  const duplicates = new Map();
  
  let totalSize = 0;
  
  for (const image of images) {
    totalSize += image.size;
    
    // Check for staging files (these can usually be removed)
    if (image.relativePath.includes('gallery-staging')) {
      stagingFiles.push(image);
    }
    
    // Check for large files (>1MB)
    if (image.sizeMB > 1) {
      large.push(image);
    }
    
    // Check for unused files
    if (!isImageReferenced(image.relativePath, sourceFiles)) {
      unused.push(image);
    }
    
    // Check for potential duplicates by name similarity
    const baseName = path.basename(image.name, path.extname(image.name));
    if (duplicates.has(baseName)) {
      duplicates.get(baseName).push(image);
    } else {
      duplicates.set(baseName, [image]);
    }
  }
  
  // Generate report
  console.log('📊 AUDIT RESULTS');
  console.log('=================\n');
  
  console.log(`Total images: ${images.length}`);
  console.log(`Total size: ${Math.round(totalSize / (1024 * 1024))}MB\n`);
  
  // Staging files report
  if (stagingFiles.length > 0) {
    console.log(`🎭 STAGING FILES (${stagingFiles.length} files, ${Math.round(stagingFiles.reduce((sum, img) => sum + img.size, 0) / (1024 * 1024))}MB)`);
    console.log('These are typically safe to remove after optimization:');
    stagingFiles.slice(0, 10).forEach(img => {
      console.log(`  - ${img.relativePath} (${img.sizeMB}MB)`);
    });
    if (stagingFiles.length > 10) {
      console.log(`  ... and ${stagingFiles.length - 10} more`);
    }
    console.log();
  }
  
  // Large files report
  if (large.length > 0) {
    console.log(`📏 LARGE FILES (${large.length} files > 1MB)`);
    large.sort((a, b) => b.size - a.size).slice(0, 10).forEach(img => {
      console.log(`  - ${img.relativePath} (${img.sizeMB}MB)`);
    });
    console.log();
  }
  
  // Unused files report
  if (unused.length > 0) {
    console.log(`🗑️  POTENTIALLY UNUSED FILES (${unused.length} files)`);
    console.log('⚠️  Review carefully before removing:');
    unused.slice(0, 15).forEach(img => {
      console.log(`  - ${img.relativePath} (${img.sizeKB}KB)`);
    });
    if (unused.length > 15) {
      console.log(`  ... and ${unused.length - 15} more`);
    }
    console.log();
  }
  
  // Potential duplicates
  const potentialDuplicates = Array.from(duplicates.entries()).filter(([name, imgs]) => imgs.length > 1);
  if (potentialDuplicates.length > 0) {
    console.log(`👥 POTENTIAL DUPLICATES (${potentialDuplicates.length} groups)`);
    potentialDuplicates.slice(0, 5).forEach(([name, imgs]) => {
      console.log(`  ${name}:`);
      imgs.forEach(img => console.log(`    - ${img.relativePath} (${img.sizeKB}KB)`));
    });
    console.log();
  }
  
  // Quick wins
  console.log('🚀 QUICK WINS FOR PERFORMANCE:');
  console.log('1. Remove gallery-staging directory (68MB saved)');
  console.log('2. Compress large images or convert to WebP');
  console.log('3. Remove unused images after careful review');
  
  const stagingSize = stagingFiles.reduce((sum, img) => sum + img.size, 0) / (1024 * 1024);
  const potentialSavings = stagingSize + (unused.length * 0.5); // Estimate 500KB per unused file
  console.log(`\nPotential space savings: ~${Math.round(potentialSavings)}MB\n`);
  
  // Generate cleanup script
  const cleanupScript = generateCleanupScript(stagingFiles);
  fs.writeFileSync(path.join(projectRoot, 'scripts', 'cleanup-images.sh'), cleanupScript);
  console.log('💡 Generated cleanup-images.sh script for safe removal');
}

function generateCleanupScript(stagingFiles) {
  const script = `#!/bin/bash
# Auto-generated image cleanup script
# Review before running!

echo "🧹 Removing staging images..."

# Remove gallery-staging directory (68MB)
if [ -d "public/images/gallery-staging" ]; then
  echo "Removing gallery-staging directory..."
  rm -rf "public/images/gallery-staging"
  echo "✅ Removed gallery-staging directory"
fi

# Remove other identified large unused files
# Uncomment after manual review:

${stagingFiles.slice(0, 5).map(img => `# rm "public/images/${img.relativePath}"`).join('\n')}

echo "🎉 Cleanup complete!"
echo "Don't forget to:"
echo "1. Test the site to ensure no images are broken"
echo "2. Commit the changes"
echo "3. Run a full build to verify everything works"
`;

  return script;
}

// Run the audit
auditImages();