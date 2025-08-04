const fs = require('fs');
const path = require('path');

// Define all main pages to scrape (excluding language variants for now)
const pagesToScrape = [
  // Main Pages
  { url: 'https://spicebushmontessori.org/', filename: 'home.md' },
  { url: 'https://spicebushmontessori.org/about-us/', filename: 'about-us.md' },
  { url: 'https://spicebushmontessori.org/our-principles/', filename: 'our-principles.md' },
  { url: 'https://spicebushmontessori.org/contact/', filename: 'contact.md' },
  { url: 'https://spicebushmontessori.org/apply/', filename: 'apply.md' },
  { url: 'https://spicebushmontessori.org/donate/', filename: 'donate.md' },
  
  // Sub Pages
  { url: 'https://spicebushmontessori.org/financial-accessibility/', filename: 'financial-accessibility.md' },
  { url: 'https://spicebushmontessori.org/schedule-a-tour/', filename: 'schedule-a-tour.md' },
  { url: 'https://spicebushmontessori.org/summer-camp-2024/', filename: 'summer-camp-2024.md' },
  { url: 'https://spicebushmontessori.org/testimonial/', filename: 'testimonials.md' },
  
  // Blog already scraped, but let's get the blog listing page
  { url: 'https://spicebushmontessori.org/blog/', filename: 'blog-listing.md' }
];

const outputDir = path.join(__dirname, '../docs/live-site-content/pages');

console.log('🌐 Starting live site content scraping...\n');
console.log(`📁 Output directory: ${outputDir}\n`);

// Create a delay function to avoid rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePage(pageInfo) {
  console.log(`📄 Scraping: ${pageInfo.url}`);
  
  try {
    // We'll use a manual approach since WebFetch is interactive
    console.log(`   ✓ Ready for: ${pageInfo.filename}`);
    console.log(`   → URL: ${pageInfo.url}`);
    console.log('');
    
    return {
      url: pageInfo.url,
      filename: pageInfo.filename,
      status: 'pending'
    };
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return {
      url: pageInfo.url,
      filename: pageInfo.filename,
      status: 'error',
      error: error.message
    };
  }
}

async function main() {
  const results = [];
  
  console.log('📋 Pages to scrape:\n');
  pagesToScrape.forEach((page, index) => {
    console.log(`${index + 1}. ${page.filename} - ${page.url}`);
  });
  
  console.log('\n🔍 Starting scraping process...\n');
  
  for (const page of pagesToScrape) {
    const result = await scrapePage(page);
    results.push(result);
    await delay(1000); // 1 second delay between requests
  }
  
  // Save scraping manifest
  const manifestPath = path.join(outputDir, '../scraping-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPages: pagesToScrape.length,
    pages: results
  }, null, 2));
  
  console.log('\n✅ Scraping preparation complete!');
  console.log(`📝 Manifest saved to: ${manifestPath}`);
}

main().catch(console.error);