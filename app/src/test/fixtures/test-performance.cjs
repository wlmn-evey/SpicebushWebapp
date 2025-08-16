const http = require('http');

const testPages = [
  { name: 'Homepage', path: '/' },
  { name: 'Programs', path: '/programs' },
  { name: 'About', path: '/about' },
  { name: 'Staff', path: '/staff' },
  { name: 'Tour Scheduling', path: '/tour-scheduling' },
  { name: 'Contact', path: '/contact' }
];

async function testPageLoad(path) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 4323,
      path: path,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const loadTime = Date.now() - startTime;
        resolve({
          path,
          statusCode: res.statusCode,
          loadTime,
          contentLength: data.length
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('=== Performance Test Results ===\n');
  console.log('Testing all pages...\n');
  
  const results = [];
  
  for (const page of testPages) {
    try {
      const result = await testPageLoad(page.path);
      results.push({
        ...page,
        ...result,
        status: result.loadTime < 10000 ? 'PASS' : 'FAIL'
      });
      console.log(`✓ ${page.name}: ${result.loadTime}ms (${result.statusCode})`);
    } catch (error) {
      results.push({
        ...page,
        error: error.message,
        status: 'ERROR'
      });
      console.log(`✗ ${page.name}: ${error.message}`);
    }
  }
  
  console.log('\n=== Summary ===\n');
  console.table(results);
  
  // Check if programs page is fixed
  const programsResult = results.find(r => r.name === 'Programs');
  if (programsResult) {
    console.log(`\n🎯 Programs page load time: ${programsResult.loadTime}ms`);
    if (programsResult.loadTime < 10000) {
      console.log('✅ Performance issue FIXED! (was 27 seconds, now under 10 seconds)');
    } else {
      console.log('❌ Performance issue persists');
    }
  }
}

runTests().catch(console.error);