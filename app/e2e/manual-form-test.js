#!/usr/bin/env node

/**
 * Manual test script for contact form submission
 * This simulates a real form submission to test Netlify Forms integration
 */

const https = require('https');
const querystring = require('querystring');

// Test data
const formData = {
  'form-name': 'contact-form',
  'name': 'Test User ' + new Date().toISOString(),
  'email': 'test@example.com',
  'phone': '(555) 123-4567',
  'child-age': '4',
  'subject': 'tour',
  'message': 'This is a test submission from the manual test script. Time: ' + new Date().toISOString(),
  'tour-interest': 'yes',
  'bot-field': '' // Honeypot field should be empty
};

// Convert form data to URL-encoded string
const postData = querystring.stringify(formData);

// Request options
const options = {
  hostname: 'localhost',
  port: 4321,
  path: '/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Submitting test form data...');
console.log('📋 Form data:', formData);

// Make the request
const req = https.request(options, (res) => {
  console.log(`📬 Status Code: ${res.statusCode}`);
  console.log(`📍 Location: ${res.headers.location || 'No redirect'}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
      console.log('✅ Form submitted successfully!');
      console.log('🎯 Redirected to:', res.headers.location);
      
      if (res.headers.location === '/contact-success') {
        console.log('✨ SUCCESS: Form is correctly configured to redirect to success page');
      } else {
        console.log('⚠️  WARNING: Unexpected redirect location');
      }
    } else {
      console.log('❌ Form submission did not redirect as expected');
      console.log('📄 Response preview:', data.substring(0, 200) + '...');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error submitting form:', error.message);
  console.log('\n💡 Make sure the development server is running on http://localhost:4321');
});

// Write data to request body
req.write(postData);
req.end();

console.log('\n📝 Note: This test submits to your local development server.');
console.log('For production testing, update the hostname and use appropriate HTTPS settings.');