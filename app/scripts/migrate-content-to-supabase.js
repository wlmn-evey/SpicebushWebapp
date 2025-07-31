#!/usr/bin/env node

/**
 * Migration script to move content from flat files to Supabase
 * Run with: node scripts/migrate-content-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_ANON_KEY');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Collections to migrate
const collections = [
  'blog',
  'staff',
  'hours',
  'tuition',
  'testimonials',
  'photos',
  'school-info',
  'settings'
];

async function migrateCollection(collectionName) {
  console.log(`\nMigrating ${collectionName}...`);
  
  try {
    // Find all markdown files for this collection
    const pattern = path.join(__dirname, '..', 'src', 'content', collectionName, '*.md');
    const files = await glob(pattern);
    
    if (files.length === 0) {
      console.log(`No files found for ${collectionName}`);
      return;
    }
    
    console.log(`Found ${files.length} files`);
    
    for (const file of files) {
      try {
        // Read the file
        const content = await fs.readFile(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        // Get the slug from filename
        const filename = path.basename(file, '.md');
        const slug = filename;
        
        // Prepare the data
        const entry = {
          type: collectionName,
          slug: slug,
          title: frontmatter.title || frontmatter.name || slug,
          data: {
            ...frontmatter,
            body: body.trim()
          },
          status: frontmatter.draft ? 'draft' : 'published',
          author_email: 'migration@system.local',
          created_at: frontmatter.date || frontmatter.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Special handling for settings
        if (collectionName === 'settings') {
          const { data, error } = await supabase
            .from('settings')
            .upsert({
              key: slug,
              value: frontmatter.value || frontmatter
            });
            
          if (error) {
            console.error(`  ✗ Failed to migrate ${filename}:`, error.message);
          } else {
            console.log(`  ✓ Migrated ${filename}`);
          }
        } else {
          // Insert into content table
          const { data, error } = await supabase
            .from('content')
            .upsert(entry, { onConflict: ['type', 'slug'] });
          
          if (error) {
            console.error(`  ✗ Failed to migrate ${filename}:`, error.message);
          } else {
            console.log(`  ✓ Migrated ${filename}`);
          }
        }
        
      } catch (fileError) {
        console.error(`  ✗ Error processing ${path.basename(file)}:`, fileError.message);
      }
    }
    
  } catch (error) {
    console.error(`Error migrating ${collectionName}:`, error.message);
  }
}

async function createSchoolInfoEntry() {
  console.log('\nCreating school-info entry...');
  
  try {
    // Check if school-info.md exists
    const schoolInfoPath = path.join(__dirname, '..', 'src', 'content', 'school-info', 'general.md');
    
    try {
      const content = await fs.readFile(schoolInfoPath, 'utf-8');
      const { data: frontmatter } = matter(content);
      
      const entry = {
        type: 'school-info',
        slug: 'general',
        title: 'School Information',
        data: frontmatter,
        status: 'published',
        author_email: 'migration@system.local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('content')
        .upsert(entry, { onConflict: ['type', 'slug'] });
        
      if (error) {
        console.error('  ✗ Failed to create school-info:', error.message);
      } else {
        console.log('  ✓ Created school-info entry');
      }
    } catch (error) {
      // Create default school info if file doesn't exist
      const defaultSchoolInfo = {
        type: 'school-info',
        slug: 'general',
        title: 'School Information',
        data: {
          name: 'Spicebush Montessori School',
          phone: '(484) 202-0712',
          email: 'info@spicebushmontessori.org',
          address: {
            street: '2300 Old West Chester Pike',
            city: 'Havertown',
            state: 'PA',
            zip: '19083'
          },
          agesServed: '3-6',
          extendedCareUntil: '5:30 PM',
          socialMedia: {
            facebook: 'https://www.facebook.com/spicebushmontessori',
            instagram: 'https://www.instagram.com/spicebushmontessori'
          }
        },
        status: 'published',
        author_email: 'migration@system.local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: defaultError } = await supabase
        .from('content')
        .upsert(defaultSchoolInfo, { onConflict: ['type', 'slug'] });
        
      if (defaultError) {
        console.error('  ✗ Failed to create default school-info:', defaultError.message);
      } else {
        console.log('  ✓ Created default school-info entry');
      }
    }
  } catch (error) {
    console.error('Error creating school-info:', error.message);
  }
}

async function main() {
  console.log('Starting content migration to Supabase...');
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  
  // Migrate each collection
  for (const collection of collections) {
    await migrateCollection(collection);
  }
  
  // Create school-info entry if needed
  await createSchoolInfoEntry();
  
  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Test the website to ensure all content loads correctly');
  console.log('2. Use the admin panel to make any necessary updates');
  console.log('3. Once verified, you can remove the src/content directory');
}

// Run the migration
main().catch(console.error);