import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Validate required environment variables
if (!process.env.POSTGRES_PASSWORD) {
  console.error('❌ Error: POSTGRES_PASSWORD environment variable is not set');
  console.error('Please ensure your .env file contains POSTGRES_PASSWORD');
  process.exit(1);
}

const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD
});

async function testHoursDB() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Query the cms_hours table
    const result = await client.query('SELECT slug, content FROM cms_hours ORDER BY (content->>\'order\')::int');
    
    console.log('📊 Hours Data in Database:');
    console.log('========================\n');
    
    result.rows.forEach(row => {
      const data = row.content;
      console.log(`📅 ${data.day} (${row.slug}):`);
      console.log(`   Status: ${data.is_closed ? '🔴 CLOSED' : '🟢 OPEN'}`);
      if (!data.is_closed) {
        console.log(`   Hours: ${data.open_time} - ${data.close_time}`);
      }
      if (data.note) {
        console.log(`   Note: ${data.note}`);
      }
      console.log('');
    });
    
    console.log(`Total records: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testHoursDB().catch(console.error);