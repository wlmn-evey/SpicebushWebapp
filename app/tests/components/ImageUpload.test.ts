/**
 * ImageUpload Component Tests
 * 
 * Comprehensive test suite for the ImageUpload component covering:
 * - File upload functionality
 * - Progress tracking
 * - Client-side validation
 * - Error handling
 * - Drag and drop
 * - UI interactions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock XMLHttpRequest for upload tests
class MockXMLHttpRequest {
  upload = {
    addEventListener: vi.fn()
  };
  addEventListener = vi.fn();
  open = vi.fn();
  send = vi.fn();
  withCredentials = false;
  status = 200;
  responseText = '{"url": "/uploads/test-image.jpg"}';
  readyState = 4;

  // Helper to trigger events
  triggerEvent(eventName: string, data?: any) {
    const handlers = this.addEventListener.mock.calls.filter(call => call[0] === eventName);
    handlers.forEach(([_, handler]) => handler(data));
  }

  // Helper to trigger upload progress
  triggerProgress(loaded: number, total: number) {
    const handlers = this.upload.addEventListener.mock.calls.filter(call => call[0] === 'progress');
    handlers.forEach(([_, handler]) => handler({ lengthComputable: true, loaded, total }));
  }
}

describe('ImageUpload Component', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let fileInput: HTMLInputElement;
  let valueInput: HTMLInputElement;
  let dropzone: HTMLElement;
  let progressEl: HTMLElement;
  let errorEl: HTMLElement;
  let originalXMLHttpRequest: typeof XMLHttpRequest;

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="image-upload" data-upload-endpoint="/api/media/upload">
            <input type="hidden" name="image" value="" data-value-input />
            <div class="upload-dropzone" data-disabled="false">
              <input type="file" id="upload-image" accept="image/*" class="upload-input" data-file-input />
              <label for="upload-image" class="upload-label">
                <div class="upload-empty">
                  <span class="text-sm text-gray-600">
                    Drop image here or <span class="text-blue-600">browse</span>
                  </span>
                  <span class="text-xs text-gray-500 mt-1">Max size: 10MB</span>
                </div>
              </label>
              <div class="upload-progress" data-progress>
                <div class="upload-progress-bar" data-progress-bar></div>
                <span class="upload-progress-text" data-progress-text>Uploading...</span>
              </div>
              <div class="upload-error" data-error role="alert"></div>
            </div>
          </div>
        </body>
      </html>
    `);

    global.document = dom.window.document as any;
    global.window = dom.window as any;
    global.Image = dom.window.Image as any;
    global.URL = dom.window.URL as any;
    global.Event = dom.window.Event as any;
    global.FormData = dom.window.FormData as any;

    // Store original XMLHttpRequest and replace with mock
    originalXMLHttpRequest = global.XMLHttpRequest as any;
    global.XMLHttpRequest = MockXMLHttpRequest as any;

    // Get elements
    container = document.querySelector('.image-upload')!;
    fileInput = document.querySelector('[data-file-input]')!;
    valueInput = document.querySelector('[data-value-input]')!;
    dropzone = document.querySelector('.upload-dropzone')!;
    progressEl = document.querySelector('[data-progress]')!;
    errorEl = document.querySelector('[data-error]')!;

    // Initialize the component script
    const script = `
      ${getImageUploaderScript()}
      document.querySelectorAll('.image-upload').forEach(container => {
        new ImageUploader(container);
      });
    `;
    const scriptEl = document.createElement('script');
    scriptEl.textContent = script;
    document.body.appendChild(scriptEl);
  });

  afterEach(() => {
    // Restore XMLHttpRequest
    global.XMLHttpRequest = originalXMLHttpRequest;
    vi.clearAllMocks();
  });

  describe('File Selection', () => {
    it('should handle file selection through file input', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Create a mock FileList
      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      // Trigger file selection
      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show progress
      expect(progressEl.classList.contains('upload-progress--visible')).toBe(true);
    });

    it('should validate file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const fileList = {
        0: invalidFile,
        length: 1,
        item: (index: number) => index === 0 ? invalidFile : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(errorEl.textContent).toContain('Please select a valid image file');
      expect(errorEl.classList.contains('upload-error--visible')).toBe(true);
    });

    it('should validate file size', async () => {
      // Create a large file (11MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const fileList = {
        0: largeFile,
        length: 1,
        item: (index: number) => index === 0 ? largeFile : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error
      expect(errorEl.textContent).toContain('File is too large');
      expect(errorEl.textContent).toContain('10MB');
    });
  });

  describe('Drag and Drop', () => {
    it('should handle dragover event', () => {
      const dragEvent = new Event('dragover');
      dragEvent.preventDefault = vi.fn();
      
      dropzone.dispatchEvent(dragEvent);

      expect(dragEvent.preventDefault).toHaveBeenCalled();
      expect(dropzone.classList.contains('upload-dropzone--dragover')).toBe(true);
    });

    it('should handle dragleave event', () => {
      dropzone.classList.add('upload-dropzone--dragover');
      
      dropzone.dispatchEvent(new Event('dragleave'));

      expect(dropzone.classList.contains('upload-dropzone--dragover')).toBe(false);
    });

    it('should handle drop event with valid file', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const dropEvent = new Event('drop') as any;
      dropEvent.preventDefault = vi.fn();
      dropEvent.dataTransfer = {
        files: {
          0: file,
          length: 1,
          item: (index: number) => index === 0 ? file : null
        }
      };

      dropzone.dispatchEvent(dropEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(progressEl.classList.contains('upload-progress--visible')).toBe(true);
    });

    it('should not allow drop when disabled', () => {
      dropzone.dataset.disabled = 'true';
      
      const dropEvent = new Event('drop') as any;
      dropEvent.preventDefault = vi.fn();
      dropEvent.dataTransfer = {
        files: {
          0: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          length: 1
        }
      };

      dropzone.dispatchEvent(dropEvent);

      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(progressEl.classList.contains('upload-progress--visible')).toBe(false);
    });
  });

  describe('Upload Progress', () => {
    it('should track upload progress', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      // Trigger file upload
      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate progress events
      xhr.triggerProgress(50, 100);
      
      const progressBar = document.querySelector('[data-progress-bar]') as HTMLElement;
      const progressText = document.querySelector('[data-progress-text]') as HTMLElement;

      expect(progressBar.style.width).toBe('50%');
      expect(progressText.textContent).toBe('Uploading... 50%');

      // Complete upload
      xhr.triggerProgress(100, 100);

      expect(progressBar.style.width).toBe('100%');
      expect(progressText.textContent).toBe('Uploading... 100%');
    });

    it('should handle successful upload', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger successful response
      xhr.status = 200;
      xhr.responseText = '{"url": "/uploads/test-image.jpg"}';
      xhr.triggerEvent('load');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check value was updated
      expect(valueInput.value).toBe('/uploads/test-image.jpg');

      // Check preview is showing
      const preview = document.querySelector('.upload-preview');
      expect(preview).toBeTruthy();

      // Check remove button was added
      const removeBtn = document.querySelector('[data-remove-button]');
      expect(removeBtn).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 error (invalid file)', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger error response
      xhr.status = 400;
      xhr.responseText = '';
      xhr.triggerEvent('load');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('Invalid file format');
      expect(errorEl.classList.contains('upload-error--visible')).toBe(true);
    });

    it('should handle 401 error (unauthorized)', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      xhr.status = 401;
      xhr.triggerEvent('load');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('need to be logged in');
    });

    it('should handle 413 error (file too large)', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      xhr.status = 413;
      xhr.triggerEvent('load');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('File is too large');
    });

    it('should handle network error', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      xhr.triggerEvent('error');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('Network error');
    });

    it('should handle custom error message from server', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      xhr.status = 500;
      xhr.responseText = '{"error": "Custom server error message"}';
      xhr.triggerEvent('load');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toBe('Custom server error message');
    });
  });

  describe('Image Preview and Removal', () => {
    it('should show remove button when image exists', async () => {
      // Set initial value
      valueInput.value = '/uploads/existing-image.jpg';
      
      // Re-initialize component with existing value
      container.innerHTML = `
        <input type="hidden" name="image" value="/uploads/existing-image.jpg" data-value-input />
        <div class="upload-dropzone" data-disabled="false">
          <input type="file" id="upload-image" accept="image/*" class="upload-input" data-file-input />
          <label for="upload-image" class="upload-label">
            <div class="upload-preview">
              <img src="/uploads/existing-image.jpg" alt="Current image" class="upload-preview-image" />
            </div>
          </label>
          <div class="upload-progress" data-progress>
            <div class="upload-progress-bar" data-progress-bar></div>
            <span class="upload-progress-text" data-progress-text>Uploading...</span>
          </div>
          <div class="upload-error" data-error role="alert"></div>
        </div>
        <button type="button" class="upload-remove" data-remove-button>Remove image</button>
      `;

      const script = `
        ${getImageUploaderScript()}
        new ImageUploader(document.querySelector('.image-upload'));
      `;
      const scriptEl = document.createElement('script');
      scriptEl.textContent = script;
      document.body.appendChild(scriptEl);

      await new Promise(resolve => setTimeout(resolve, 100));

      const removeBtn = container.querySelector('[data-remove-button]');
      expect(removeBtn).toBeTruthy();
    });

    it('should remove image when remove button clicked', async () => {
      // Setup with existing image
      valueInput.value = '/uploads/existing-image.jpg';
      container.innerHTML = `
        <input type="hidden" name="image" value="/uploads/existing-image.jpg" data-value-input />
        <div class="upload-dropzone" data-disabled="false">
          <input type="file" id="upload-image" accept="image/*" class="upload-input" data-file-input />
          <label for="upload-image" class="upload-label">
            <div class="upload-preview">
              <img src="/uploads/existing-image.jpg" alt="Current image" class="upload-preview-image" />
            </div>
          </label>
          <div class="upload-progress" data-progress>
            <div class="upload-progress-bar" data-progress-bar></div>
            <span class="upload-progress-text" data-progress-text>Uploading...</span>
          </div>
          <div class="upload-error" data-error role="alert"></div>
        </div>
        <button type="button" class="upload-remove" data-remove-button>Remove image</button>
      `;

      const script = `
        ${getImageUploaderScript()}
        new ImageUploader(document.querySelector('.image-upload'));
      `;
      const scriptEl = document.createElement('script');
      scriptEl.textContent = script;
      document.body.appendChild(scriptEl);

      await new Promise(resolve => setTimeout(resolve, 100));

      const removeBtn = container.querySelector('[data-remove-button]') as HTMLButtonElement;
      removeBtn.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check value was cleared
      expect(valueInput.value).toBe('');

      // Check preview was removed
      const preview = container.querySelector('.upload-preview');
      expect(preview).toBeFalsy();

      // Check empty state is shown
      const emptyState = container.querySelector('.upload-empty');
      expect(emptyState).toBeTruthy();

      // Check remove button was removed
      const removeBtnAfter = container.querySelector('[data-remove-button]');
      expect(removeBtnAfter).toBeFalsy();
    });
  });

  describe('Image Dimension Validation', () => {
    it('should reject images that are too small', async () => {
      const file = new File(['test'], 'small.jpg', { type: 'image/jpeg' });
      
      // Mock Image to simulate small dimensions
      const mockImage = {
        width: 100,
        height: 100,
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 10);
        return mockImage as any;
      });

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('Image is too small');
      expect(errorEl.textContent).toContain('200x200');
    });

    it('should reject images that are too large', async () => {
      const file = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
      
      // Mock Image to simulate large dimensions
      const mockImage = {
        width: 5000,
        height: 5000,
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 10);
        return mockImage as any;
      });

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEl.textContent).toContain('Image is too large');
      expect(errorEl.textContent).toContain('4000x4000');
    });

    it('should accept images with valid dimensions', async () => {
      const file = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });
      const xhr = new MockXMLHttpRequest();
      
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => xhr as any);

      // Mock Image to simulate valid dimensions
      const mockImage = {
        width: 800,
        height: 600,
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 10);
        return mockImage as any;
      });

      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null
      };

      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should proceed with upload
      expect(xhr.open).toHaveBeenCalledWith('POST', '/api/media/upload');
      expect(xhr.send).toHaveBeenCalled();
    });
  });
});

// Helper function to get the ImageUploader script content
function getImageUploaderScript(): string {
  return `
    class ImageUploader {
      constructor(container) {
        this.container = container;
        this.endpoint = container.dataset.uploadEndpoint;
        this.dropzone = container.querySelector('.upload-dropzone');
        this.fileInput = container.querySelector('[data-file-input]');
        this.valueInput = container.querySelector('[data-value-input]');
        this.progressEl = container.querySelector('[data-progress]');
        this.progressBar = container.querySelector('[data-progress-bar]');
        this.progressText = container.querySelector('[data-progress-text]');
        this.errorEl = container.querySelector('[data-error]');
        this.removeBtn = container.querySelector('[data-remove-button]');
        
        this.init();
      }
      
      init() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
          const files = e.target.files;
          if (files.length > 0) {
            this.handleFiles(files);
          }
        });
        
        // Drag and drop
        this.dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (this.dropzone.dataset.disabled !== 'true') {
            this.dropzone.classList.add('upload-dropzone--dragover');
          }
        });
        
        this.dropzone.addEventListener('dragleave', () => {
          this.dropzone.classList.remove('upload-dropzone--dragover');
        });
        
        this.dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          this.dropzone.classList.remove('upload-dropzone--dragover');
          
          if (this.dropzone.dataset.disabled !== 'true') {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              this.handleFiles(files);
            }
          }
        });
        
        // Remove button
        if (this.removeBtn) {
          this.removeBtn.addEventListener('click', () => {
            this.removeImage();
          });
        }
      }
      
      handleFiles(files) {
        const file = files[0]; // For now, handle single file
        
        // Enhanced client-side validation
        const maxSize = parseInt(this.fileInput.closest('.image-upload').dataset.maxSize) || 10485760;
        const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        
        // Check file type
        if (!acceptedTypes.includes(file.type.toLowerCase())) {
          this.showError('Please select a valid image file (JPG, PNG, WebP, or GIF)');
          return;
        }
        
        // Check file size
        if (file.size > maxSize) {
          const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
          this.showError(\`File is too large. Please select an image under \${sizeMB}MB\`);
          return;
        }
        
        // Optional: Check dimensions (requires reading the file)
        this.validateImageDimensions(file).then(isValid => {
          if (isValid) {
            this.uploadFile(file);
          }
        });
      }
      
      async validateImageDimensions(file) {
        return new Promise((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          
          img.onload = () => {
            URL.revokeObjectURL(url);
            
            // Optional dimension checks (adjust as needed)
            const minWidth = 200;
            const minHeight = 200;
            const maxWidth = 4000;
            const maxHeight = 4000;
            
            if (img.width < minWidth || img.height < minHeight) {
              this.showError(\`Image is too small. Minimum size is \${minWidth}x\${minHeight} pixels\`);
              resolve(false);
            } else if (img.width > maxWidth || img.height > maxHeight) {
              this.showError(\`Image is too large. Maximum size is \${maxWidth}x\${maxHeight} pixels\`);
              resolve(false);
            } else {
              resolve(true);
            }
          };
          
          img.onerror = () => {
            URL.revokeObjectURL(url);
            this.showError('Could not read image file. Please try a different image.');
            resolve(false);
          };
          
          img.src = url;
        });
      }
      
      uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        this.showProgress(0);
        
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            this.updateProgress(percentComplete);
          }
        });
        
        // Success handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              this.updateValue(data.url);
              this.hideProgress();
            } catch (error) {
              this.showError('Server returned an invalid response. Please try again.');
              this.hideProgress();
            }
          } else {
            // Map error codes to user-friendly messages
            this.handleUploadError(xhr.status, xhr.responseText);
            this.hideProgress();
          }
        });
        
        // Error handler
        xhr.addEventListener('error', () => {
          this.showError('Network error. Please check your connection and try again.');
          this.hideProgress();
        });
        
        // Abort handler
        xhr.addEventListener('abort', () => {
          this.showError('Upload cancelled.');
          this.hideProgress();
        });
        
        // Send request
        xhr.open('POST', this.endpoint);
        xhr.withCredentials = true; // Include cookies
        xhr.send(formData);
        
        // Store xhr for potential cancellation
        this.currentUpload = xhr;
      }
      
      handleUploadError(status, responseText) {
        let message = 'Upload failed. Please try again.';
        
        // Try to parse error message from response
        try {
          const data = JSON.parse(responseText);
          if (data.error) {
            message = data.error;
          }
        } catch (e) {
          // Use status code-based messages
          switch (status) {
            case 400:
              message = 'Invalid file format or corrupted file. Please try a different image.';
              break;
            case 401:
              message = 'You need to be logged in to upload images.';
              break;
            case 413:
              message = 'File is too large. Please select a smaller image.';
              break;
            case 415:
              message = 'File type not supported. Please use JPG, PNG, WebP, or GIF.';
              break;
            case 500:
              message = 'Server error. Please try again later.';
              break;
            case 507:
              message = 'Storage full. Please contact support.';
              break;
          }
        }
        
        this.showError(message);
      }
      
      updateValue(url) {
        this.valueInput.value = url;
        
        // Update preview
        const label = this.dropzone.querySelector('.upload-label');
        label.innerHTML = \`
          <div class="upload-preview">
            <img src="\${url}" alt="Uploaded image" class="upload-preview-image" />
            <div class="upload-preview-overlay">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span class="text-sm mt-2">Click or drag to replace</span>
            </div>
          </div>
        \`;
        
        // Show remove button
        if (!this.removeBtn) {
          this.container.insertAdjacentHTML('beforeend', \`
            <button
              type="button"
              class="upload-remove"
              data-remove-button
              aria-label="Remove image"
            >
              Remove image
            </button>
          \`);
          this.removeBtn = this.container.querySelector('[data-remove-button]');
          this.removeBtn.addEventListener('click', () => this.removeImage());
        }
        
        // Dispatch change event
        this.valueInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      removeImage() {
        this.valueInput.value = '';
        
        // Reset preview
        const label = this.dropzone.querySelector('.upload-label');
        const maxSize = parseInt(this.fileInput.closest('.image-upload').dataset.maxSize) || 10485760;
        label.innerHTML = \`
          <div class="upload-empty">
            <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span class="text-sm text-gray-600">
              Drop image here or <span class="text-blue-600">browse</span>
            </span>
            <span class="text-xs text-gray-500 mt-1">
              Max size: \${(maxSize / 1024 / 1024).toFixed(0)}MB
            </span>
          </div>
        \`;
        
        // Remove button
        if (this.removeBtn) {
          this.removeBtn.remove();
          this.removeBtn = null;
        }
        
        // Reset file input
        this.fileInput.value = '';
        
        // Dispatch change event
        this.valueInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      showProgress(percent = 0) {
        this.progressEl.classList.add('upload-progress--visible');
        this.updateProgress(percent);
        this.hideError();
      }
      
      updateProgress(percent) {
        const rounded = Math.round(percent);
        this.progressBar.style.width = \`\${rounded}%\`;
        this.progressText.textContent = \`Uploading... \${rounded}%\`;
      }
      
      hideProgress() {
        this.progressEl.classList.remove('upload-progress--visible');
        // Reset progress bar
        setTimeout(() => {
          this.progressBar.style.width = '0%';
          this.progressText.textContent = 'Uploading...';
        }, 300);
      }
      
      showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.classList.add('upload-error--visible');
      }
      
      hideError() {
        this.errorEl.classList.remove('upload-error--visible');
      }
    }
  `;
}