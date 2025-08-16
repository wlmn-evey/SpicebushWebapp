#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const required = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PUBLIC_SITE_URL'
];

const optional = [
  'UNIONE_API_KEY',
  'STRIPE_SECRET_KEY',
  'PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'UNIONE_REGION',
  'EMAIL_SERVICE'
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
if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
  console.log('⚠️  Using Stripe TEST keys (ok for development)');
} else if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')) {
  console.log('✅ Using Stripe LIVE keys (production)');
}

if (process.env.PUBLIC_SUPABASE_URL?.includes('test-project')) {
  console.log('⚠️  Using test Supabase project');
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
    console.log('\n💡 Tip: Configure email service (UNIONE_API_KEY) for magic link functionality');
  }
}