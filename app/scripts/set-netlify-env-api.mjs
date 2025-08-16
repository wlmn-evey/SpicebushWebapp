#!/usr/bin/env node

import https from 'https';
import readline from 'readline';

const SITE_ID = '27a429f4-9a58-4421-bc1f-126d70d81aa1';

// Environment variables to set
const ENV_VARS = {
  PUBLIC_SUPABASE_URL: 'https://xnzweuepchbfffsegkml.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMzE3NDQsImV4cCI6MjA0NTkwNzc0NH0.qMScf8b6LJCcG0_M2AWQZOmAjJwcd4DdMhX69a0sVK0',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDMzMTc0NCwiZXhwIjoyMDQ1OTA3NzQ0fQ.uPFaOqYbMIxqBDQsWLFCmFLI9xmuxlD7QZm1a9YN5vg',
  PUBLIC_SITE_URL: 'https://spicebush-testing.netlify.app',
  UNIONE_API_KEY: '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme',
  UNIONE_REGION: 'us',
  EMAIL_FROM: 'noreply@spicebushmontessori.org',
  EMAIL_FROM_NAME: 'Spicebush Montessori School'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function makeNetlifyRequest(token, method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData || '{}'));
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function main() {
  console.log('🔧 Netlify Environment Variables Setup');
  console.log('=====================================\n');
  
  const token = await question('Enter your Netlify personal access token: ');
  
  if (!token) {
    console.error('❌ Token is required');
    process.exit(1);
  }
  
  console.log('\n📝 Setting environment variables...\n');
  
  try {
    // Get current env vars
    console.log('Fetching current environment variables...');
    const currentEnv = await makeNetlifyRequest(token, 'GET', `/sites/${SITE_ID}`);
    const existingVars = currentEnv.build_settings?.env || {};
    
    // Merge with new vars
    const updatedVars = { ...existingVars, ...ENV_VARS };
    
    // Update site with new env vars
    console.log('Updating environment variables...');
    await makeNetlifyRequest(token, 'PATCH', `/sites/${SITE_ID}`, {
      build_settings: {
        env: updatedVars
      }
    });
    
    console.log('\n✅ Environment variables set successfully!');
    console.log('\nVariables configured:');
    Object.keys(ENV_VARS).forEach(key => {
      const value = ENV_VARS[key];
      const displayValue = key.includes('KEY') ? `${value.substring(0, 20)}...` : value;
      console.log(`  • ${key}: ${displayValue}`);
    });
    
    console.log('\n🚀 Next steps:');
    console.log('1. Trigger a new deployment in Netlify');
    console.log('2. Visit https://spicebush-testing.netlify.app/api/health');
    console.log('3. Check that database shows as "healthy"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTo get a personal access token:');
    console.log('1. Go to https://app.netlify.com/user/applications');
    console.log('2. Click "New access token"');
    console.log('3. Give it a name and copy the token');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();