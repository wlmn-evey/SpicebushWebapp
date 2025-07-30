/**
 * End-to-End Database Operations Test
 * 
 * This script tests the database write operations in a real environment
 * Run with: npm run test:e2e or node tests/e2e-database-test.js
 */

import type { APIContext } from 'astro';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4321';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
  error?: any;
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(
  endpoint: string,
  method: string = 'GET',
  data?: any
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cookie': `admin-token=${ADMIN_TOKEN}`
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include'
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  return fetch(`${BASE_URL}${endpoint}`, options);
}

// Test functions
async function testSettingsUpdate(): Promise<TestResult> {
  const testName = 'Settings Update';
  try {
    // First, get current settings
    const getResponse = await makeAuthenticatedRequest('/api/admin/settings');
    if (!getResponse.ok) {
      throw new Error(`Failed to get settings: ${getResponse.status}`);
    }
    const currentSettings = await getResponse.json();

    // Update settings
    const updates = {
      site_title: `Test Title ${Date.now()}`,
      contact_email: 'test@spicebush.com'
    };

    const updateResponse = await makeAuthenticatedRequest(
      '/api/admin/settings',
      'POST',
      updates
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update settings: ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
    
    // Verify the update
    const verifyResponse = await makeAuthenticatedRequest('/api/admin/settings');
    const newSettings = await verifyResponse.json();

    if (newSettings.site_title === updates.site_title) {
      return { name: testName, status: 'pass', message: 'Settings updated successfully' };
    } else {
      throw new Error('Settings not updated correctly');
    }
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

async function testNewsletterSubscription(): Promise<TestResult> {
  const testName = 'Newsletter Subscription';
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Subscribe
    const subscribeResponse = await fetch(`${BASE_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        first_name: 'Test',
        last_name: 'User',
        subscription_type: 'general'
      })
    });

    if (!subscribeResponse.ok) {
      throw new Error(`Failed to subscribe: ${subscribeResponse.status}`);
    }

    const subscribeResult = await subscribeResponse.json();
    
    // Verify subscription through admin API
    const verifyResponse = await makeAuthenticatedRequest(
      `/api/admin/newsletter?status=active`
    );
    const subscribers = await verifyResponse.json();
    
    const found = subscribers.some((sub: any) => sub.email === testEmail);
    
    if (found) {
      // Test unsubscribe
      const unsubscribeResponse = await makeAuthenticatedRequest(
        '/api/admin/newsletter',
        'POST',
        { action: 'unsubscribe', email: testEmail }
      );
      
      if (unsubscribeResponse.ok) {
        return { name: testName, status: 'pass', message: 'Subscribe and unsubscribe work correctly' };
      }
    }
    
    throw new Error('Subscription not found in database');
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

async function testCommunicationMessage(): Promise<TestResult> {
  const testName = 'Communication Message';
  try {
    // Create a test message
    const messageData = {
      subject: `Test Message ${Date.now()}`,
      message_content: 'This is a test message content',
      message_type: 'announcement',
      recipient_type: 'all_families'
    };

    const createResponse = await makeAuthenticatedRequest(
      '/api/admin/communications',
      'POST',
      messageData
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create message: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    
    // Verify by getting recent messages
    const verifyResponse = await makeAuthenticatedRequest(
      '/api/admin/communications?action=recent&limit=5'
    );
    const messages = await verifyResponse.json();
    
    const found = messages.some((msg: any) => msg.subject === messageData.subject);
    
    if (found) {
      return { name: testName, status: 'pass', message: 'Message created successfully' };
    } else {
      throw new Error('Message not found in recent messages');
    }
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

async function testTemplateCreation(): Promise<TestResult> {
  const testName = 'Template Creation';
  try {
    // Create a test template
    const templateData = {
      name: `Test Template ${Date.now()}`,
      description: 'Test template description',
      message_type: 'announcement',
      subject_template: 'Test Subject: {{date}}',
      content_template: 'Dear {{parent_name}},\n\nThis is a test template.'
    };

    const createResponse = await makeAuthenticatedRequest(
      '/api/admin/communications/templates',
      'POST',
      templateData
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create template: ${createResponse.status}`);
    }

    // Verify by getting templates
    const verifyResponse = await makeAuthenticatedRequest(
      '/api/admin/communications/templates'
    );
    const templates = await verifyResponse.json();
    
    const found = templates.some((tpl: any) => tpl.name === templateData.name);
    
    if (found) {
      return { name: testName, status: 'pass', message: 'Template created successfully' };
    } else {
      throw new Error('Template not found in templates list');
    }
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

async function testContentOperations(): Promise<TestResult> {
  const testName = 'Content Operations (CMS)';
  try {
    const testSlug = `test-page-${Date.now()}`;
    
    // Create content
    const createData = {
      type: 'pages',
      slug: testSlug,
      title: 'Test Page',
      data: {
        body: 'This is a test page content',
        meta_description: 'Test page description'
      },
      status: 'draft'
    };

    const createResponse = await makeAuthenticatedRequest(
      '/api/cms/entry',
      'POST',
      createData
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create content: ${createResponse.status}`);
    }

    // Update content
    const updateData = {
      ...createData,
      title: 'Updated Test Page',
      data: {
        ...createData.data,
        body: 'Updated test page content'
      }
    };

    const updateResponse = await makeAuthenticatedRequest(
      '/api/cms/entry',
      'PUT',
      updateData
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update content: ${updateResponse.status}`);
    }

    // Get content to verify
    const getResponse = await makeAuthenticatedRequest(
      `/api/cms/entry?collection=pages&slug=${testSlug}`
    );
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get content: ${getResponse.status}`);
    }

    const content = await getResponse.json();
    
    if (content && content.title === 'Updated Test Page') {
      // Delete content
      const deleteResponse = await makeAuthenticatedRequest(
        `/api/cms/entry?collection=pages&slug=${testSlug}`,
        'DELETE'
      );
      
      if (deleteResponse.ok) {
        return { name: testName, status: 'pass', message: 'Content CRUD operations work correctly' };
      }
    }
    
    throw new Error('Content operations failed');
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

async function testReadOnlyFunctions(): Promise<TestResult> {
  const testName = 'Read-Only Functions';
  try {
    // Import content-db-direct to test read functions
    const contentDb = await import('../src/lib/content-db-direct');
    
    // Test various read functions
    const tests = [
      async () => await contentDb.getAllSettings(),
      async () => await contentDb.getRecentMessages(5),
      async () => await contentDb.getCommunicationStats(),
      async () => await contentDb.getTemplates(),
      async () => await contentDb.getNewsletterStats()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        throw new Error(`Read function failed: ${error}`);
      }
    }
    
    // Verify write functions don't exist
    const writeFunctions = [
      'updateSetting',
      'saveMessage',
      'saveTemplate',
      'subscribeToNewsletter',
      'unsubscribeFromNewsletter'
    ];
    
    for (const funcName of writeFunctions) {
      if (funcName in contentDb) {
        throw new Error(`Write function ${funcName} should not exist`);
      }
    }
    
    return { name: testName, status: 'pass', message: 'Read-only functions work correctly' };
  } catch (error) {
    return { name: testName, status: 'fail', error };
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Running End-to-End Database Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const tests = [
    testSettingsUpdate,
    testNewsletterSubscription,
    testCommunicationMessage,
    testTemplateCreation,
    testContentOperations,
    testReadOnlyFunctions
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    process.stdout.write(`Running ${test.name}... `);
    const result = await test();
    results.push(result);
    
    if (result.status === 'pass') {
      console.log(`✅ ${result.message || 'Passed'}`);
    } else {
      console.log(`❌ Failed`);
      if (result.error) {
        console.error(`  Error: ${result.error.message || result.error}`);
      }
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error?.message || 'Unknown error'}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runTests, TestResult };