#!/usr/bin/env node

/**
 * Test media upload functionality
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // Create a test image file
    const testImagePath = './public/images/optimized/homepage/homepage-spicebush-logo-brand-identity-800x800.webp';
    
    if (!fs.existsSync(testImagePath)) {
      console.error('Test image not found:', testImagePath);
      return;
    }
    
    // Create form data
    const form = new FormData();
    const fileStream = fs.createReadStream(testImagePath);
    form.append('file', fileStream, 'test-logo.webp');
    
    // Upload file
    console.log('📤 Uploading test file...');
    const response = await fetch('http://localhost:4321/api/media/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': 'sbms-admin-auth=bypass'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('📍 URL:', result.url);
      
      // Test accessing the uploaded file
      const checkResponse = await fetch(`http://localhost:4321${result.url}`);
      if (checkResponse.ok) {
        console.log('✅ File accessible at URL');
      } else {
        console.log('❌ File not accessible at URL');
      }
    } else {
      console.error('❌ Upload failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error testing upload:', error);
  }
}

testUpload();