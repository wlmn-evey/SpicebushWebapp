#!/usr/bin/env node
const required = [
  'NETLIFY_DATABASE_URL',
  'PUBLIC_SITE_URL'
];

const optional = [
  'UNIONE_API_KEY',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'POSTMARK_SERVER_TOKEN',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'UNIONE_REGION',
  'EMAIL_SERVICE',
  'AUTH_PROVIDER',
  'ADMIN_EMAILS',
  'ADMIN_DOMAINS',
  'COMING_SOON_MODE'
];

// Load .env.local
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking environment variables...\n');

// Check required
let hasErrors = false;
console.log('Required variables:');
console.log('==================');
required.forEach(key => {
  if (!process.env[key]) {
    console.log(`❌ Missing required: ${key}`);
    hasErrors = true;
  } else {
    // Show partial value for debugging (first 10 chars)
    const value = process.env[key];
    const preview = value.length > 20 ? value.substring(0, 10) + '...' : '[set]';
    console.log(`✅ Found: ${key} = ${preview}`);
  }
});

console.log('\n📋 Optional variables:');
console.log('=====================');
optional.forEach(key => {
  if (!process.env[key]) {
    console.log(`⚠️  Missing optional: ${key}`);
  } else {
    const value = process.env[key];
    const preview = key.includes('KEY') ? '[set]' : value.substring(0, 20);
    console.log(`✅ Found: ${key} = ${preview}`);
  }
});

// Check for test vs production keys
console.log('\n🔐 Security Check:');
console.log('==================');
if (!process.env.NETLIFY_DATABASE_URL?.includes('sslmode=require')) {
  console.log('⚠️  NETLIFY_DATABASE_URL should include sslmode=require for production');
}

if (process.env.AUTH_PROVIDER && process.env.AUTH_PROVIDER !== 'netlify-magic-link') {
  console.log('⚠️  AUTH_PROVIDER is not set to netlify-magic-link');
}

// Final result
console.log('\n📊 Summary:');
console.log('===========');
if (hasErrors) {
  console.log('❌ Missing required variables. Please configure .env.local');
  console.log('\nTo fix: Copy .env.example to .env.local and fill in the missing values');
  process.exit(1);
} else {
  console.log('✅ All required variables configured!');
  
  // Count optional
  const configuredOptional = optional.filter(key => process.env[key]).length;
  console.log(`📋 ${configuredOptional}/${optional.length} optional variables configured`);
  
  if (configuredOptional < optional.length / 2) {
    console.log('\n💡 Tip: Configure an email provider API key for admin magic-link delivery');
  }
}
