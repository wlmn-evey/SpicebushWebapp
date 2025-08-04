const http = require('http');
const https = require('https');

const HEALTH_ENDPOINT = process.env.HEALTH_ENDPOINT || '/api/health';
const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';

async function checkHealth() {
  console.log('🏥 Running Health Check...');
  console.log(`Checking: ${SITE_URL}${HEALTH_ENDPOINT}`);
  
  const url = new URL(SITE_URL + HEALTH_ENDPOINT);
  const client = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const request = client.get(url.href, (response) => {
      let data = '';
      
      response.on('data', chunk => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log(`\nStatus Code: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            console.log('Health Status:', JSON.stringify(health, null, 2));
            
            if (health.status === 'healthy') {
              console.log('\n✅ Health check passed!');
              resolve(true);
            } else {
              console.log('\n⚠️  Service is not healthy');
              resolve(false);
            }
          } catch (e) {
            console.log('Response:', data);
            console.log('\n❌ Invalid health check response');
            resolve(false);
          }
        } else {
          console.log('\n❌ Health check failed with status:', response.statusCode);
          resolve(false);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('\n❌ Health check error:', error.message);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      console.error('\n❌ Health check timeout');
      resolve(false);
    });
  });
}

// Run the health check
checkHealth().then(healthy => {
  process.exit(healthy ? 0 : 1);
});