import { readFile, readdir, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

// Escape single quotes for SQL
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

async function generateCollectionSQL(collectionName, statements) {
  console.log(`📁 Processing ${collectionName}...`);
  
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
      const jsonData = {
        ...frontmatter,
        body: content.trim()
      };
      
      const statement = `
INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  '${escapeSql(collectionName)}',
  '${escapeSql(slug)}',
  '${escapeSql(frontmatter.title || frontmatter.name || slug)}',
  '${escapeSql(JSON.stringify(jsonData))}'::jsonb,
  '${frontmatter.draft ? 'draft' : 'published'}',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();`;
      
      statements.push(statement);
      console.log(`  ✅ Processed: ${slug}`);
    }
  } catch (error) {
    console.log(`  ⏭️  Skipping ${collectionName} - directory not found or empty`);
  }
}

async function generateSettingsSQL(statements) {
  console.log('⚙️  Processing settings...');
  
  const settingsDir = join(process.cwd(), 'src/content/settings');
  
  try {
    const files = await readdir(settingsDir);
    
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const filePath = join(settingsDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter } = matter(fileContent);
      
      const key = frontmatter.key || basename(file, '.md');
      
      const statement = `
INSERT INTO settings (key, value)
VALUES (
  '${escapeSql(key)}',
  '${escapeSql(JSON.stringify(frontmatter.value || {}))}'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();`;
      
      statements.push(statement);
      console.log(`  ✅ Processed setting: ${key}`);
    }
  } catch (error) {
    console.log('  ⏭️  No settings to process');
  }
}

async function generateMigrationSQL() {
  console.log('🚀 Generating migration SQL...\n');
  
  const statements = [];
  
  // Add header
  statements.push('-- Migration: Import content from markdown files to Supabase');
  statements.push('-- Generated on: ' + new Date().toISOString());
  statements.push('');
  
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
  
  // Generate SQL for each collection
  for (const collection of collections) {
    statements.push(`-- ${collection} collection`);
    await generateCollectionSQL(collection, statements);
    statements.push('');
  }
  
  // Generate settings SQL
  statements.push('-- Settings');
  await generateSettingsSQL(statements);
  
  // Clean up test record
  statements.push('');
  statements.push('-- Cleanup');
  statements.push("DELETE FROM content WHERE slug = 'test-direct';");
  
  // Write to file
  const sqlContent = statements.join('\n');
  const outputPath = 'scripts/migrate-content.sql';
  await writeFile(outputPath, sqlContent, 'utf-8');
  
  console.log(`\n✅ Migration SQL generated: ${outputPath}`);
  console.log('📝 To run migration:');
  console.log('   docker exec -i app-supabase-db-1 psql -U postgres < scripts/migrate-content.sql');
}

// Run generator
generateMigrationSQL().catch(console.error);