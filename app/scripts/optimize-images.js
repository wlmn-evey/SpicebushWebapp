#!/usr/bin/env node

/**
 * Image Optimization Script
 * Generates WebP versions and responsive variants for all website images
 * Based on the photo metadata entries in src/content/photos/
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Configuration
const SIZES = [320, 640, 960, 1280, 1920]; // Width breakpoints
const QUALITY = {
  webp: 85,
  jpg: 90
};

// Directories
const PHOTO_ENTRIES_DIR = path.join(ROOT_DIR, 'src/content/photos');
const PUBLIC_IMAGES_DIR = path.join(ROOT_DIR, 'public/images');
const OPTIMIZED_DIR = path.join(ROOT_DIR, 'public/images/optimized');

/**
 * Ensure directory exists
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

/**
 * Read all photo metadata entries
 */
async function getPhotoEntries() {
  const files = await fs.readdir(PHOTO_ENTRIES_DIR);
  const entries = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const content = await fs.readFile(path.join(PHOTO_ENTRIES_DIR, file), 'utf-8');
    const { data } = matter(content);
    
    entries.push({
      slug: file.replace('.md', ''),
      ...data
    });
  }

  return entries;
}

/**
 * Find the original image file
 */
async function findOriginalImage(originalFilename, category) {
  const possiblePaths = [
    path.join(PUBLIC_IMAGES_DIR, category, originalFilename),
    path.join(PUBLIC_IMAGES_DIR, originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'homepage', originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'about', originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'programs', originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'admissions', originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'gallery', originalFilename),
    path.join(PUBLIC_IMAGES_DIR, 'teachers', originalFilename)
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // File doesn't exist at this path, continue
    }
  }

  return null;
}

/**
 * Generate optimized versions of an image
 */
async function optimizeImage(entry) {
  const { originalFilename, optimizedFilename, category, slug } = entry;
  
  // Find the original image
  const originalPath = await findOriginalImage(originalFilename, category);
  
  if (!originalPath) {
    console.warn(`⚠️  Original image not found: ${originalFilename}`);
    return;
  }

  console.log(`📸 Processing: ${originalFilename}`);

  // Create category directory in optimized folder
  const categoryDir = path.join(OPTIMIZED_DIR, category);
  await ensureDir(categoryDir);

  // Load the original image
  const image = sharp(originalPath);
  const metadata = await image.metadata();

  // Generate WebP versions at different sizes
  for (const width of SIZES) {
    // Skip sizes larger than original
    if (width > metadata.width) continue;

    const webpFilename = `${slug}-${width}w.webp`;
    const webpPath = path.join(categoryDir, webpFilename);

    try {
      await image
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: QUALITY.webp })
        .toFile(webpPath);

      console.log(`  ✅ Generated: ${webpFilename}`);
    } catch (error) {
      console.error(`  ❌ Error generating ${webpFilename}:`, error.message);
    }

    // Also generate JPG fallback for key sizes
    if (width === 640 || width === 1280) {
      const jpgFilename = `${slug}-${width}w.jpg`;
      const jpgPath = path.join(categoryDir, jpgFilename);

      try {
        await image
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: QUALITY.jpg })
          .toFile(jpgPath);

        console.log(`  ✅ Generated: ${jpgFilename} (fallback)`);
      } catch (error) {
        console.error(`  ❌ Error generating ${jpgFilename}:`, error.message);
      }
    }
  }

  // Generate the primary optimized version (WebP at original size or 1920px max)
  const primaryWidth = Math.min(metadata.width, 1920);
  const primaryWebpPath = path.join(categoryDir, optimizedFilename);

  try {
    await image
      .resize(primaryWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY.webp })
      .toFile(primaryWebpPath);

    console.log(`  ✅ Generated primary: ${optimizedFilename}`);
  } catch (error) {
    console.error(`  ❌ Error generating primary WebP:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting image optimization...\n');

  // Ensure optimized directory exists
  await ensureDir(OPTIMIZED_DIR);

  // Get all photo entries
  const entries = await getPhotoEntries();
  console.log(`📋 Found ${entries.length} photo entries to process\n`);

  // Process each entry
  let processed = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      await optimizeImage(entry);
      processed++;
    } catch (error) {
      console.error(`❌ Failed to process ${entry.originalFilename}:`, error.message);
      errors++;
    }
    console.log(''); // Empty line between images
  }

  // Summary
  console.log('\n📊 Optimization Complete!');
  console.log(`✅ Processed: ${processed} images`);
  console.log(`❌ Errors: ${errors} images`);
  console.log(`📁 Output directory: ${OPTIMIZED_DIR}`);
}

// Run the script
main().catch(console.error);