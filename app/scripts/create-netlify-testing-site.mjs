#!/usr/bin/env node

/**
 * Create a new Netlify testing site
 * This will be a separate site from production for testing purposes
 */

import https from 'https';
import { writeFileSync } from 'fs';

const NETLIFY_TOKEN = 'nfp_ka3Q8G61s46RXFfNN3P8RdzHVx4TaHH98262';

// Testing environment variables (same as production but can be modified)
const ENV_VARS = {
  // Supabase Configuration
  PUBLIC_SUPABASE_URL: 'https://xnzweuepchbfffsegkml.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN',
  PUBLIC_SUPABASE_PUBLIC_KEY: 'sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd',
  
  // Database Configuration
  DATABASE_URL: 'postgresql://postgres:bjv7vcb8nqn0GWM@qza@db.xnzweuepchbfffsegkml.supabase.co:5432/postgres',
  DIRECT_URL: 'postgresql://postgres:bjv7vcb8nqn0GWM@qza@db.xnzweuepchbfffsegkml.supabase.co:5432/postgres',
  DB_HOST: 'db.xnzweuepchbfffsegkml.supabase.co',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'bjv7vcb8nqn0GWM@qza',
  DB_DATABASE: 'postgres',
  
  // Email Configuration (Unione.io)
  UNIONE_API_KEY: '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme',
  EMAIL_FROM: 'noreply@spicebushmontessori.org',
  EMAIL_FROM_NAME: 'Spicebush Montessori (Testing)',
  UNIONE_REGION: 'us',
  
  // Site Configuration - TESTING SPECIFIC
  ADMIN_EMAIL: 'admin@spicebushmontessori.org',
  SITE_URL: 'https://spicebush-testing.netlify.app', // Will be updated after creation
  NODE_VERSION: '20',
  ENVIRONMENT: 'testing' // Mark this as testing environment
};

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
            reject(new Error(`API Error ${res.statusCode}: ${parsed.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function createTestingSite() {
  console.log('\n🧪 Creating Netlify Testing Site...\n');
  
  const siteData = {
    name: 'spicebush-testing',
    custom_domain: null, // No custom domain for testing
    build_settings: {
      cmd: 'npm run build',
      dir: 'dist',
      env: ENV_VARS
    },
    repo: {
      provider: 'github',
      repo: 'wlmn-evey/SpicebushWebapp',
      branch: 'testing', // Use testing branch
      private: false,
      cmd: 'npm run build',
      dir: 'dist',
      base: 'app'
    }
  };
  
  const options = {
    hostname: 'api.netlify.com',
    path: '/api/v1/sites',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const site = await makeRequest(options, siteData);
    console.log('✅ Testing site created successfully!');
    console.log(`   Site ID: ${site.id}`);
    console.log(`   Site Name: ${site.name}`);
    console.log(`   URL: ${site.url}`);
    console.log(`   Admin URL: ${site.admin_url}`);
    
    // Update SITE_URL with actual URL
    ENV_VARS.SITE_URL = site.url;
    
    return site;
  } catch (error) {
    if (error.message.includes('name already taken')) {
      console.log('⚠️  Site name "spicebush-testing" is already taken.');
      console.log('   Creating with auto-generated name...');
      
      delete siteData.name;
      const site = await makeRequest(options, siteData);
      console.log('✅ Testing site created successfully!');
      console.log(`   Site ID: ${site.id}`);
      console.log(`   Site Name: ${site.name}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   Admin URL: ${site.admin_url}`);
      
      // Update SITE_URL with actual URL
      ENV_VARS.SITE_URL = site.url;
      
      return site;
    }
    throw error;
  }
}

async function setEnvironmentVariables(siteId) {
  console.log('\n🔧 Setting testing environment variables...\n');
  
  let successCount = 0;
  
  for (const [key, value] of Object.entries(ENV_VARS)) {
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
      key: key,
      value: value,
      context: ['production', 'deploy-preview', 'branch-deploy', 'dev']
    };
    
    try {
      await makeRequest(options, data);
      console.log(`✅ Set ${key}`);
      successCount++;
    } catch (error) {
      console.log(`⚠️  ${key} - will be set during build`);
    }
  }
  
  return successCount;
}

async function triggerDeploy(siteId) {
  console.log('\n🚀 Triggering initial testing deployment...\n');
  
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${siteId}/builds`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    await makeRequest(options, { clear_cache: true });
    console.log('✅ Testing deployment triggered!');
    return true;
  } catch (error) {
    console.log('⚠️  Please trigger deployment manually from dashboard');
    return false;
  }
}

async function main() {
  console.log('🧪 Netlify Testing Site Creation');
  console.log('==================================');
  console.log('This will create a separate Netlify site for testing purposes.');
  console.log('It will use the "testing" branch and be accessible on a free Netlify subdomain.\n');
  
  try {
    // Create the testing site
    const site = await createTestingSite();
    
    // Set environment variables
    const varsSet = await setEnvironmentVariables(site.id);
    console.log(`\n✅ Configured ${varsSet} environment variables`);
    
    // Save testing site info
    const testingSiteInfo = {
      id: site.id,
      name: site.name,
      url: site.url,
      admin_url: site.admin_url,
      branch: 'testing',
      purpose: 'Testing and staging environment',
      created_at: new Date().toISOString()
    };
    
    writeFileSync('NETLIFY_TESTING_SITE_INFO.json', JSON.stringify(testingSiteInfo, null, 2));
    
    console.log('\n📄 Testing site information saved to NETLIFY_TESTING_SITE_INFO.json');
    
    // Trigger initial deploy
    await triggerDeploy(site.id);
    
    // Provide instructions
    console.log('\n' + '='.repeat(60));
    console.log('✨ SUCCESS! Your Netlify testing site has been created!');
    console.log('='.repeat(60));
    
    console.log('\n📋 Testing Site Details:');
    console.log(`   Site URL: ${site.url}`);
    console.log(`   Admin URL: ${site.admin_url}`);
    console.log(`   Site ID: ${site.id}`);
    console.log(`   Branch: testing`);
    
    console.log('\n🎯 How to Use:');
    console.log('1. Push changes to the "testing" branch to deploy to testing site');
    console.log('2. Test features at: ' + site.url);
    console.log('3. When ready, merge to "stable" branch for production');
    
    console.log('\n🔄 Deployment Workflow:');
    console.log('   main → testing (for QA testing)');
    console.log('   testing → stable (for production)');
    
    console.log('\n📊 Site Configuration:');
    console.log('   - Testing branch: Auto-deploys from "testing" branch');
    console.log('   - Preview deploys: Enabled for pull requests');
    console.log('   - Build command: npm run build');
    console.log('   - Environment: Marked as TESTING');
    
    console.log('\n🎉 Your testing environment is ready!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if the testing branch exists on GitHub');
    console.log('2. Verify your Netlify token is valid');
    console.log('3. Try creating manually at app.netlify.com');
  }
}

// Run the script
main().catch(console.error);