# Security Phase 1.2: Update Application Code - Detailed Micro-Instructions
Date: 2025-07-28
Author: Claude (Project Architect)

## Overview

**Goal**: Update `src/lib/content-db-direct.ts` to use environment variables instead of hardcoded credentials.

**Current State**:
- Read-only user created: `spicebush_readonly`
- Environment variables in `.env.local`:
  - DB_READONLY_USER=spicebush_readonly
  - DB_READONLY_PASSWORD=6afRf15M187YKF88UpWYJsn4zijsNiQMZmQVOK9Rdyw=
  - DB_READONLY_HOST=localhost
  - DB_READONLY_PORT=54322
  - DB_READONLY_DATABASE=postgres
- Backup created: `content-db-direct.ts.backup-20250728-140854`

**Risk Level**: Medium - Application database connection will be modified

## Pre-Flight Checklist

### Instruction 1.2.1: Verify Current Application Works
**Action**: Test that the current application can connect to the database
**Command**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm run dev
```
**Test**: Navigate to http://localhost:4321 in browser
**Success Criteria**: Site loads without errors
**Duration**: Keep server running for 30 seconds to ensure stability
**Stop Server**: Press Ctrl+C
**If Failed**: Do not proceed - investigate logs first

### Instruction 1.2.2: Create Test Script for Current Configuration
**Action**: Create a script to verify current database connection
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-current-db.js << 'EOF'
// Test current hardcoded database connection
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password'
});

async function testConnection() {
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM content');
    console.log('✅ Current connection works. Row count:', result.rows[0].count);
    await client.end();
  } catch (error) {
    console.error('❌ Current connection failed:', error.message);
  }
}

testConnection();
EOF
```

**Run Test**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && node test-current-db.js
```
**Expected Output**: `✅ Current connection works. Row count: 123`
**Success Criteria**: Connection succeeds with current hardcoded values

## Install Required Dependencies

### Instruction 1.2.3: Install dotenv Package
**Action**: Install dotenv to read environment variables
**Command**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm install dotenv
```
**Success Criteria**: Package installs without errors
**Verification**:
```bash
grep "dotenv" package.json
```
**Expected**: Shows dotenv in dependencies

### Instruction 1.2.4: Create Environment Variable Test
**Action**: Test that dotenv can load our variables
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-env-loading.js << 'EOF'
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

console.log('Environment Variables Loaded:');
console.log('DB_READONLY_USER:', process.env.DB_READONLY_USER);
console.log('DB_READONLY_PASSWORD:', process.env.DB_READONLY_PASSWORD ? '***HIDDEN***' : 'NOT SET');
console.log('DB_READONLY_HOST:', process.env.DB_READONLY_HOST);
console.log('DB_READONLY_PORT:', process.env.DB_READONLY_PORT);
console.log('DB_READONLY_DATABASE:', process.env.DB_READONLY_DATABASE);

// Test values
const allSet = [
  process.env.DB_READONLY_USER,
  process.env.DB_READONLY_PASSWORD,
  process.env.DB_READONLY_HOST,
  process.env.DB_READONLY_PORT,
  process.env.DB_READONLY_DATABASE
].every(val => val !== undefined);

console.log('\nAll variables set:', allSet ? '✅ YES' : '❌ NO');
EOF
```

**Run Test**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && node test-env-loading.js
```
**Expected Output**:
```
Environment Variables Loaded:
DB_READONLY_USER: spicebush_readonly
DB_READONLY_PASSWORD: ***HIDDEN***
DB_READONLY_HOST: localhost
DB_READONLY_PORT: 54322
DB_READONLY_DATABASE: postgres

All variables set: ✅ YES
```

## Update Application Code

### Instruction 1.2.5: Create Updated Version of content-db-direct.ts
**Action**: Create new version with environment variables
**IMPORTANT**: This is a critical step - double-check everything
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct-new.ts << 'EOF'
/**
 * Direct PostgreSQL connection for content queries
 * This bypasses PostgREST authentication complexity for read operations
 * 
 * Security: Uses read-only database user with environment variables
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Types to match Astro Content Collections structure
export interface ContentEntry<T = any> {
  id: string;
  slug: string;
  collection: string;
  data: T;
  body?: string;
}

// Validate environment variables
const requiredEnvVars = [
  'DB_READONLY_USER',
  'DB_READONLY_PASSWORD',
  'DB_READONLY_HOST',
  'DB_READONLY_PORT',
  'DB_READONLY_DATABASE'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Single reusable connection with read-only user
const client = new Client({
  host: process.env.DB_READONLY_HOST,
  port: parseInt(process.env.DB_READONLY_PORT || '54322'),
  database: process.env.DB_READONLY_DATABASE,
  user: process.env.DB_READONLY_USER,
  password: process.env.DB_READONLY_PASSWORD,
  // Connection pool settings for production
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
});

let connected = false;

async function ensureConnected() {
  if (!connected) {
    try {
      await client.connect();
      connected = true;
      console.log('Database connected successfully with read-only user');
    } catch (error) {
      console.error('Database connection error:', error);
      throw new Error('Unable to connect to content database');
    }
  }
}

// Get all entries from a collection
export async function getCollection(collection: string): Promise<ContentEntry[]> {
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
      [collection, 'published']
    );
    
    return result.rows.map(row => ({
      id: row.slug,
      slug: row.slug,
      collection: row.type,
      data: { ...row.data, title: row.title },
      body: row.data?.body || ''
    }));
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    return [];
  }
}

// Get a single entry by collection and slug
export async function getEntry(collection: string, slug: string): Promise<ContentEntry | null> {
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
      [collection, slug, 'published']
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.slug,
      slug: row.slug,
      collection: row.type,
      data: { ...row.data, title: row.title },
      body: row.data?.body || ''
    };
  } catch (error) {
    console.error(`Error fetching ${collection}/${slug}:`, error);
    return null;
  }
}

// Get entries by filter
export async function getEntries(collection: string, filter: (entry: ContentEntry) => boolean): Promise<ContentEntry[]> {
  const entries = await getCollection(collection);
  return entries.filter(filter);
}

// Settings helpers
export async function getSetting(key: string): Promise<any> {
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT value FROM settings WHERE key = $1 LIMIT 1',
      [key]
    );
    
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (connected) {
    await client.end();
    connected = false;
    console.log('Database connection closed gracefully');
  }
  process.exit();
});
EOF
```

### Instruction 1.2.6: Test New Implementation Independently
**Action**: Test the new file works correctly before replacing
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-new-implementation.js << 'EOF'
import { getCollection, getEntry } from './src/lib/content-db-direct-new.js';

async function testNewImplementation() {
  try {
    console.log('Testing new implementation with environment variables...\n');
    
    // Test 1: Get collection
    console.log('Test 1: Getting content collection...');
    const entries = await getCollection('blog');
    console.log(`✅ Got ${entries.length} blog entries`);
    
    // Test 2: Get specific entry
    console.log('\nTest 2: Getting specific entry...');
    const entry = await getEntry('blog', 'welcome');
    if (entry) {
      console.log('✅ Got entry:', entry.slug);
    } else {
      console.log('⚠️  No entry found (this might be okay if slug doesn\'t exist)');
    }
    
    console.log('\n✅ All tests passed! New implementation works correctly.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testNewImplementation();
EOF
```

**Run Test**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && node test-new-implementation.js
```
**Success Criteria**: Tests pass without errors
**If Failed**: Check error message - likely environment variables not loading correctly

### Instruction 1.2.7: Create Transition Backup
**Action**: Create a timestamped backup before replacing
**Command**:
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts \
   /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts.backup-${TIMESTAMP}
echo "Backup created: content-db-direct.ts.backup-${TIMESTAMP}"
```

### Instruction 1.2.8: Replace Original File
**Action**: Replace the original file with the new implementation
**Command**:
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct-new.ts \
   /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts
```
**Success Criteria**: File copied without errors

### Instruction 1.2.9: Clean Up Temporary Files
**Action**: Remove test files
**Command**:
```bash
rm -f /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/test-*.js
rm -f /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct-new.ts
```

## Verification and Testing

### Instruction 1.2.10: Test Application with New Configuration
**Action**: Start the development server with new configuration
**Command**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm run dev
```
**Test Steps**:
1. Wait for server to start (should see "Server running at http://localhost:4321")
2. Open browser to http://localhost:4321
3. Navigate to a few pages
4. Check console for any database errors
**Success Criteria**: 
- No errors in console
- Pages load correctly
- Content displays properly
**Duration**: Test for at least 2 minutes
**Stop Server**: Press Ctrl+C

### Instruction 1.2.11: Verify Security Improvement
**Action**: Confirm hardcoded credentials are removed
**Command**:
```bash
grep -n "your-super-secret-and-long-postgres-password" /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts
```
**Expected Output**: No matches found
**Success Criteria**: No hardcoded password in source code

### Instruction 1.2.12: Test Read-Only Restrictions
**Action**: Create script to verify write operations fail
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/verify-readonly.js << 'EOF'
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const client = new Client({
  host: process.env.DB_READONLY_HOST,
  port: parseInt(process.env.DB_READONLY_PORT),
  database: process.env.DB_READONLY_DATABASE,
  user: process.env.DB_READONLY_USER,
  password: process.env.DB_READONLY_PASSWORD
});

async function verifyReadOnly() {
  try {
    await client.connect();
    
    // Test 1: Can read
    const readResult = await client.query('SELECT COUNT(*) FROM content');
    console.log('✅ Read access works:', readResult.rows[0].count, 'rows');
    
    // Test 2: Cannot write
    try {
      await client.query("INSERT INTO content (title) VALUES ('test')");
      console.error('❌ SECURITY ISSUE: Write operation succeeded!');
    } catch (error) {
      if (error.message.includes('permission denied')) {
        console.log('✅ Write access blocked: permission denied (expected)');
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }
    
    await client.end();
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

verifyReadOnly();
EOF
```

**Run Verification**:
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && node verify-readonly.js
```
**Expected Output**:
```
✅ Read access works: 123 rows
✅ Write access blocked: permission denied (expected)
```
**Clean Up**:
```bash
rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/verify-readonly.js
```

## Final Checklist

### Instruction 1.2.13: Complete Implementation Checklist
**Action**: Verify all objectives achieved
**Checklist**:
- [ ] Application runs with environment variables
- [ ] No hardcoded credentials in source code
- [ ] Read-only user can only SELECT data
- [ ] Error handling works correctly
- [ ] Connection management is robust
- [ ] All test files cleaned up
- [ ] Backup files retained for safety

### Instruction 1.2.14: Create Success Journal Entry
**Action**: Document successful completion
**Command**:
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-security-phase1-2-complete.md << 'EOF'
# Security Phase 1.2: Application Code Update Complete
Date: $(date +%Y-%m-%d)
Time: $(date +%H:%M:%S)

## Summary
Successfully updated content-db-direct.ts to use environment variables instead of hardcoded credentials.

## Changes Made
1. Installed dotenv package
2. Updated database connection to use environment variables
3. Added environment variable validation
4. Improved error handling and connection management
5. Verified read-only restrictions are enforced

## Security Improvements
- ✅ No hardcoded passwords in source code
- ✅ Using dedicated read-only database user
- ✅ Credentials stored in .env.local (gitignored)
- ✅ Connection timeout and query timeout configured
- ✅ Graceful shutdown handling

## Files Modified
- src/lib/content-db-direct.ts (replaced with secure version)
- package.json (added dotenv dependency)

## Backups Created
- content-db-direct.ts.backup-20250728-140854 (Phase 1.1)
- content-db-direct.ts.backup-$(date +%Y%m%d-%H%M%S) (Phase 1.2)

## Next Steps
Phase 1.3: Production Deployment Preparation
- Configure production environment variables
- Set up secure credential management
- Document deployment procedures
EOF
```

## Emergency Rollback Procedure

If anything goes wrong:

### Quick Rollback
```bash
# 1. Find the most recent backup
ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts.backup-*

# 2. Restore from backup (use the most recent timestamp)
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts.backup-TIMESTAMP \
   /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts

# 3. Test application works
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && npm run dev
```

### Complete Rollback
```bash
# 1. Restore original file
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts.backup-20250728-140854 \
   /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/lib/content-db-direct.ts

# 2. Remove dotenv (if added)
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm uninstall dotenv

# 3. Test original configuration
npm run dev
```

## Success Indicators

When Phase 1.2 is complete:
1. Application connects using environment variables
2. No passwords visible in source code
3. Database queries work correctly
4. Read-only restrictions are enforced
5. Error messages are informative but secure

## Notes for Next Phase

Phase 1.3 will focus on:
- Production environment setup
- Secure credential storage (e.g., secrets manager)
- Deployment automation
- Monitoring and alerting