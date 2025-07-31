import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.POSTGRES_PASSWORD) {
  console.error('❌ Error: POSTGRES_PASSWORD environment variable is not set');
  console.error('Please ensure your .env file contains POSTGRES_PASSWORD');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD
});

async function verify() {
  await client.connect();
  
  const result = await client.query(`
    SELECT slug, 
           content->'day' as day,
           content->'open_time' as open_time,
           content->'close_time' as close_time,
           content->'is_closed' as is_closed
    FROM cms_hours 
    ORDER BY (content->'order')::int
  `);
  
  console.log('Migrated Hours Data:');
  console.log('====================');
  result.rows.forEach(row => {
    console.log(`${row.day}: ${row.is_closed === 'true' ? 'CLOSED' : `${row.open_time} - ${row.close_time}`}`);
  });
  
  await client.end();
}

verify().catch(console.error);