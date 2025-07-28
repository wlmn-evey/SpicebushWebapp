#!/usr/bin/env node

// PostgREST API connection test
import fetch from 'node-fetch';

const POSTGREST_URL = 'http://localhost:54321/rest/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function testPostgREST() {
  console.log('🔍 Testing PostgREST API Connection...\n');
  
  let allTestsPassed = true;

  // Test 1: Basic API Health Check
  try {
    console.log('📋 Test 1: PostgREST API Health Check');
    const response = await fetch(POSTGREST_URL + '/', {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ PostgREST API is accessible\n');
    } else {
      throw new Error(`API returned status ${response.status}`);
    }
  } catch (error) {
    console.log('❌ PostgREST API health check failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 2: List Available Tables
  try {
    console.log('📋 Test 2: List Available Tables via API');
    const response = await fetch(POSTGREST_URL + '/', {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.text();
      // PostgREST returns OpenAPI spec, check if it contains expected content
      if (data.includes('swagger') || data.includes('openapi')) {
        console.log('✅ API metadata accessible\n');
      } else {
        console.log('⚠️  Unexpected API response format\n');
      }
    } else {
      throw new Error(`API returned status ${response.status}`);
    }
  } catch (error) {
    console.log('❌ API metadata check failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 3: Query Content Table
  try {
    console.log('📋 Test 3: Query Content Table via PostgREST');
    const response = await fetch(POSTGREST_URL + '/content?limit=1', {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log(`   Records returned: ${Array.isArray(data) ? data.length : 0}`);
      console.log('✅ Content table query successful\n');
    } else if (response.status === 404) {
      console.log('⚠️  Content table not accessible via API (may need permissions)\n');
    } else {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }
  } catch (error) {
    console.log('❌ Content table query failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Test 4: Check Current Role
  try {
    console.log('📋 Test 4: Check JWT Role Claims');
    const parts = ANON_KEY.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log(`   JWT Role: ${payload.role}`);
    console.log(`   JWT Issuer: ${payload.iss}`);
    console.log('✅ JWT parsing successful\n');
  } catch (error) {
    console.log('❌ JWT parsing failed:', error.message, '\n');
    allTestsPassed = false;
  }

  // Summary
  console.log('========================================');
  if (allTestsPassed) {
    console.log('✅ PostgREST connection tests completed!');
    console.log('ℹ️  Note: Some API endpoints may be restricted based on current permissions');
  } else {
    console.log('⚠️  Some PostgREST tests had issues');
    console.log('ℹ️  This is expected if permissions haven\'t been configured yet');
  }
}

// Run the tests
testPostgREST().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});