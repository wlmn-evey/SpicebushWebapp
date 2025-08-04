#!/usr/bin/env node

/**
 * Complete Netlify Deployment Script
 * Sets all environment variables using the correct API format
 */

import https from 'https';
import { readFileSync } from 'fs';

const NETLIFY_TOKEN = 'nfp_ka3Q8G61s46RXFfNN3P8RdzHVx4TaHH98262';

// All environment variables with actual values
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
  EMAIL_FROM_NAME: 'Spicebush Montessori',
  UNIONE_REGION: 'us',
  
  // Site Configuration
  ADMIN_EMAIL: 'admin@spicebushmontessori.org',
  SITE_URL: 'https://spicebushmontessori.org',
  NODE_VERSION: '20',
  
  // Strapi (if used)
  PUBLIC_STRAPI_URL: 'http://localhost:1337'
};

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getSiteId() {
  console.log('\n🔍 Looking for your Netlify site...\n');
  
  // First, let's try to find the site from netlify.toml or git remote
  try {
    // Check if there's a .netlify folder with state.json
    const stateFile = readFileSync('.netlify/state.json', 'utf8');
    const state = JSON.parse(stateFile);
    if (state.siteId) {
      console.log(`✅ Found site ID from .netlify/state.json: ${state.siteId}`);
      return state.siteId;
    }
  } catch (e) {
    // Continue to manual entry
  }
  
  console.log('Please enter your Netlify Site ID.');
  console.log('You can find this in:');
  console.log('  1. Netlify Dashboard → Site Configuration → General');
  console.log('  2. The URL will be like: app.netlify.com/sites/YOUR-SITE-NAME/...');
  console.log('  3. Or look for "API ID" in site settings\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Site ID or Site Name: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setEnvironmentVariables(siteId) {
  console.log('\n🔧 Setting environment variables...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [key, value] of Object.entries(ENV_VARS)) {
    // Use the account-level environment variables endpoint
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/accounts/${siteId}/env/${key}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const data = JSON.stringify({
      context: 'all',
      value: value
    });
    
    try {
      await makeRequest(options, data);
      console.log(`✅ Set ${key}`);
      successCount++;
    } catch (error) {
      // Try site-specific endpoint as fallback
      options.path = `/api/v1/sites/${siteId}/env/${key}`;
      try {
        await makeRequest(options, data);
        console.log(`✅ Set ${key}`);
        successCount++;
      } catch (fallbackError) {
        console.log(`⚠️  Could not set ${key} - you may need to set it manually`);
        failCount++;
      }
    }
  }
  
  return { successCount, failCount };
}

async function triggerDeploy(siteId) {
  console.log('\n🚀 Triggering deployment...\n');
  
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
    const response = await makeRequest(options, JSON.stringify({ clear_cache: true }));
    console.log('✅ Deployment triggered successfully!');
    return true;
  } catch (error) {
    console.log('⚠️  Could not trigger deployment automatically.');
    console.log('Please trigger it manually from the Netlify dashboard.');
    return false;
  }
}

async function main() {
  console.log('🚀 Netlify Production Deployment Script');
  console.log('=======================================');
  console.log('This script will set all environment variables and deploy your site.\n');
  
  try {
    // Get site ID
    const siteId = await getSiteId();
    
    if (!siteId) {
      console.error('❌ Site ID is required');
      process.exit(1);
    }
    
    // Set environment variables
    const { successCount, failCount } = await setEnvironmentVariables(siteId);
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully set: ${successCount} variables`);
    if (failCount > 0) {
      console.log(`   ⚠️  Manual setup needed: ${failCount} variables`);
    }
    
    // Trigger deployment
    if (successCount > 0) {
      await triggerDeploy(siteId);
    }
    
    console.log('\n✨ Deployment process initiated!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your Netlify dashboard for deployment progress');
    console.log('2. Once deployed, test all functionality');
    console.log('3. Configure your custom domain if needed');
    console.log('\n🎉 Your Spicebush Montessori site is on its way to production!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Tip: You can manually set environment variables in the Netlify dashboard');
    console.log('   Go to: Site Configuration → Environment Variables');
  }
}

// Run the script
main().catch(console.error);