const http = require('http');
const https = require('https');

console.log('Testing local server performance...');
const startTime = Date.now();

const options = {
  hostname: 'localhost',
  port: 4321,
  path: '/',
  method: 'GET',
  timeout: 30000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const endTime = Date.now();
    const loadTime = (endTime - startTime) / 1000;
    
    console.log(`Status: ${res.statusCode}`);
    console.log(`Load time: ${loadTime} seconds`);
    console.log(`Response size: ${data.length} bytes`);
    
    if (loadTime > 3) {
      console.log('⚠️  SLOW: Page took more than 3 seconds');
      
      // Check for common issues
      if (data.includes('Cannot find module')) {
        console.log('❌ Module import errors detected');
      }
      if (data.includes('ECONNREFUSED')) {
        console.log('❌ Database connection refused');
      }
      if (res.statusCode >= 300 && res.statusCode < 400) {
        console.log('⚠️  Redirect detected - may cause loops');
      }
      
      process.exit(1);
    } else {
      console.log('✅ FAST: Page loaded quickly');
    }
  });
});

req.on('timeout', () => {
  console.log('❌ TIMEOUT: Request took longer than 30 seconds');
  console.log('   Likely causes:');
  console.log('   - Database connection hanging');
  console.log('   - Infinite redirect loop');
  console.log('   - Synchronous blocking operation');
  req.destroy();
  process.exit(1);
});

req.on('error', (e) => {
  console.error(`❌ ERROR: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.log('   Server is not running. Start with: npm run dev');
  }
  process.exit(1);
});

req.end();