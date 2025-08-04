const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Collect all unique image URLs from the scraped content
const imageUrls = [
  // From home page
  'https://spicebushmontessori.org/wp-content/uploads/2022/06/SpicebushLogo-01-1-431x431.png',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/outdoor-portrait-of-4-little-school-kids-having-fun-on-the-grass.jpg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.30.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.35.jpeg',
  
  // From about us page
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.26.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.22.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.42.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2023/01/school-1.jpg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.51.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.05.10.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.14.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.05-1.jpeg',
  
  // From financial accessibility
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.05.15.jpeg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/10/Untitled-design-11.png',
  'https://spicebushmontessori.org/wp-content/uploads/2022/10/Untitled-design-10.png',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/photo_2023-08-02-17.04.10.jpeg',
  
  // Other key images
  'https://spicebushmontessori.org/wp-content/uploads/2022/10/Summer-Camp-1.jpg',
  'https://spicebushmontessori.org/wp-content/uploads/2022/05/Copy-of-Untitled-Design-8.png'
];

const outputDir = path.join(__dirname, '../docs/live-site-content/images');

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(path.join(outputDir, filename));
    
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(path.join(outputDir, filename), () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function downloadAllImages() {
  console.log('🖼️  Starting image download process...\n');
  console.log(`📁 Output directory: ${outputDir}\n`);
  
  const results = [];
  
  for (const url of imageUrls) {
    const filename = path.basename(url);
    console.log(`📥 Downloading: ${filename}`);
    
    try {
      await downloadImage(url, filename);
      console.log(`   ✓ Success: ${filename}`);
      results.push({ url, filename, status: 'success' });
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
      results.push({ url, filename, status: 'error', error: error.message });
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save download manifest
  const manifestPath = path.join(outputDir, '../image-download-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalImages: imageUrls.length,
    successCount: results.filter(r => r.status === 'success').length,
    images: results
  }, null, 2));
  
  console.log('\n✅ Image download complete!');
  console.log(`📊 Downloaded: ${results.filter(r => r.status === 'success').length}/${imageUrls.length} images`);
  console.log(`📝 Manifest saved to: ${manifestPath}`);
}

// Run the download
downloadAllImages().catch(console.error);