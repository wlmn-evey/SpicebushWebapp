#!/usr/bin/env node

/**
 * Create a new Netlify site and configure it for deployment
 */

import https from 'https';
import { execSync } from 'child_process';

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
  NODE_VERSION: '20'
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

async function getGitHubRepo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    
    // Parse GitHub repo from various URL formats
    let match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace('.git', '');
      console.log(`📦 Found GitHub repository: ${owner}/${repo}`);
      return { owner, repo, url: `https://github.com/${owner}/${repo}` };
    }
  } catch (e) {
    console.log('⚠️  Could not detect GitHub repository');
  }
  return null;
}

async function createSite() {
  console.log('\n🏗️  Creating new Netlify site...\n');
  
  const gitRepo = await getGitHubRepo();
  
  const siteData = {
    name: 'spicebush-montessori',
    custom_domain: 'spicebushmontessori.org',
    build_settings: {
      cmd: 'npm run build',
      dir: 'dist',
      env: ENV_VARS
    }
  };
  
  // Add repo if we found it
  if (gitRepo) {
    siteData.repo = {
      provider: 'github',
      repo: `${gitRepo.owner}/${gitRepo.repo}`,
      branch: 'main',
      private: false,
      cmd: 'npm run build',
      dir: 'dist'
    };
  }
  
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
    console.log('✅ Site created successfully!');
    console.log(`   Site ID: ${site.id}`);
    console.log(`   Site Name: ${site.name}`);
    console.log(`   URL: ${site.url}`);
    console.log(`   Admin URL: ${site.admin_url}`);
    
    return site;
  } catch (error) {
    if (error.message.includes('name already taken')) {
      console.log('⚠️  Site name "spicebush-montessori" is already taken.');
      console.log('   Creating with auto-generated name...');
      
      delete siteData.name;
      const site = await makeRequest(options, siteData);
      console.log('✅ Site created successfully!');
      console.log(`   Site ID: ${site.id}`);
      console.log(`   Site Name: ${site.name}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   Admin URL: ${site.admin_url}`);
      
      return site;
    }
    throw error;
  }
}

async function setEnvironmentVariables(siteId) {
  console.log('\n🔧 Setting environment variables...\n');
  
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

async function linkGitHub(site) {
  if (!site.repo) {
    console.log('\n📎 To enable automatic deployments:');
    console.log('1. Go to your Netlify dashboard');
    console.log('2. Link your GitHub repository');
    console.log('3. Set branch to "main"');
  }
}

async function triggerDeploy(siteId) {
  console.log('\n🚀 Triggering initial deployment...\n');
  
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
    console.log('✅ Deployment triggered!');
    return true;
  } catch (error) {
    console.log('⚠️  Please trigger deployment manually from dashboard');
    return false;
  }
}

async function main() {
  console.log('🚀 Netlify Site Creation & Deployment');
  console.log('=====================================');
  
  try {
    // Create the site
    const site = await createSite();
    
    // Set environment variables
    const varsSet = await setEnvironmentVariables(site.id);
    console.log(`\n✅ Configured ${varsSet} environment variables`);
    
    // Save site info locally
    const fs = await import('fs');
    const siteInfo = {
      id: site.id,
      name: site.name,
      url: site.url,
      admin_url: site.admin_url,
      created_at: new Date().toISOString()
    };
    
    // Create .netlify directory if it doesn't exist
    if (!fs.existsSync('.netlify')) {
      fs.mkdirSync('.netlify');
    }
    
    fs.writeFileSync('.netlify/state.json', JSON.stringify({ siteId: site.id }, null, 2));
    fs.writeFileSync('NETLIFY_SITE_INFO.json', JSON.stringify(siteInfo, null, 2));
    
    console.log('\n📄 Site information saved to NETLIFY_SITE_INFO.json');
    
    // Provide instructions
    console.log('\n' + '='.repeat(60));
    console.log('✨ SUCCESS! Your Netlify site has been created!');
    console.log('='.repeat(60));
    
    console.log('\n📋 Site Details:');
    console.log(`   Site URL: ${site.url}`);
    console.log(`   Admin URL: ${site.admin_url}`);
    console.log(`   Site ID: ${site.id}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to your Netlify dashboard: ' + site.admin_url);
    console.log('2. Connect your GitHub repository (if not auto-connected)');
    console.log('3. Trigger a deployment or push to your main branch');
    console.log('4. Configure custom domain (spicebushmontessori.org)');
    
    console.log('\n💡 Quick Actions:');
    console.log('   - View site: ' + site.url);
    console.log('   - Check deploy status in dashboard');
    console.log('   - Configure domain settings');
    
    // Try to trigger initial deploy
    await linkGitHub(site);
    
    console.log('\n🎉 Your Spicebush Montessori site is ready for deployment!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify your Netlify token is valid');
    console.log('2. Check if you have permission to create sites');
    console.log('3. Try creating manually at app.netlify.com');
  }
}

// Run the script
main().catch(console.error);