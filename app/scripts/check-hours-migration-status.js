#!/usr/bin/env node

/**
 * Script to check the current status of hours data migration
 * Compares markdown files in /src/content/hours/ with cms_hours table
 */

import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Client } = pg;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  database: process.env.DB_DATABASE || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  connectionTimeoutMillis: 5000,
  query_timeout: 30000
};

async function checkHoursMigrationStatus() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔍 Checking hours data migration status...\n');
    
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check if cms_hours table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cms_hours'
      );
    `;
    
    const tableExists = await client.query(tableExistsQuery);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Table cms_hours does not exist in the database');
      console.log('   The migration has not been run yet.\n');
      return;
    }
    
    console.log('✅ Table cms_hours exists\n');
    
    // Get count of records in cms_hours
    const countQuery = 'SELECT COUNT(*) as count FROM cms_hours';
    const countResult = await client.query(countQuery);
    const dbCount = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Database Status:`);
    console.log(`   - Records in cms_hours table: ${dbCount}`);
    
    // Get all records from cms_hours
    let dbRecords = [];
    if (dbCount > 0) {
      const recordsQuery = 'SELECT slug, content, created_at, updated_at FROM cms_hours ORDER BY slug';
      const recordsResult = await client.query(recordsQuery);
      dbRecords = recordsResult.rows;
      
      console.log('\n   Database records:');
      dbRecords.forEach(record => {
        const dayData = record.content;
        console.log(`   - ${record.slug}: ${dayData.day} (${dayData.open_time} - ${dayData.close_time})`);
      });
    }
    
    // Check markdown files
    const hoursDir = join(process.cwd(), 'src', 'content', 'hours');
    console.log(`\n📁 Markdown Files Status:`);
    console.log(`   - Directory: ${hoursDir}`);
    
    try {
      const files = await readdir(hoursDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      console.log(`   - Markdown files found: ${mdFiles.length}`);
      console.log('\n   Markdown file contents:');
      
      const mdData = [];
      
      for (const file of mdFiles) {
        const filePath = join(hoursDir, file);
        const content = await readFile(filePath, 'utf-8');
        const { data } = matter(content);
        const slug = file.replace('.md', '');
        
        mdData.push({ slug, data });
        console.log(`   - ${slug}: ${data.day} (${data.open_time} - ${data.close_time})`);
      }
      
      // Compare data
      console.log('\n📋 Migration Analysis:');
      
      if (dbCount === 0) {
        console.log('   ❌ No data has been migrated to the database yet');
        console.log(`   📝 ${mdFiles.length} markdown files need to be migrated`);
      } else if (dbCount === mdFiles.length) {
        console.log('   ✅ Number of database records matches markdown files');
        
        // Check if content matches
        let contentMatches = true;
        for (const mdItem of mdData) {
          const dbItem = dbRecords.find(r => r.slug === mdItem.slug);
          if (!dbItem) {
            console.log(`   ⚠️  Missing in database: ${mdItem.slug}`);
            contentMatches = false;
          } else {
            // Compare key fields
            const dbDay = dbItem.content.day;
            const mdDay = mdItem.data.day;
            if (dbDay !== mdDay) {
              console.log(`   ⚠️  Data mismatch for ${mdItem.slug}: DB has "${dbDay}", MD has "${mdDay}"`);
              contentMatches = false;
            }
          }
        }
        
        if (contentMatches) {
          console.log('   ✅ All content appears to be properly migrated');
        } else {
          console.log('   ⚠️  Some content differences detected');
        }
      } else {
        console.log(`   ⚠️  Mismatch: ${dbCount} records in database, ${mdFiles.length} markdown files`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading markdown files: ${error.message}`);
    }
    
    // Summary
    console.log('\n📊 Summary:');
    if (dbCount === 0) {
      console.log('   The hours data has NOT been migrated to the database yet.');
      console.log('   Action needed: Run the migration script to import markdown data into cms_hours table.');
    } else {
      console.log('   The hours data appears to have been migrated to the database.');
      console.log('   The application is likely using the database data instead of markdown files.');
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the check
checkHoursMigrationStatus().catch(console.error);