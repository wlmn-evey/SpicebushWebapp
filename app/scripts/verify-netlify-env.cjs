#!/usr/bin/env node

// Verification script for Netlify environment
const required = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'PUBLIC_SITE_URL'
];

const optional = [
  'UNIONE_API_KEY',
  'UNIONE_REGION',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME'
];

console.log('Checking Netlify Environment Variables...\n');

let missing = [];
required.forEach(key => {
  if (!process.env[key]) {
    missing.push(key);
    console.log(`❌ Missing: ${key}`);
  } else {
    console.log(`✅ Found: ${key}`);
  }
});

console.log('\nOptional variables:');
optional.forEach(key => {
  if (process.env[key]) {
    console.log(`✅ ${key}: configured`);
  } else {
    console.log(`⚠️  ${key}: not set`);
  }
});

if (missing.length > 0) {
  console.log('\n❌ Missing required variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('\n✅ All required variables configured!');
}