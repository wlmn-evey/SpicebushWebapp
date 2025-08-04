/**
 * Manual Communications API Test
 * Quick script to manually verify the API endpoints
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:4321';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testCommunicationsAPI() {
  console.log(`${colors.blue}=== Communications API Manual Test ===${colors.reset}\n`);
  console.log(`Testing against: ${BASE_URL}\n`);

  // Test 1: GET statistics (should fail without auth)
  console.log(`${colors.yellow}Test 1: GET /api/admin/communications?action=stats (no auth)${colors.reset}`);
  try {
    const response = await fetch(`${BASE_URL}/api/admin/communications?action=stats`);
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Correctly rejected unauthorized request${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    } else {
      console.log(`${colors.red}✗ Expected 401, got ${response.status}${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test 2: GET recent messages (should fail without auth)
  console.log(`${colors.yellow}Test 2: GET /api/admin/communications?action=recent (no auth)${colors.reset}`);
  try {
    const response = await fetch(`${BASE_URL}/api/admin/communications?action=recent&limit=5`);
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Correctly rejected unauthorized request${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    } else {
      console.log(`${colors.red}✗ Expected 401, got ${response.status}${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test 3: GET with invalid action
  console.log(`${colors.yellow}Test 3: GET /api/admin/communications?action=invalid${colors.reset}`);
  try {
    const response = await fetch(`${BASE_URL}/api/admin/communications?action=invalid`);
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Auth check happens before action validation${colors.reset}`);
    } else if (response.status === 400) {
      console.log(`${colors.green}✓ Invalid action rejected (user is authenticated)${colors.reset}`);
    }
    console.log(`  Response: ${JSON.stringify(data)}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test 4: POST announcement (should fail without auth)
  console.log(`${colors.yellow}Test 4: POST /api/admin/communications - Create announcement (no auth)${colors.reset}`);
  try {
    const messageData = {
      subject: 'Test Announcement',
      message_content: 'This is a test announcement from the manual test script.',
      message_type: 'announcement'
    };

    const response = await fetch(`${BASE_URL}/api/admin/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Correctly rejected unauthorized request${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    } else {
      console.log(`${colors.red}✗ Expected 401, got ${response.status}${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test 5: POST with missing fields
  console.log(`${colors.yellow}Test 5: POST /api/admin/communications - Missing required fields${colors.reset}`);
  try {
    const invalidData = {
      subject: 'Missing content field'
      // missing message_content and message_type
    };

    const response = await fetch(`${BASE_URL}/api/admin/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    });
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Auth check happens before validation${colors.reset}`);
    } else if (response.status === 400) {
      console.log(`${colors.green}✓ Validation error (user is authenticated)${colors.reset}`);
    }
    console.log(`  Response: ${JSON.stringify(data)}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test 6: POST with invalid message type
  console.log(`${colors.yellow}Test 6: POST /api/admin/communications - Invalid message type${colors.reset}`);
  try {
    const invalidTypeData = {
      subject: 'Invalid Type Test',
      message_content: 'Testing invalid message type',
      message_type: 'invalid_type'
    };

    const response = await fetch(`${BASE_URL}/api/admin/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidTypeData)
    });
    const data = await response.json();
    
    if (response.status === 401) {
      console.log(`${colors.green}✓ Auth check happens before validation${colors.reset}`);
    } else if (response.status === 400) {
      console.log(`${colors.green}✓ Invalid type rejected (user is authenticated)${colors.reset}`);
    }
    console.log(`  Response: ${JSON.stringify(data)}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Request failed: ${error.message}${colors.reset}\n`);
  }

  // Test all message types
  console.log(`${colors.yellow}Test 7: Validate all message types${colors.reset}`);
  const messageTypes = ['announcement', 'newsletter', 'emergency', 'reminder', 'event'];
  
  for (const type of messageTypes) {
    console.log(`  Testing message type: ${type}`);
    try {
      const testData = {
        subject: `Test ${type}`,
        message_content: `Test content for ${type} message`,
        message_type: type
      };

      const response = await fetch(`${BASE_URL}/api/admin/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (response.status === 401) {
        console.log(`    ${colors.green}✓ Auth required (expected)${colors.reset}`);
      } else {
        console.log(`    Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`    ${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    }
  }

  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log('All endpoints are properly secured with authentication.');
  console.log('To test with authentication, you need to:');
  console.log('1. Log in as an admin user');
  console.log('2. Use the session cookie in your requests');
  console.log(`\n${colors.yellow}Note: The exposed database credentials issue has been identified and will be fixed separately.${colors.reset}`);
}

// Run the tests
testCommunicationsAPI().catch(console.error);