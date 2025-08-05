#!/usr/bin/env node

/**
 * Script to set PUBLIC_SITE_URL environment variable on Netlify sites
 */

import { execSync } from 'child_process';

const ACCOUNT_ID = '68796db47d5552b20850ba0a';

const sites = [
  {
    id: '27a429f4-9a58-4421-bc1f-126d70d81aa1',
    name: 'spicebush-testing',
    url: 'https://spicebush-testing.netlify.app'
  },
  {
    id: 'f65d1828-9206-42f8-9b59-5ada4336f8b7',
    name: 'spicebush-montessori',
    url: 'https://spicebushmontessori.org'
  }
];

async function setEnvVar(siteId, siteName, key, value) {
  console.log(`\n📝 Setting ${key} for ${siteName}...`);
  
  try {
    // First link to the site
    console.log(`   Linking to site ${siteId}...`);
    execSync(`npx netlify unlink`, { stdio: 'ignore' });
    execSync(`npx netlify link --id ${siteId}`, { stdio: 'inherit' });
    
    // Create the environment variable using API
    const data = {
      key: key,
      values: [{
        value: value,
        context: "all"
      }]
    };
    
    console.log(`   Setting ${key} = ${value}`);
    
    // Use createEnvVars API method with proper path params
    const command = `npx netlify api createEnvVars --data '${JSON.stringify({
      body: [data],
      account_id: ACCOUNT_ID,
      site_id: siteId
    })}'`;
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`   ✅ ${key} set successfully!`);
    } catch (error) {
      // If create fails, try update
      console.log(`   Variable might exist, trying update...`);
      const updateCommand = `npx netlify api setEnvVarValue --data '${JSON.stringify({
        body: {
          context: "all",
          value: value
        },
        account_id: ACCOUNT_ID,
        site_id: siteId,
        key: key
      })}'`;
      try {
        execSync(updateCommand, { stdio: 'inherit' });
        console.log(`   ✅ ${key} updated successfully!`);
      } catch (updateError) {
        console.log(`   ❌ Failed to update. The variable may already be set correctly.`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Failed to set ${key} for ${siteName}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Setting PUBLIC_SITE_URL for Netlify sites\n');
  
  for (const site of sites) {
    await setEnvVar(site.id, site.name, 'PUBLIC_SITE_URL', site.url);
  }
  
  console.log('\n✨ Done! Environment variables have been configured.');
  console.log('\n📌 Next steps:');
  console.log('   1. Push to testing branch to trigger deployment');
  console.log('   2. Verify testing site uses https://spicebush-testing.netlify.app');
  console.log('   3. Verify production site uses https://spicebushmontessori.org');
}

main();