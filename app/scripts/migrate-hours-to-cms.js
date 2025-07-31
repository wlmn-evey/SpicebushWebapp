import pg from 'pg';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.POSTGRES_PASSWORD) {
  console.error('❌ Error: POSTGRES_PASSWORD environment variable is not set');
  console.error('Please ensure your .env file contains POSTGRES_PASSWORD');
  process.exit(1);
}

// Direct database connection - much simpler for migrations
const { Client } = pg;
const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD
});

async function migrateHours() {
  console.log('🕐 Starting hours data migration...\n');
  
  const hoursDir = join(process.cwd(), 'src/content/hours');
  
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read all markdown files
    const files = await readdir(hoursDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`📁 Found ${mdFiles.length} hours files to migrate\n`);
    
    for (const file of mdFiles) {
      const filePath = join(hoursDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = basename(file, '.md');
      
      // Create the JSONB content
      const contentJson = {
        day: frontmatter.day,
        open_time: frontmatter.open_time,
        close_time: frontmatter.close_time,
        is_closed: frontmatter.is_closed || false,
        note: frontmatter.note || '',
        order: frontmatter.order,
        body: content.trim()
      };
      
      // Upsert into cms_hours table
      try {
        await client.query(`
          INSERT INTO cms_hours (slug, content, author)
          VALUES ($1, $2, $3)
          ON CONFLICT (slug)
          DO UPDATE SET
            content = EXCLUDED.content,
            author = EXCLUDED.author,
            updated_at = CURRENT_TIMESTAMP
        `, [slug, JSON.stringify(contentJson), 'migration@spicebushmontessori.org']);
        
        console.log(`✅ Migrated: ${slug} (${frontmatter.day})`);
      } catch (err) {
        console.error(`❌ Error migrating ${file}:`, err.message);
      }
    }
    
    // Verify migration
    console.log('\n📊 Verifying migration...');
    const result = await client.query('SELECT COUNT(*) FROM cms_hours');
    const count = result.rows[0].count;
    
    console.log(`\n✅ Migration complete! ${count} records in cms_hours table`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
migrateHours().catch(console.error);