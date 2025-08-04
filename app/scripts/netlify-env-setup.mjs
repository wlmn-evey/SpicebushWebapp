#!/usr/bin/env node

/**
 * Netlify Environment Variables Setup
 * Configures all required environment variables for Spicebush Montessori
 */

import https from 'https';
import { writeFileSync } from 'fs';

const NETLIFY_TOKEN = 'nfp_ka3Q8G61s46RXFfNN3P8RdzHVx4TaHH98262';

// Pre-configured environment variables
const ENV_VARS = {
  // Supabase Public
  PUBLIC_SUPABASE_URL: 'https://xnzweuepchbfffsegkml.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E',
  
  // Email Configuration
  UNIONE_API_KEY: '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme',
  EMAIL_FROM: 'noreply@spicebushmontessori.org',
  EMAIL_FROM_NAME: 'Spicebush Montessori',
  UNIONE_REGION: 'us',
  
  // Site Configuration
  ADMIN_EMAIL: 'admin@spicebushmontessori.org',
  SITE_URL: 'https://spicebushmontessori.org',
  NODE_VERSION: '20'
};

// Variables that need to be provided by user
const REQUIRED_FROM_USER = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL', 
  'DIRECT_URL'
];

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error: ${parsed.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getSites() {
  console.log('\n🔍 Fetching your Netlify sites...\n');
  
  const options = {
    hostname: 'api.netlify.com',
    path: '/api/v1/sites',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const sites = await makeRequest(options);
    return sites;
  } catch (error) {
    console.error('❌ Failed to fetch sites:', error.message);
    return [];
  }
}

async function setEnvironmentVariable(siteId, key, value) {
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${siteId}/env/${key}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    context: 'all',
    value: value
  };
  
  try {
    await makeRequest(options, data);
    console.log(`✅ Set ${key}`);
  } catch (error) {
    // Try PATCH if PUT fails
    options.method = 'PATCH';
    try {
      await makeRequest(options, data);
      console.log(`✅ Updated ${key}`);
    } catch (patchError) {
      console.error(`❌ Failed to set ${key}: ${patchError.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Netlify Environment Variables Setup');
  console.log('=====================================\n');
  
  // Get sites
  const sites = await getSites();
  
  if (sites.length === 0) {
    console.error('❌ No sites found. Please check your token and try again.');
    process.exit(1);
  }
  
  // Display sites
  console.log('Found the following sites:');
  sites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.name} (${site.url})`);
  });
  
  // Find Spicebush site
  let targetSite = sites.find(s => 
    s.name.toLowerCase().includes('spicebush') || 
    s.url?.includes('spicebush')
  );
  
  if (!targetSite && sites.length === 1) {
    targetSite = sites[0];
    console.log(`\n📌 Using the only available site: ${targetSite.name}`);
  } else if (!targetSite) {
    console.log('\n⚠️  Could not automatically identify Spicebush site.');
    console.log('Please manually select from the list above or check your Netlify dashboard.');
    process.exit(1);
  } else {
    console.log(`\n📌 Found Spicebush site: ${targetSite.name}`);
  }
  
  console.log('\n🔧 Setting environment variables...\n');
  
  // Set all pre-configured variables
  for (const [key, value] of Object.entries(ENV_VARS)) {
    await setEnvironmentVariable(targetSite.id, key, value);
  }
  
  // Create .env.production file for reference
  const envContent = Object.entries(ENV_VARS)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  
  const additionalEnv = `

# ⚠️ REQUIRED: Add these from your Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/settings/api
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Go to: Settings -> Database
DATABASE_URL="your-database-url-here"
DIRECT_URL="your-direct-url-here"`;
  
  writeFileSync('.env.production', envContent + additionalEnv);
  
  console.log('\n✅ Environment variables have been set on Netlify!');
  console.log('\n📝 Created .env.production file for reference');
  
  console.log('\n⚠️  IMPORTANT: You still need to add these variables manually:');
  console.log('   1. SUPABASE_SERVICE_ROLE_KEY');
  console.log('   2. DATABASE_URL');
  console.log('   3. DIRECT_URL');
  console.log('\n   Get these from: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/settings/api');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Add the remaining Supabase variables in Netlify dashboard');
  console.log('   2. Trigger a new deployment');
  console.log('   3. Verify the site is working at your Netlify URL');
  
  console.log('\n✨ Almost there! Just add those 3 Supabase variables and deploy!');
}

main().catch(console.error);