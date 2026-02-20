#!/usr/bin/env node
const required = [
  'NETLIFY_DATABASE_URL',
  'PUBLIC_SITE_URL'
];

const optional = [
  'UNIONE_API_KEY',
  'SENDGRID_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'UNIONE_REGION',
  'EMAIL_SERVICE',
  'SENDGRID_FROM_EMAIL',
  'SENDGRID_TIMEOUT_MS',
  'SENDGRID_API_BASE_URL',
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
require('dotenv').config({ path: '.env.local', quiet: true });

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

const rawEmailService = (process.env.EMAIL_SERVICE || 'sendgrid').trim().toLowerCase();
const emailService = rawEmailService === 'send-grid' ? 'sendgrid' : rawEmailService;
if (!['sendgrid', 'unione'].includes(emailService)) {
  console.log('❌ EMAIL_SERVICE must be "sendgrid" (default) or "unione"');
  hasErrors = true;
}

if (!process.env.EMAIL_FROM) {
  console.log('⚠️  EMAIL_FROM is not set; sending may fail if a route does not pass a from address');
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
  if (emailService === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY is required for magic-link delivery when EMAIL_SERVICE=sendgrid');
    hasErrors = true;
  }

  if (emailService === 'unione' && !process.env.UNIONE_API_KEY) {
    console.log('❌ UNIONE_API_KEY is required for magic-link delivery when EMAIL_SERVICE=unione');
    hasErrors = true;
  }

  if (!process.env.EMAIL_FROM) {
    console.log('❌ EMAIL_FROM is required for magic-link delivery');
    hasErrors = true;
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
