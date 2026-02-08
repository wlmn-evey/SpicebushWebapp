#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(`${colors.red}Missing NETLIFY_DATABASE_URL (or DATABASE_URL).${colors.reset}`);
  process.exit(1);
}

const client = new Client({ connectionString });

const requiredTables = ['settings', 'content', 'admin_login_tokens', 'admin_auth_sessions'];
const essentialSettings = ['coming_soon_enabled', 'donation_external_link', 'enrollment_external_link'];
const essentialContentTypes = ['hours', 'staff', 'tuition'];

async function verifyTables() {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [requiredTables]
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((name) => !found.has(name));

  if (missing.length > 0) {
    console.log(`${colors.red}Missing required tables:${colors.reset} ${missing.join(', ')}`);
    return false;
  }

  console.log(`${colors.green}Required tables found:${colors.reset} ${requiredTables.join(', ')}`);
  return true;
}

async function verifySettings() {
  const result = await client.query(
    `
      SELECT key
      FROM settings
      WHERE key = ANY($1::text[])
    `,
    [essentialSettings]
  );

  const found = new Set(result.rows.map((row) => row.key));
  const missing = essentialSettings.filter((key) => !found.has(key));

  if (missing.length > 0) {
    console.log(`${colors.yellow}Missing recommended settings:${colors.reset} ${missing.join(', ')}`);
  } else {
    console.log(`${colors.green}Essential settings are present.${colors.reset}`);
  }
}

async function verifyContent() {
  const result = await client.query(
    `
      SELECT type, COUNT(*)::int AS count
      FROM content
      WHERE type = ANY($1::text[])
      GROUP BY type
      ORDER BY type
    `,
    [essentialContentTypes]
  );

  const counts = new Map(result.rows.map((row) => [row.type, row.count]));
  const missingTypes = essentialContentTypes.filter((type) => !counts.has(type));

  if (missingTypes.length > 0) {
    console.log(`${colors.yellow}Missing content types:${colors.reset} ${missingTypes.join(', ')}`);
  } else {
    console.log(`${colors.green}Essential content types have records.${colors.reset}`);
  }

  for (const type of essentialContentTypes) {
    const count = counts.get(type) || 0;
    console.log(`  - ${type}: ${count}`);
  }
}

async function main() {
  console.log(`${colors.blue}=== Netlify DB Connectivity Check ===${colors.reset}\n`);

  try {
    await client.connect();
    console.log(`${colors.green}Connected to database.${colors.reset}`);

    const tablesOk = await verifyTables();
    await verifySettings();
    await verifyContent();

    console.log('\nChecks complete.');
    process.exit(tablesOk ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Database verification failed:${colors.reset} ${error.message}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
