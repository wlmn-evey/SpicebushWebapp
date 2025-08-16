#!/usr/bin/env node

/**
 * Complete Unione.io Integration Validation Script
 * 
 * This script performs comprehensive validation of the Unione.io email service:
 * 1. Validates API key
 * 2. Checks account status
 * 3. Verifies domain configuration
 * 4. Tests email sending capability
 * 5. Validates authentication method (header vs body)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log(`═══ ${title} ═══`, 'bright');
  console.log();
}

async function validateApiKey(apiKey, baseUrl) {
  logSection('API Key Validation');
  
  // Test with header authentication (preferred)
  log('Testing header authentication (X-API-KEY)...', 'cyan');
  try {
    const headerResponse = await fetch(`${baseUrl}/account/info.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({})
    });
    
    const headerData = await headerResponse.json();
    
    if (headerData.status === 'success') {
      log('✅ Header authentication successful', 'green');
      log(`   Account: ${headerData.account_email}`, 'green');
      log(`   Status: ${headerData.account_status}`, 'green');
      return { success: true, method: 'header', data: headerData };
    }
  } catch (error) {
    log(`❌ Header authentication failed: ${error.message}`, 'red');
  }
  
  // Test with body authentication (fallback)
  log('Testing body authentication (api_key in body)...', 'cyan');
  try {
    const bodyResponse = await fetch(`${baseUrl}/account/info.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ api_key: apiKey })
    });
    
    const bodyData = await bodyResponse.json();
    
    if (bodyData.status === 'success') {
      log('✅ Body authentication successful', 'green');
      log(`   Account: ${bodyData.account_email}`, 'green');
      log(`   Status: ${bodyData.account_status}`, 'green');
      return { success: true, method: 'body', data: bodyData };
    }
  } catch (error) {
    log(`❌ Body authentication failed: ${error.message}`, 'red');
  }
  
  return { success: false };
}

async function checkDomains(apiKey, baseUrl, authMethod) {
  logSection('Domain Verification');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const body = {};
  
  if (authMethod === 'header') {
    headers['X-API-KEY'] = apiKey;
  } else {
    body.api_key = apiKey;
  }
  
  try {
    const response = await fetch(`${baseUrl}/domain/list.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.status === 'success' && data.domains) {
      log('Registered domains:', 'cyan');
      
      let hasSpicebush = false;
      data.domains.forEach(domain => {
        const status = domain.verification_status === 'verified' ? '✅' : '⚠️';
        log(`   ${status} ${domain.domain}`, domain.verification_status === 'verified' ? 'green' : 'yellow');
        
        if (domain.domain.includes('spicebushmontessori')) {
          hasSpicebush = true;
          if (domain.verification_status === 'verified') {
            log('   └─ Spicebush domain is verified!', 'green');
          } else {
            log('   └─ Spicebush domain needs verification', 'yellow');
          }
        }
      });
      
      if (!hasSpicebush) {
        log('\n⚠️  No spicebushmontessori.org domain found', 'yellow');
        log('   Add the domain in Unione.io dashboard', 'yellow');
      }
      
      return { success: true, domains: data.domains, hasSpicebush };
    }
  } catch (error) {
    log(`❌ Failed to check domains: ${error.message}`, 'red');
  }
  
  return { success: false };
}

async function sendTestEmail(apiKey, baseUrl, authMethod) {
  logSection('Email Sending Test');
  
  const testEmail = process.env.TEST_EMAIL || 'information@spicebushmontessori.org';
  
  log(`Sending test email to: ${testEmail}`, 'cyan');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const payload = {
    message: {
      from_email: 'noreply@spicebushmontessori.org',
      from_name: 'Spicebush Montessori School',
      subject: `Unione.io Integration Test - ${new Date().toLocaleString()}`,
      body: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5530;">Unione.io Integration Validated</h2>
            
            <p>This test email confirms that the Unione.io email service is properly configured.</p>
            
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Authentication Method:</strong> ${authMethod === 'header' ? 'X-API-KEY Header (Recommended)' : 'API Key in Body'}</li>
              <li><strong>API Region:</strong> ${process.env.UNIONE_REGION || 'us'}</li>
              <li><strong>From Domain:</strong> spicebushmontessori.org</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is an automated test from the validation script.
            </p>
          </div>
        `,
        plaintext: `Unione.io Integration Validated

This test email confirms that the Unione.io email service is properly configured.

Configuration Details:
- Authentication Method: ${authMethod === 'header' ? 'X-API-KEY Header (Recommended)' : 'API Key in Body'}
- API Region: ${process.env.UNIONE_REGION || 'us'}
- From Domain: spicebushmontessori.org
- Timestamp: ${new Date().toISOString()}

This is an automated test from the validation script.`
      },
      recipients: [
        {
          email: testEmail,
          substitutions: {}
        }
      ]
    }
  };
  
  if (authMethod === 'header') {
    headers['X-API-KEY'] = apiKey;
  } else {
    payload.api_key = apiKey;
  }
  
  try {
    const response = await fetch(`${baseUrl}/email/send.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      log('✅ Test email sent successfully!', 'green');
      log(`   Job ID: ${data.job_id}`, 'green');
      log(`   Check inbox at: ${testEmail}`, 'cyan');
      return { success: true, jobId: data.job_id };
    } else {
      log(`❌ Failed to send email: ${data.message || 'Unknown error'}`, 'red');
      return { success: false, error: data.message };
    }
  } catch (error) {
    log(`❌ Error sending email: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('═══════════════════════════════════════════════', 'bright');
  log('     Unione.io Integration Validation Suite     ', 'bright');
  log('═══════════════════════════════════════════════', 'bright');
  
  // Check environment
  const apiKey = process.env.UNIONE_API_KEY;
  const region = process.env.UNIONE_REGION || 'us';
  
  if (!apiKey) {
    log('\n❌ UNIONE_API_KEY not found in environment', 'red');
    log('   Set it in .env.local file', 'yellow');
    process.exit(1);
  }
  
  const baseUrl = region === 'us' 
    ? 'https://us1.unione.io/en/transactional/api/v1'
    : 'https://eu1.unione.io/en/transactional/api/v1';
  
  log(`\nConfiguration:`, 'cyan');
  log(`   Region: ${region}`, 'cyan');
  log(`   Base URL: ${baseUrl}`, 'cyan');
  log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`, 'cyan');
  
  // Validate API key
  const authResult = await validateApiKey(apiKey, baseUrl);
  if (!authResult.success) {
    log('\n❌ API key validation failed', 'red');
    log('   Please check your API key is correct', 'yellow');
    process.exit(1);
  }
  
  // Check domains
  const domainResult = await checkDomains(apiKey, baseUrl, authResult.method);
  
  // Send test email
  const emailResult = await sendTestEmail(apiKey, baseUrl, authResult.method);
  
  // Summary
  logSection('Validation Summary');
  
  const checks = [
    { name: 'API Key Valid', passed: authResult.success },
    { name: 'Authentication Method', passed: authResult.method === 'header', note: authResult.method === 'header' ? 'Using recommended header auth' : 'Using body auth (consider switching to header)' },
    { name: 'Domains Configured', passed: domainResult.success },
    { name: 'Spicebush Domain', passed: domainResult.hasSpicebush },
    { name: 'Test Email Sent', passed: emailResult.success }
  ];
  
  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`${icon} ${check.name}`, color);
    if (check.note) {
      log(`   └─ ${check.note}`, 'yellow');
    }
  });
  
  const allPassed = checks.every(c => c.passed);
  
  console.log();
  if (allPassed) {
    log('═══════════════════════════════════════════════', 'green');
    log('    ✅ All validation checks passed!            ', 'green');
    log('    Email service is ready for production       ', 'green');
    log('═══════════════════════════════════════════════', 'green');
  } else {
    log('═══════════════════════════════════════════════', 'yellow');
    log('    ⚠️  Some checks failed                      ', 'yellow');
    log('    Review the issues above                     ', 'yellow');
    log('═══════════════════════════════════════════════', 'yellow');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run validation
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});