#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const result = dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('Testing environment variable loading with dotenv...\n');

if (result.error) {
  console.error('❌ Error loading .env.local:', result.error.message);
  process.exit(1);
}

console.log('✅ .env.local loaded successfully\n');

// Check required variables
const requiredVars = [
  'DB_READONLY_USER',
  'DB_READONLY_PASSWORD', 
  'DB_READONLY_HOST',
  'DB_READONLY_PORT',
  'DB_READONLY_DATABASE'
];

console.log('Checking required database variables:');
let allFound = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('PASSWORD') ? '***' : value;
    console.log(`✅ ${varName} = ${displayValue}`);
  } else {
    console.log(`❌ ${varName} = NOT FOUND`);
    allFound = false;
  }
});

if (allFound) {
  console.log('\n✅ All required environment variables are loaded!');
  console.log('\ndotenv is working correctly and can be used in the application.');
} else {
  console.log('\n❌ Some environment variables are missing!');
  process.exit(1);
}