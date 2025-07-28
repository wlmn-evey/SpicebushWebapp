#!/usr/bin/env node

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

async function optimizeLogo() {
  const logoPath = path.join(ROOT_DIR, 'public/SpicebushLogo-03.png');
  const outputDir = path.join(ROOT_DIR, 'public/images/optimized/homepage');
  
  await fs.mkdir(outputDir, { recursive: true });
  
  // Create main WebP version
  await sharp(logoPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(path.join(outputDir, 'homepage-spicebush-logo-brand-identity-800x800.webp'));
  
  // Create smaller versions
  const sizes = [320, 640];
  for (const size of sizes) {
    await sharp(logoPath)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(path.join(outputDir, `homepage-spicebush-logo-brand-identity-${size}w.webp`));
  }
  
  console.log('✅ Logo optimized successfully!');
}

optimizeLogo().catch(console.error);