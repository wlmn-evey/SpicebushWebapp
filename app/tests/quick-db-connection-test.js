#!/usr/bin/env node

// Quick database connection test without test framework
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DB_CONFIG = {
  host: 'localhost',
  port: '54322',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  database: 'postgres'
};

async function runTests() {
  console.log('🔍 Running Quick Database Connection Tests...\n');
  
  let allTestsPassed = true;

  // Test 1: Basic Connection
  try {
    console.log('📋 Test 1: Basic PostgreSQL Connection');
    const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT 1 as test" -t`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    if (stdout.trim() === '1') {
      console.log('✅ Basic connection successful\n');
    } else {
      throw new Error('Unexpected output: ' + stdout);
    }
  } catch (error) {
    console.log('❌ Basic connection failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 2: Verify User and Database
  try {
    console.log('📋 Test 2: Verify Current User and Database');
    const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT current_user, current_database();" -t`;
    const { stdout } = await execAsync(command);
    
    const [user, database] = stdout.trim().split('|').map(s => s.trim());
    console.log(`   Current user: ${user}`);
    console.log(`   Current database: ${database}`);
    
    if (user === 'postgres' && database === 'postgres') {
      console.log('✅ User and database verified\n');
    } else {
      throw new Error('Unexpected user or database');
    }
  } catch (error) {
    console.log('❌ User/database verification failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 3: Check Schemas
  try {
    console.log('📋 Test 3: Check Database Schemas');
    const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth', 'public') ORDER BY schema_name;" -t`;
    const { stdout } = await execAsync(command);
    
    const schemas = stdout.split('\n').filter(line => line.trim()).map(line => line.trim());
    console.log(`   Found schemas: ${schemas.join(', ')}`);
    
    if (schemas.includes('public')) {
      console.log('✅ Required schemas present\n');
    } else {
      throw new Error('Missing required schemas');
    }
  } catch (error) {
    console.log('❌ Schema check failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 4: List Tables
  try {
    console.log('📋 Test 4: List Database Tables');
    const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name LIMIT 10;" -t`;
    const { stdout } = await execAsync(command);
    
    const tables = stdout.split('\n').filter(line => line.trim()).map(line => line.trim());
    console.log(`   Found ${tables.length} tables in public schema`);
    if (tables.length > 0) {
      console.log(`   Sample tables: ${tables.slice(0, 5).join(', ')}${tables.length > 5 ? '...' : ''}`);
    }
    console.log('✅ Table listing successful\n');
  } catch (error) {
    console.log('❌ Table listing failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 5: Database Size
  try {
    console.log('📋 Test 5: Check Database Size');
    const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT pg_size_pretty(pg_database_size('postgres'));" -t`;
    const { stdout } = await execAsync(command);
    
    console.log(`   Database size: ${stdout.trim()}`);
    console.log('✅ Database size check successful\n');
  } catch (error) {
    console.log('❌ Database size check failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Summary
  console.log('========================================');
  if (allTestsPassed) {
    console.log('✅ All database connection tests passed!');
    console.log('✅ Safe to proceed with backup (step 1.1.2)');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    console.log('❌ Please fix issues before proceeding');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});