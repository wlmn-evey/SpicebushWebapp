#!/usr/bin/env node

/**
 * Comprehensive Image Optimization Script
 * 
 * This script addresses Bug #030 - optimizes all PNG files over 1MB in the public/images directory.
 * Unlike the original optimize-images.js which only processes images with metadata entries,
 * this script finds and optimizes ALL large PNG files directly.
 * 
 * Features:
 * - Finds all PNG files over 1MB regardless of metadata
 * - Creates WebP versions with 85% quality
 * - Generates responsive variants at multiple breakpoints
 * - Compresses original PNG files to reduce their size
 * - Maintains organized directory structure
 * 
 * @author Elrond the Code Architect
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Configuration
const SIZES = [320, 640, 960, 1280, 1920]; // Responsive width breakpoints
const QUALITY = {
  webp: 85,    // WebP quality for modern browsers
  jpg: 90,     // JPEG quality for fallback
  png: 90      // PNG compression level
};
const MIN_FILE_SIZE = 1024 * 1024; // 1MB threshold
const PUBLIC_IMAGES_DIR = path.join(ROOT_DIR, 'public/images');
const OPTIMIZED_DIR = path.join(ROOT_DIR, 'public/images/optimized');
const BACKUP_DIR = path.join(ROOT_DIR, 'public/images/.original-backups');

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} dir - Directory path to ensure exists
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    throw error;
  }
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Human-readable file size
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Find all PNG files over the size threshold
 * @param {string} dir - Directory to search
 * @param {number} minSize - Minimum file size in bytes
 * @returns {Promise<Array>} Array of file information objects
 */
async function findLargePNGFiles(dir, minSize) {
  const largeFiles = [];
  
  async function scanDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and already optimized directories
        if (!entry.name.startsWith('.') && entry.name !== 'optimized') {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        const stats = await fs.stat(fullPath);
        if (stats.size >= minSize) {
          largeFiles.push({
            path: fullPath,
            relativePath: path.relative(dir, fullPath),
            size: stats.size,
            name: entry.name
          });
        }
      }
    }
  }
  
  await scanDirectory(dir);
  return largeFiles.sort((a, b) => b.size - a.size); // Sort by size, largest first
}

/**
 * Generate a slug from filename for creating variant names
 * @param {string} filename - Original filename
 * @returns {string} URL-safe slug
 */
function generateSlug(filename) {
  return path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Backup original file before optimization
 * @param {string} originalPath - Path to original file
 * @param {string} relativePath - Relative path from images directory
 */
async function backupOriginal(originalPath, relativePath) {
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);
  
  await ensureDir(backupDir);
  
  // Only backup if not already backed up
  try {
    await fs.access(backupPath);
    console.log(`  ℹ️  Backup already exists: ${relativePath}`);
  } catch {
    // Backup doesn't exist, create it
    await pipeline(
      createReadStream(originalPath),
      createWriteStream(backupPath)
    );
    console.log(`  💾 Backed up original: ${relativePath}`);
  }
}

/**
 * Optimize a single PNG file
 * @param {Object} fileInfo - File information object
 * @returns {Promise<Object>} Optimization results
 */
async function optimizeImage(fileInfo) {
  const { path: originalPath, relativePath, size, name } = fileInfo;
  const slug = generateSlug(name);
  const category = path.dirname(relativePath);
  
  console.log(`\n📸 Processing: ${relativePath}`);
  console.log(`  📊 Original size: ${formatFileSize(size)}`);
  
  try {
    // First, backup the original
    await backupOriginal(originalPath, relativePath);
    
    // Load the image
    const image = sharp(originalPath);
    const metadata = await image.metadata();
    
    // Create optimized directory structure
    const optimizedCategoryDir = path.join(OPTIMIZED_DIR, category);
    await ensureDir(optimizedCategoryDir);
    
    const results = {
      original: relativePath,
      originalSize: size,
      variants: [],
      compressed: null
    };
    
    // Generate WebP variants at different sizes
    for (const width of SIZES) {
      // Skip sizes larger than original
      if (width > metadata.width) continue;
      
      const webpFilename = `${slug}-${width}w.webp`;
      const webpPath = path.join(optimizedCategoryDir, webpFilename);
      
      try {
        const info = await image
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside',
            kernel: sharp.kernel.lanczos3 // High-quality downsampling
          })
          .webp({ 
            quality: QUALITY.webp,
            effort: 6 // Higher effort for better compression
          })
          .toFile(webpPath);
        
        results.variants.push({
          path: path.join('optimized', category, webpFilename),
          width: width,
          size: info.size,
          format: 'webp'
        });
        
        console.log(`  ✅ Generated: ${webpFilename} (${formatFileSize(info.size)})`);
      } catch (error) {
        console.error(`  ❌ Error generating ${webpFilename}:`, error.message);
      }
    }
    
    // Generate JPEG fallback for key sizes
    for (const width of [640, 1280]) {
      if (width > metadata.width) continue;
      
      const jpgFilename = `${slug}-${width}w.jpg`;
      const jpgPath = path.join(optimizedCategoryDir, jpgFilename);
      
      try {
        const info = await image
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside',
            kernel: sharp.kernel.lanczos3
          })
          .jpeg({ 
            quality: QUALITY.jpg,
            progressive: true // Progressive JPEG for better perceived loading
          })
          .toFile(jpgPath);
        
        results.variants.push({
          path: path.join('optimized', category, jpgFilename),
          width: width,
          size: info.size,
          format: 'jpg'
        });
        
        console.log(`  ✅ Generated: ${jpgFilename} (${formatFileSize(info.size)}) - fallback`);
      } catch (error) {
        console.error(`  ❌ Error generating ${jpgFilename}:`, error.message);
      }
    }
    
    // Generate primary WebP at original size or max 1920px
    const primaryWidth = Math.min(metadata.width, 1920);
    const primaryWebpFilename = `${slug}.webp`;
    const primaryWebpPath = path.join(optimizedCategoryDir, primaryWebpFilename);
    
    try {
      const info = await image
        .resize(primaryWidth, null, {
          withoutEnlargement: true,
          fit: 'inside',
          kernel: sharp.kernel.lanczos3
        })
        .webp({ 
          quality: QUALITY.webp,
          effort: 6
        })
        .toFile(primaryWebpPath);
      
      results.variants.push({
        path: path.join('optimized', category, primaryWebpFilename),
        width: primaryWidth,
        size: info.size,
        format: 'webp',
        isPrimary: true
      });
      
      console.log(`  ✅ Generated primary: ${primaryWebpFilename} (${formatFileSize(info.size)})`);
    } catch (error) {
      console.error(`  ❌ Error generating primary WebP:`, error.message);
    }
    
    // Compress the original PNG (overwrite with compressed version)
    try {
      const tempPath = originalPath + '.tmp';
      const info = await sharp(originalPath)
        .png({ 
          quality: QUALITY.png,
          compressionLevel: 9, // Maximum compression
          palette: true // Use palette when possible for smaller size
        })
        .toFile(tempPath);
      
      // Only replace if the compressed version is smaller
      if (info.size < size) {
        await fs.rename(tempPath, originalPath);
        results.compressed = {
          size: info.size,
          savings: size - info.size,
          percentage: ((size - info.size) / size * 100).toFixed(1)
        };
        console.log(`  🗜️  Compressed original PNG: ${formatFileSize(info.size)} (saved ${results.compressed.percentage}%)`);
      } else {
        await fs.unlink(tempPath);
        console.log(`  ℹ️  Original PNG already optimally compressed`);
      }
    } catch (error) {
      console.error(`  ⚠️  Error compressing original PNG:`, error.message);
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Failed to process ${relativePath}:`, error);
    throw error;
  }
}

/**
 * Generate summary report of optimization results
 * @param {Array} results - Array of optimization results
 */
function generateSummaryReport(results) {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results
    .filter(r => r.compressed)
    .reduce((sum, r) => sum + r.compressed.size, 0);
  const totalSavings = results
    .filter(r => r.compressed)
    .reduce((sum, r) => sum + r.compressed.savings, 0);
  
  const totalVariants = results.reduce((sum, r) => sum + r.variants.length, 0);
  const webpVariants = results.reduce((sum, r) => 
    sum + r.variants.filter(v => v.format === 'webp').length, 0);
  const jpgVariants = results.reduce((sum, r) => 
    sum + r.variants.filter(v => v.format === 'jpg').length, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📁 Total files processed: ${results.length}`);
  console.log(`💾 Total original size: ${formatFileSize(totalOriginalSize)}`);
  console.log(`🗜️  PNG compression savings: ${formatFileSize(totalSavings)} (${(totalSavings / totalOriginalSize * 100).toFixed(1)}%)`);
  console.log(`🖼️  Total variants created: ${totalVariants}`);
  console.log(`   - WebP variants: ${webpVariants}`);
  console.log(`   - JPEG fallbacks: ${jpgVariants}`);
  console.log('\n📂 Output locations:');
  console.log(`   - Optimized images: ${OPTIMIZED_DIR}`);
  console.log(`   - Original backups: ${BACKUP_DIR}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting comprehensive image optimization...');
  console.log(`📍 Scanning directory: ${PUBLIC_IMAGES_DIR}`);
  console.log(`🎯 Target: PNG files over ${formatFileSize(MIN_FILE_SIZE)}\n`);
  
  try {
    // Ensure required directories exist
    await ensureDir(OPTIMIZED_DIR);
    await ensureDir(BACKUP_DIR);
    
    // Find all large PNG files
    const largeFiles = await findLargePNGFiles(PUBLIC_IMAGES_DIR, MIN_FILE_SIZE);
    console.log(`📋 Found ${largeFiles.length} PNG files over ${formatFileSize(MIN_FILE_SIZE)}`);
    
    if (largeFiles.length === 0) {
      console.log('✨ No large PNG files found. Optimization complete!');
      return;
    }
    
    // Process each file
    const results = [];
    let processed = 0;
    let errors = 0;
    
    for (const fileInfo of largeFiles) {
      try {
        const result = await optimizeImage(fileInfo);
        results.push(result);
        processed++;
      } catch (error) {
        errors++;
        console.error(`\n❌ Skipping ${fileInfo.relativePath} due to error`);
      }
    }
    
    // Generate summary report
    generateSummaryReport(results);
    
    console.log('\n✅ Optimization complete!');
    console.log(`   Processed: ${processed} files`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} files`);
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute the script
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});