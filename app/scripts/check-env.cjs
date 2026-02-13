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
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_CALLBACK_URL',
  'AUTH0_AUDIENCE',
  'AUTH0_LOGOUT_RETURN_TO',
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

const authProvider = (process.env.AUTH_PROVIDER || 'netlify-magic-link').trim().toLowerCase();
if (!['netlify-magic-link', 'auth0'].includes(authProvider)) {
  console.log('❌ AUTH_PROVIDER must be either "auth0" or "netlify-magic-link"');
  hasErrors = true;
}

if (authProvider === 'auth0') {
  const auth0Required = ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];
  const missingAuth0 = auth0Required.filter((key) => !process.env[key]);
  if (missingAuth0.length > 0) {
    console.log(`❌ Missing Auth0 variables: ${missingAuth0.join(', ')}`);
    hasErrors = true;
  }
}

if (authProvider === 'netlify-magic-link') {
  const emailKeys = ['UNIONE_API_KEY', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'POSTMARK_SERVER_TOKEN'];
  const hasEmailKey = emailKeys.some((key) => !!process.env[key]);
  if (!hasEmailKey) {
    console.log('⚠️  No email provider API key configured; magic-link delivery will fail');
  }
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
    console.log('\n💡 Tip: Configure provider-specific auth vars (Auth0 or email provider) before deploy');
  }
}
