#!/usr/bin/env node

// Environment Variable Validation Script
// This ensures all required variables are present before building

const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
  'PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'UNIONE_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'ADMIN_EMAIL'
];

console.log('🔍 Environment Variable Validation');
console.log('==================================');

let missingRequired = [];
let missingOptional = [];

// Check required variables
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ MISSING REQUIRED: ${varName}`);
  } else {
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) : 
      '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

// Check optional variables
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingOptional.push(varName);
    console.log(`⚠️  MISSING OPTIONAL: ${varName}`);
  } else {
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) : 
      '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredVars.length - missingRequired.length}/${requiredVars.length}`);
console.log(`Optional variables: ${optionalVars.length - missingOptional.length}/${optionalVars.length}`);

if (missingRequired.length > 0) {
  console.log('\n❌ BUILD CANNOT PROCEED');
  console.log('Missing required environment variables:');
  missingRequired.forEach(varName => console.log(`  - ${varName}`));
  console.log('\nAdd these in Netlify dashboard: Site Settings > Environment Variables');
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.log('\n⚠️  Some optional features may not work:');
  missingOptional.forEach(varName => console.log(`  - ${varName}`));
}

console.log('\n✅ Environment validation passed!');
