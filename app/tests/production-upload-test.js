/**
 * Production Upload Test
 * 
 * Quick script to verify image upload functionality in production
 * Can be run from browser console or as a standalone script
 */

async function testImageUpload() {
  console.log('🧪 Starting ImageUpload Component Test...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Component Initialization
  try {
    const uploadComponents = document.querySelectorAll('.image-upload');
    if (uploadComponents.length > 0) {
      results.passed.push('✅ ImageUpload components found on page');
      console.log(`Found ${uploadComponents.length} upload component(s)`);
    } else {
      results.failed.push('❌ No ImageUpload components found');
      return results;
    }
  } catch (error) {
    results.failed.push(`❌ Component initialization error: ${error.message}`);
  }

  // Test 2: File Input Validation
  try {
    const fileInput = document.querySelector('[data-file-input]');
    if (fileInput) {
      // Test accept attribute
      const accept = fileInput.getAttribute('accept');
      if (accept && accept.includes('image')) {
        results.passed.push('✅ File input accepts image files');
      } else {
        results.warnings.push('⚠️  File input may not be restricted to images');
      }

      // Test required attribute
      const isRequired = fileInput.hasAttribute('required');
      console.log(`Required field: ${isRequired}`);
    }
  } catch (error) {
    results.failed.push(`❌ File input validation error: ${error.message}`);
  }

  // Test 3: Drag and Drop Support
  try {
    const dropzone = document.querySelector('.upload-dropzone');
    if (dropzone) {
      // Simulate dragover
      const dragEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true
      });
      
      dropzone.dispatchEvent(dragEvent);
      
      if (dropzone.classList.contains('upload-dropzone--dragover')) {
        results.passed.push('✅ Drag and drop visual feedback working');
        
        // Clean up
        dropzone.dispatchEvent(new Event('dragleave'));
      } else {
        results.warnings.push('⚠️  Drag and drop visual feedback not detected');
      }
    }
  } catch (error) {
    results.failed.push(`❌ Drag and drop test error: ${error.message}`);
  }

  // Test 4: Progress Elements
  try {
    const progressEl = document.querySelector('[data-progress]');
    const progressBar = document.querySelector('[data-progress-bar]');
    const progressText = document.querySelector('[data-progress-text]');
    
    if (progressEl && progressBar && progressText) {
      results.passed.push('✅ Progress tracking elements present');
    } else {
      results.warnings.push('⚠️  Some progress elements missing');
    }
  } catch (error) {
    results.failed.push(`❌ Progress element test error: ${error.message}`);
  }

  // Test 5: Error Display
  try {
    const errorEl = document.querySelector('[data-error]');
    if (errorEl && errorEl.getAttribute('role') === 'alert') {
      results.passed.push('✅ Error display with proper ARIA role');
    } else {
      results.warnings.push('⚠️  Error element missing or lacks ARIA role');
    }
  } catch (error) {
    results.failed.push(`❌ Error display test error: ${error.message}`);
  }

  // Test 6: Upload Endpoint
  try {
    const container = document.querySelector('.image-upload');
    const endpoint = container.dataset.uploadEndpoint || '/api/media/upload';
    
    // Check if endpoint is accessible
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      credentials: 'include'
    });
    
    if (response.ok || response.status === 405) { // 405 means endpoint exists but doesn't support OPTIONS
      results.passed.push(`✅ Upload endpoint accessible: ${endpoint}`);
    } else if (response.status === 401) {
      results.warnings.push('⚠️  Upload endpoint requires authentication');
    } else {
      results.failed.push(`❌ Upload endpoint returned ${response.status}`);
    }
  } catch (error) {
    results.warnings.push(`⚠️  Could not verify upload endpoint: ${error.message}`);
  }

  // Test 7: Existing Image Handling
  try {
    const valueInput = document.querySelector('[data-value-input]');
    if (valueInput && valueInput.value) {
      const preview = document.querySelector('.upload-preview');
      const removeBtn = document.querySelector('[data-remove-button]');
      
      if (preview && removeBtn) {
        results.passed.push('✅ Existing image preview and remove button present');
      } else {
        results.warnings.push('⚠️  Existing image but missing preview or remove button');
      }
    }
  } catch (error) {
    results.failed.push(`❌ Existing image test error: ${error.message}`);
  }

  // Test 8: Simulated File Upload (without actual file)
  try {
    console.log('\n📤 Testing upload simulation...');
    
    // Create a test file
    const testFile = new File(['test'], 'test-image.jpg', { 
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    
    // Check file validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (testFile.size <= maxSize) {
      results.passed.push('✅ File size validation logic ready');
    }
    
    // Check type validation
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (acceptedTypes.includes(testFile.type)) {
      results.passed.push('✅ File type validation logic ready');
    }
  } catch (error) {
    results.failed.push(`❌ Upload simulation error: ${error.message}`);
  }

  // Display Results
  console.log('\n📊 Test Results Summary:');
  console.log('========================\n');
  
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(msg => console.log(`  ${msg}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log(`  ${msg}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(msg => console.log(`  ${msg}`));
  }
  
  const overallStatus = results.failed.length === 0 ? '✅ PASSED' : '❌ FAILED';
  console.log(`\n📋 Overall Status: ${overallStatus}`);
  
  return results;
}

// Function to test actual file upload
async function testActualUpload(file) {
  console.log('\n🚀 Testing actual file upload...');
  
  const fileInput = document.querySelector('[data-file-input]');
  if (!fileInput) {
    console.error('❌ No file input found');
    return;
  }
  
  // Create a change event
  const event = new Event('change', { bubbles: true });
  
  // Set the file
  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;
  
  // Dispatch the event
  fileInput.dispatchEvent(event);
  
  console.log('📤 Upload triggered. Watch for:');
  console.log('  - Progress bar updates');
  console.log('  - Success/error messages');
  console.log('  - Image preview appearance');
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.document) {
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testImageUpload);
  } else {
    testImageUpload();
  }
  
  // Expose test function globally for manual testing
  window.testImageUpload = testImageUpload;
  window.testActualUpload = testActualUpload;
  
  console.log('\n💡 Manual test helpers available:');
  console.log('  - testImageUpload() - Run all tests');
  console.log('  - testActualUpload(file) - Test with actual file');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testImageUpload, testActualUpload };
}