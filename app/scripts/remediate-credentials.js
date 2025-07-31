#!/usr/bin/env node
/**
 * Credential Remediation Script
 * Removes hardcoded credentials and updates files to use environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const filesToUpdate = [
  {
    path: 'scripts/setup-hosted-supabase.js',
    replacements: [
      {
        search: "const url = process.env.HOSTED_SUPABASE_URL || 'https://xnzweuepchbfffsegkml.supabase.co';",
        replace: "const url = process.env.HOSTED_SUPABASE_URL;\n\nif (!url) {\n  console.error('❌ Missing HOSTED_SUPABASE_URL environment variable');\n  console.error('   Set HOSTED_SUPABASE_URL=https://your-project.supabase.co');\n  process.exit(1);\n}"
      }
    ]
  },
  {
    path: 'scripts/import-via-sql-editor.js',
    replacements: [
      {
        search: "console.log('2. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/sql/new');",
        replace: "const projectId = process.env.SUPABASE_PROJECT_ID || 'YOUR_PROJECT_ID';\nconsole.log(`2. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);"
      }
    ]
  },
  {
    path: 'tests/readonly-user-production-test.js',
    replacements: [
      {
        search: "const READONLY_USER = {\n  user: 'spicebush_readonly',\n  password: '6afRf15M187YKF88UpWYJsn4zijsNiQMZmQVOK9Rdyw='\n};",
        replace: "const READONLY_USER = {\n  user: process.env.DB_READONLY_USER || 'spicebush_readonly',\n  password: process.env.DB_READONLY_PASSWORD || 'test_readonly_password'\n};"
      }
    ]
  },
  {
    path: 'tests/auth/integration.test.ts',
    replacements: [
      {
        search: "const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';",
        replace: "const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY;\n\nif (!SUPABASE_ANON_KEY) {\n  throw new Error('Missing PUBLIC_SUPABASE_ANON_KEY or TEST_SUPABASE_ANON_KEY environment variable');\n}"
      }
    ]
  },
  {
    path: 'tests/quick-auth-check.js',
    replacements: [
      {
        search: "const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';",
        replace: "const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY;\n\nif (!SUPABASE_ANON_KEY) {\n  console.error('Missing PUBLIC_SUPABASE_ANON_KEY or TEST_SUPABASE_ANON_KEY environment variable');\n  process.exit(1);\n}"
      }
    ]
  },
  {
    path: 'e2e/magic-link-comprehensive.spec.ts',
    replacements: [
      {
        search: "const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';",
        replace: "const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY;\n\nif (!SUPABASE_ANON_KEY) {\n  throw new Error('Missing SUPABASE_ANON_KEY or TEST_SUPABASE_ANON_KEY environment variable');\n}"
      }
    ]
  }
];

console.log('🔒 Starting credential remediation...\n');

let updatedCount = 0;
let errorCount = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(projectRoot, file.path);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file.path}`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const replacement of file.replacements) {
      if (content.includes(replacement.search)) {
        content = content.replace(replacement.search, replacement.replace);
        modified = true;
        console.log(`✅ Updated: ${file.path}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    } else {
      console.log(`ℹ️  No changes needed: ${file.path}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file.path}: ${error.message}`);
    errorCount++;
  }
}

// Create or update .env.test file with test credentials
const envTestPath = path.join(projectRoot, '.env.test');
const envTestContent = `# Test Environment Variables
# These are safe test/demo credentials for running tests

# Supabase Demo Instance (public test credentials)
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA

# Test Database Credentials (for local Docker environment)
DB_READONLY_USER=spicebush_readonly
DB_READONLY_PASSWORD=test_readonly_password

# Note: These are ONLY for testing. Never use these in production!
`;

try {
  fs.writeFileSync(envTestPath, envTestContent, 'utf8');
  console.log('\n✅ Created .env.test with safe test credentials');
} catch (error) {
  console.error(`❌ Error creating .env.test: ${error.message}`);
  errorCount++;
}

// Update .gitignore to ensure .env.test is tracked
const gitignorePath = path.join(projectRoot, '.gitignore');
try {
  let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  // Check if .env.test is already allowed
  if (!gitignoreContent.includes('!.env.test')) {
    // Find the line with !.env.example and add !.env.test after it
    gitignoreContent = gitignoreContent.replace(
      '!.env.example',
      '!.env.example\n!.env.test'
    );
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    console.log('✅ Updated .gitignore to allow .env.test');
  }
} catch (error) {
  console.error(`❌ Error updating .gitignore: ${error.message}`);
  errorCount++;
}

console.log(`\n📊 Summary:`);
console.log(`   Files updated: ${updatedCount}`);
console.log(`   Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n✅ Credential remediation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Run tests to ensure everything works');
  console.log('3. Commit the changes');
  console.log('4. Consider cleaning git history if needed');
} else {
  console.log('\n⚠️  Some errors occurred during remediation');
  process.exit(1);
}