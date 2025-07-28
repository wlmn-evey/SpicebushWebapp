import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function generateLogoJPGs() {
  const sourceImage = path.join(projectRoot, 'public/SpicebushLogo-03.png');
  const outputDir = path.join(projectRoot, 'public/images/optimized/homepage');
  
  try {
    // Generate 640w JPG
    await sharp(sourceImage)
      .resize(640, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toFile(path.join(outputDir, 'homepage-spicebush-logo-brand-identity-640w.jpg'));
    
    console.log('✅ Generated logo 640w JPG');
    
    // Generate 320w JPG
    await sharp(sourceImage)
      .resize(320, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toFile(path.join(outputDir, 'homepage-spicebush-logo-brand-identity-320w.jpg'));
    
    console.log('✅ Generated logo 320w JPG');
    
  } catch (error) {
    console.error('❌ Error generating logo JPGs:', error);
  }
}

generateLogoJPGs();