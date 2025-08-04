#!/usr/bin/env node
/**
 * Migrate school-info data to settings table
 * This ensures address, phone, and email are available from database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Direct PostgreSQL connection
const dbConfig = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password'
};

const client = new pg.Client(dbConfig);

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read the school-info markdown file
    const schoolInfoPath = path.join(__dirname, '../src/content/school-info/general.md');
    const content = fs.readFileSync(schoolInfoPath, 'utf-8');
    const { data } = matter(content);

    console.log('School info data:', data);

    // Prepare settings to insert
    const settings = [
      { key: 'school_phone', value: data.phone },
      { key: 'school_email', value: data.email },
      { key: 'school_address_street', value: data.address.street },
      { key: 'school_address_city', value: data.address.city },
      { key: 'school_address_state', value: data.address.state },
      { key: 'school_address_zip', value: data.address.zip },
      { key: 'school_ages_served', value: data.agesServed },
      { key: 'school_year', value: data.schoolYear },
      { key: 'school_extended_care_until', value: data.extendedCareUntil },
      { key: 'school_facebook', value: data.socialMedia?.facebook || '' },
      { key: 'school_instagram', value: data.socialMedia?.instagram || '' },
      { key: 'school_founded', value: data.founded?.toString() || '' }
    ];

    // Insert or update each setting
    for (const setting of settings) {
      const query = `
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE 
        SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
      
      await client.query(query, [setting.key, setting.value]);
      console.log(`✓ Migrated ${setting.key}: ${setting.value}`);
    }

    console.log('\n✅ School info migration completed successfully!');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
migrate();