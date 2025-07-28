import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

// Supabase connection - using service role key for migration
const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTc1MzY0NzY3NCwiZXhwIjoyMDY5MDA3Njc0fQ.LwksGwNuaXRALeWXSTjXTl8K_Kqdc8hiW4EfuElaYGU'
);

async function migrateCollection(collectionName) {
  console.log(`\n📁 Migrating ${collectionName}...`);
  
  const contentDir = join(process.cwd(), 'src/content', collectionName);
  
  try {
    const files = await readdir(contentDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = join(contentDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = basename(file, '.md');
      
      // Simple mapping - store everything in the 'content' table
      const record = {
        type: collectionName,
        slug: slug,
        title: frontmatter.title || frontmatter.name || slug,
        data: {
          ...frontmatter,
          body: content.trim()
        },
        status: frontmatter.draft ? 'draft' : 'published',
        author_email: 'migration@spicebushmontessori.org'
      };
      
      const { error } = await supabase
        .from('content')
        .upsert(record, { onConflict: 'type,slug' });
      
      if (error) {
        console.error(`❌ Error migrating ${file}:`, error.message);
      } else {
        console.log(`✅ Migrated: ${slug}`);
      }
    }
  } catch (error) {
    console.log(`⏭️  Skipping ${collectionName} - directory not found or empty`);
  }
}

async function migrateSettings() {
  console.log('\n⚙️  Migrating settings...');
  
  const settingsDir = join(process.cwd(), 'src/content/settings');
  
  try {
    const files = await readdir(settingsDir);
    
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const filePath = join(settingsDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter } = matter(fileContent);
      
      const key = frontmatter.key || basename(file, '.md');
      
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: key,
          value: frontmatter.value
        }, { onConflict: 'key' });
      
      if (!error) {
        console.log(`✅ Setting: ${key} = ${frontmatter.value}`);
      }
    }
  } catch (error) {
    console.log('⏭️  No settings to migrate');
  }
}

async function migrateAll() {
  console.log('🚀 Starting simple content migration...\n');
  
  // Collections to migrate
  const collections = [
    'blog',
    'staff', 
    'hours',
    'tuition',
    'testimonials',
    'announcements',
    'events',
    'photos',
    'school-info',
    'coming-soon'
  ];
  
  // Migrate each collection
  for (const collection of collections) {
    await migrateCollection(collection);
  }
  
  // Migrate settings separately (different structure)
  await migrateSettings();
  
  console.log('\n✅ Migration complete!');
  console.log('📝 Next steps:');
  console.log('   1. Test the site locally');
  console.log('   2. Update page queries to use Supabase');
  console.log('   3. Keep markdown files as backup for 1 week');
}

// Run migration
migrateAll().catch(console.error);