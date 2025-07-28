#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env.local');

// Read-only user configuration
const READONLY_CONFIG = `
# Read-only database user (for public/read operations)
# Created: ${new Date().toISOString()}
READONLY_DB_USER=spicebush_readonly
READONLY_DB_PASSWORD=6afRf15M187YKF88UpWYJsn4zijsNiQMZmQVOK9Rdyw=
READONLY_DB_HOST=localhost
READONLY_DB_PORT=54322
READONLY_DB_DATABASE=postgres
READONLY_DB_CONNECTION_LIMIT=10
`;

// Check if .env.local exists
if (!fs.existsSync(ENV_FILE)) {
  console.error('Error: .env.local file not found');
  console.error('Please ensure you are running this from the app directory');
  process.exit(1);
}

// Read current content
const currentContent = fs.readFileSync(ENV_FILE, 'utf8');

// Check if readonly user config already exists
if (currentContent.includes('READONLY_DB_USER')) {
  console.log('Read-only user configuration already exists in .env.local');
  console.log('No changes made.');
  process.exit(0);
}

// Append the configuration
const updatedContent = currentContent.trimEnd() + '\n' + READONLY_CONFIG;

// Write back to file
fs.writeFileSync(ENV_FILE, updatedContent);

console.log('✅ Successfully added read-only user configuration to .env.local');
console.log('\nAdded variables:');
console.log('  - READONLY_DB_USER');
console.log('  - READONLY_DB_PASSWORD');
console.log('  - READONLY_DB_HOST');
console.log('  - READONLY_DB_PORT');
console.log('  - READONLY_DB_DATABASE');
console.log('  - READONLY_DB_CONNECTION_LIMIT');
console.log('\nYou can now use these environment variables in your application code.');