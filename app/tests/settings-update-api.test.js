// Test script for settings update API endpoint
// Run with: node tests/settings-update-api.test.js

import { config } from 'dotenv';
config();

const API_BASE = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Test data
const testSettings = {
  single: {
    key: 'test_setting',
    value: 'test_value_' + Date.now()
  },
  bulk: {
    settings: [
      { key: 'bulk_test_1', value: 'value1' },
      { key: 'bulk_test_2', value: 'value2' },
      { key: 'bulk_test_3', value: { nested: true, data: 'complex' } }
    ]
  }
};

// Helper to get auth token (you'll need to implement based on your auth flow)
async function getAuthToken() {
  // For testing, you might need to:
  // 1. Use a test admin account
  // 2. Get a session token from cookies after logging in
  // 3. Or use a development bypass if available
  
  // This is a placeholder - implement based on your auth system
  console.warn('Note: Authentication token needed for these tests to work');
  return 'your-auth-token-here';
}

// Test single setting update (PUT)
async function testSingleUpdate() {
  console.log('\n=== Testing Single Setting Update (PUT) ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sbms-session=${await getAuthToken()}`
      },
      body: JSON.stringify({
        key: testSettings.single.key,
        value: testSettings.single.value
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (response.ok && result.success) {
      console.log('✅ Single setting update successful');
    } else {
      console.error('❌ Single setting update failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test bulk update (PATCH)
async function testBulkUpdate() {
  console.log('\n=== Testing Bulk Settings Update (PATCH) ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sbms-session=${await getAuthToken()}`
      },
      body: JSON.stringify(testSettings.bulk)
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (response.ok || response.status === 207) {
      console.log('✅ Bulk update completed');
      
      // Check individual results
      if (result.results) {
        result.results.forEach(r => {
          if (r.success) {
            console.log(`  ✅ ${r.key}: Updated successfully`);
          } else {
            console.log(`  ❌ ${r.key}: Failed - ${r.error}`);
          }
        });
      }
    } else {
      console.error('❌ Bulk update failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test delete (DELETE)
async function testDelete() {
  console.log('\n=== Testing Setting Delete (DELETE) ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/update?key=${testSettings.single.key}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `sbms-session=${await getAuthToken()}`
      }
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (response.ok && result.success) {
      console.log('✅ Setting deletion successful');
    } else {
      console.error('❌ Setting deletion failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n=== Testing Error Cases ===');
  
  // Test without authentication
  console.log('\n1. Testing without authentication:');
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'unauthorized_test',
        value: 'should_fail'
      })
    });
    
    const result = await response.json();
    if (response.status === 401) {
      console.log('✅ Correctly rejected unauthorized request');
    } else {
      console.error('❌ Should have returned 401 Unauthorized');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Test invalid key format
  console.log('\n2. Testing invalid key format:');
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sbms-session=${await getAuthToken()}`
      },
      body: JSON.stringify({
        key: 'invalid-key-format!',
        value: 'test'
      })
    });
    
    const result = await response.json();
    if (response.status === 400) {
      console.log('✅ Correctly rejected invalid key format');
    } else {
      console.error('❌ Should have returned 400 Bad Request');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Settings Update API Tests...\n');
  console.log('API Base:', API_BASE);
  
  await testSingleUpdate();
  await testBulkUpdate();
  await testDelete();
  await testErrorCases();
  
  console.log('\n=== Tests Complete ===');
}

// Run tests
runAllTests().catch(console.error);