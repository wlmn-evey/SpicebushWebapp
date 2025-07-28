import pkg from 'pg';
const { Client } = pkg;
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

// Direct PostgreSQL connection for migration
const client = new Client({
  host: 'localhost',
  port: 54322,
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  database: 'postgres'
});

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
      
      // Prepare data as JSON
      const jsonData = JSON.stringify({
        ...frontmatter,
        body: content.trim()
      });
      
      const query = `
        INSERT INTO content (type, slug, title, data, status, author_email)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT (type, slug) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          data = EXCLUDED.data,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
      
      const values = [
        collectionName,
        slug,
        frontmatter.title || frontmatter.name || slug,
        jsonData,
        frontmatter.draft ? 'draft' : 'published',
        'migration@spicebushmontessori.org'
      ];
      
      try {
        await client.query(query, values);
        console.log(`✅ Migrated: ${slug}`);
      } catch (error) {
        console.error(`❌ Error migrating ${file}:`, error.message);
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
      
      const query = `
        INSERT INTO settings (key, value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = NOW()
      `;
      
      try {
        await client.query(query, [key, JSON.stringify(frontmatter.value || {})]);
        console.log(`✅ Setting: ${key}`);
      } catch (error) {
        console.error(`❌ Error migrating setting ${key}:`, error.message);
      }
    }
  } catch (error) {
    console.log('⏭️  No settings to migrate');
  }
}

async function migrateAll() {
  console.log('🚀 Starting direct database migration...\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
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
    
    // Clean up test record
    await client.query("DELETE FROM content WHERE slug = 'test-direct'");
    
    console.log('\n✅ Migration complete!');
    console.log('📝 Next steps:');
    console.log('   1. Test the site locally');
    console.log('   2. Update page queries to use Supabase');
    console.log('   3. Keep markdown files as backup for 1 week');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

// Run migration
migrateAll().catch(console.error);