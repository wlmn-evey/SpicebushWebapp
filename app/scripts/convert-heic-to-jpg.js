import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

const MAIN_LIBRARY_PATH = path.join(projectRoot, 'Website Photos, Spicebush Montessori School 2');
const CONVERTED_PATH = path.join(MAIN_LIBRARY_PATH, 'converted-from-heic');

async function convertHEICtoJPG() {
  console.log('🔄 Converting HEIC files to JPG\n');
  
  try {
    // Create output directory
    await fs.mkdir(CONVERTED_PATH, { recursive: true });
    
    // Get all HEIC files
    const files = await fs.readdir(MAIN_LIBRARY_PATH);
    const heicFiles = files.filter(file => 
      path.extname(file).toLowerCase() === '.heic'
    );
    
    console.log(`Found ${heicFiles.length} HEIC files to convert\n`);
    
    if (heicFiles.length === 0) {
      console.log('No HEIC files to convert.');
      return;
    }
    
    let converted = 0;
    let failed = 0;
    
    // Check if we have a PNG version first (many already converted)
    for (const heicFile of heicFiles) {
      const baseName = path.basename(heicFile, '.heic');
      const baseNameUpper = path.basename(heicFile, '.HEIC');
      const pngPath = path.join(MAIN_LIBRARY_PATH, `${baseName}.png`);
      const pngPathUpper = path.join(MAIN_LIBRARY_PATH, `${baseNameUpper}.png`);
      
      try {
        // Check if PNG already exists
        let sourcePNG = null;
        try {
          await fs.access(pngPath);
          sourcePNG = pngPath;
        } catch {
          try {
            await fs.access(pngPathUpper);
            sourcePNG = pngPathUpper;
          } catch {
            // No PNG version exists
          }
        }
        
        if (sourcePNG) {
          // Convert existing PNG to JPG
          const outputPath = path.join(CONVERTED_PATH, `${baseName}.jpg`);
          
          process.stdout.write(`\rConverting: ${converted + failed + 1}/${heicFiles.length} - ${heicFile} (from PNG)...`);
          
          await sharp(sourcePNG)
            .jpeg({ quality: 90 })
            .toFile(outputPath);
          
          converted++;
        } else {
          // No PNG version, skip for now (would need HEIC converter)
          console.log(`\n⚠️  No PNG version found for ${heicFile}`);
          failed++;
        }
        
      } catch (error) {
        console.error(`\n❌ Failed to convert ${heicFile}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n\n✅ Conversion complete!');
    console.log(`Successfully converted: ${converted}`);
    console.log(`Failed/Skipped: ${failed}`);
    console.log(`\n📁 Converted files saved to: ${CONVERTED_PATH}`);
    
    // Note about HEIC conversion
    if (failed > 0) {
      console.log('\n📝 Note: Some HEIC files could not be converted because no PNG version exists.');
      console.log('To convert HEIC files directly, you would need to:');
      console.log('1. Install ImageMagick with HEIC support: brew install imagemagick');
      console.log('2. Or use a tool like heic-convert npm package');
    }
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
  }
}

convertHEICtoJPG();