/**
 * Script to download teacher photos from external URLs
 * 
 * This script can be run in Node.js to automatically download
 * teacher photos from their external URLs and save them locally.
 * 
 * Usage: node scripts/download-teacher-photos.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Teacher photo mapping
const teacherPhotos = [
  {
    name: 'Kira Messinger',
    slug: 'kira-messinger',
    url: 'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efb81e7a8f61e14d7a838_Kira%20Messinger%20Spicebush%20Montessori.jpeg',
    filename: 'kira-messinger.jpg'
  },
  {
    name: 'Kirsti Forrest',
    slug: 'kirsti-forrest', 
    url: 'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efb338f8d8db6fc8b72f6_CleanShot%202025-06-15%20at%2012.39.35%402x%201.jpeg',
    filename: 'kirsti-forrest.jpg'
  },
  {
    name: 'Leah Walker',
    slug: 'leah-walker',
    url: 'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efbbede2470646731b513_Leah%20Walker%20Spicebush%20Montessori.jpeg', 
    filename: 'leah-walker.jpg'
  }
];

// Ensure output directory exists
const outputDir = path.join(__dirname, '../public/images/teachers');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Download function
function downloadImage(url, filepath, callback) {
  console.log(`Downloading ${url}...`);
  
  const file = fs.createWriteStream(filepath);
  
  https.get(url, (response) => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log(`✅ Saved: ${filepath}`);
      callback(null);
    });
    
    file.on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      callback(err);
    });
  }).on('error', (err) => {
    callback(err);
  });
}

// Download all teacher photos
async function downloadAllPhotos() {
  console.log('🖼️  Downloading teacher photos...\n');
  
  for (const teacher of teacherPhotos) {
    const filepath = path.join(outputDir, teacher.filename);
    
    try {
      await new Promise((resolve, reject) => {
        downloadImage(teacher.url, filepath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error(`❌ Failed to download ${teacher.name}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Teacher photo download complete!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration: supabase db push');
  console.log('2. Verify photos appear correctly on the website');
}

// Run the download
downloadAllPhotos().catch(console.error);