import pg from 'pg';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

// Direct database connection - bypassing Supabase auth
const { Client } = pg;
const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your-super-secret-and-long-postgres-password'
});

/**
 * Migrates coming-soon settings from markdown files to the database
 * using direct PostgreSQL connection to avoid auth issues
 */
async function migrateComingSoonSettings() {
  console.log('🚀 Starting coming-soon settings migration...\n');
  
  const settingsDir = join(process.cwd(), 'src/content/settings');
  
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Define the settings files we need to migrate
    const settingFiles = [
      'coming-soon-mode.md',
      'coming-soon-launch-date.md',
      'coming-soon-message.md',
      'coming-soon-newsletter.md'
    ];
    
    // Check for existing coming_soon_enabled setting that needs renaming
    console.log('🔍 Checking for existing coming_soon_enabled setting...');
    const existingResult = await client.query(
      `SELECT key, value FROM settings WHERE key = 'coming_soon_enabled'`
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      console.log(`Found existing coming_soon_enabled: ${existing.value}`);
      console.log('This will be renamed to coming_soon_mode\n');
      
      // Rename the key from coming_soon_enabled to coming_soon_mode
      await client.query(
        `UPDATE settings 
         SET key = 'coming_soon_mode', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE key = 'coming_soon_enabled'`
      );
      console.log('✅ Renamed coming_soon_enabled to coming_soon_mode\n');
    } else {
      console.log('No existing coming_soon_enabled setting found\n');
    }
    
    console.log(`📁 Processing ${settingFiles.length} settings files...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const fileName of settingFiles) {
      const filePath = join(settingsDir, fileName);
      
      try {
        // Read and parse markdown file
        const fileContent = await readFile(filePath, 'utf-8');
        const { data: frontmatter } = matter(fileContent);
        
        const key = frontmatter.key;
        const value = frontmatter.value;
        
        // Upsert into settings table
        await client.query(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (key)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = CURRENT_TIMESTAMP
        `, [key, value]);
        
        console.log(`✅ Migrated: ${key} = "${value}"`);
        successCount++;
        
      } catch (err) {
        console.error(`❌ Error processing ${fileName}:`, err.message);
        errorCount++;
      }
    }
    
    // Verify migration results
    console.log('\n📊 Verifying migration...');
    const verifyResult = await client.query(`
      SELECT key, value 
      FROM settings 
      WHERE key LIKE 'coming_soon_%' 
      ORDER BY key
    `);
    
    console.log('\n🔍 Current coming-soon settings in database:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.key}: ${row.value}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration completed:');
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${errorCount}`);
    console.log(`  - Total settings in DB: ${verifyResult.rows.length}`);
    console.log('='.repeat(50));
    
    if (errorCount > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run migration
console.log('🧙 Direct PostgreSQL Migration Script for Coming-Soon Settings');
console.log('=' + '='.repeat(55) + '\n');

migrateComingSoonSettings().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});