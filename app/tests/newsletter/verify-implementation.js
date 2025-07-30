/**
 * Quick verification script to check newsletter implementation
 * Run with: node tests/newsletter/verify-implementation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Newsletter Implementation Verification');
console.log('=====================================\n');

const checks = [
  {
    name: 'Database Migration',
    file: 'supabase/migrations/20250729_newsletter_subscribers.sql',
    required: true
  },
  {
    name: 'Database Operations',
    file: 'src/lib/content-db-direct.ts',
    search: ['subscribeToNewsletter', 'unsubscribeFromNewsletter', 'getNewsletterSubscribers']
  },
  {
    name: 'Subscribe API Endpoint',
    file: 'src/pages/api/newsletter/subscribe.ts',
    required: true
  },
  {
    name: 'Admin API Endpoint',
    file: 'src/pages/api/admin/newsletter.ts',
    required: true
  },
  {
    name: 'Newsletter Component',
    file: 'src/components/NewsletterSignup.astro',
    required: true
  },
  {
    name: 'Admin Interface',
    file: 'src/pages/admin/newsletter.astro',
    required: true
  },
  {
    name: 'Footer Integration',
    file: 'src/components/Footer.astro',
    search: ['NewsletterSignup']
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const filePath = path.join(path.dirname(path.dirname(__dirname)), check.file);
  
  try {
    if (fs.existsSync(filePath)) {
      if (check.search) {
        const content = fs.readFileSync(filePath, 'utf8');
        const found = check.search.every(term => content.includes(term));
        
        if (found) {
          console.log(`✅ ${check.name}: Found with required content`);
          passed++;
        } else {
          console.log(`❌ ${check.name}: File exists but missing required content`);
          console.log(`   Missing: ${check.search.join(', ')}`);
          failed++;
        }
      } else {
        console.log(`✅ ${check.name}: File exists`);
        passed++;
      }
    } else {
      console.log(`❌ ${check.name}: File not found at ${check.file}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.name}: Error checking - ${error.message}`);
    failed++;
  }
});

console.log('\n=====================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✨ All implementation files are in place!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration');
  console.log('2. Start the dev server: npm run dev');
  console.log('3. Test the newsletter signup in the footer');
  console.log('4. Check the admin interface at /admin/newsletter');
  console.log('5. Run the full test suite: ./tests/newsletter/run-newsletter-tests.sh');
} else {
  console.log('\n⚠️  Some files are missing or incomplete.');
  console.log('Please check the implementation.');
  process.exit(1);
}