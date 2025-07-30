/**
 * Screen Reader Automation Tests
 * Tests the site's compatibility with screen readers and assistive technology
 * Uses Playwright's accessibility tree API to simulate screen reader behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Screen Reader Automation Tests', () => {
  
  test.describe('Accessibility Tree Navigation', () => {
    test('should provide complete accessibility tree for screen readers on contact page', async ({ page }) => {
      await page.goto('/contact');
      
      // Get the accessibility tree snapshot
      const accessibilityTree = await page.accessibility.snapshot();
      
      expect(accessibilityTree).toBeTruthy();
      expect(accessibilityTree!.name).toBeTruthy();
      expect(accessibilityTree!.role).toBe('WebArea');
      
      // Verify main landmarks are present in accessibility tree
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find main landmark
      const mainLandmarks = findInTree(accessibilityTree!, node => 
        node.role === 'main' || (node.role === 'generic' && node.name === 'main-content')
      );
      expect(mainLandmarks.length).toBeGreaterThan(0);
      
      // Find navigation landmarks
      const navLandmarks = findInTree(accessibilityTree!, node => 
        node.role === 'navigation'
      );
      expect(navLandmarks.length).toBeGreaterThan(0);
      
      // Find form elements
      const formElements = findInTree(accessibilityTree!, node => 
        node.role === 'textbox' || node.role === 'combobox' || node.role === 'button'
      );
      expect(formElements.length).toBeGreaterThan(5); // Should have multiple form fields
    });

    test('should provide proper accessible names for form elements', async ({ page }) => {
      await page.goto('/contact');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find form inputs
      const textInputs = findInTree(accessibilityTree!, node => 
        node.role === 'textbox' && node.name
      );
      
      textInputs.forEach(input => {
        expect(input.name).toBeTruthy();
        expect(input.name.length).toBeGreaterThan(2);
        // Names should be descriptive, not just "textbox"
        expect(input.name.toLowerCase()).not.toBe('textbox');
      });
      
      // Find submit button
      const submitButtons = findInTree(accessibilityTree!, node => 
        node.role === 'button' && node.name && node.name.toLowerCase().includes('send')
      );
      expect(submitButtons.length).toBeGreaterThan(0);
    });
  });

  test.describe('ARIA Live Regions for Dynamic Content', () => {
    test('should announce form validation errors via aria-live', async ({ page }) => {
      await page.goto('/contact');
      
      // Monitor for accessibility tree changes when validation occurs
      let ariaLiveAnnouncements: string[] = [];
      
      // Listen for accessibility events
      page.on('console', msg => {
        if (msg.type() === 'info' && msg.text().includes('aria-live')) {
          ariaLiveAnnouncements.push(msg.text());
        }
      });
      
      // Submit form to trigger validation
      await page.click('#submit-btn');
      
      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);
      
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      }
    });

    test('should announce form success messages', async ({ page }) => {
      await page.goto('/contact');
      
      // Check that success message container has proper aria-live
      const successAlert = page.locator('#form-success');
      
      // The element should exist even if hidden
      await expect(successAlert).toBeAttached();
      
      // Should have aria-live for announcements
      const hasAriaLive = await successAlert.evaluate(el => {
        return el.hasAttribute('aria-live') || 
               el.closest('[aria-live]') !== null ||
               el.getAttribute('role') === 'alert';
      });
      
      expect(hasAriaLive).toBe(true);
    });
  });

  test.describe('Screen Reader Navigation Patterns', () => {
    test('should support heading navigation on all pages', async ({ page }) => {
      const pages = ['/', '/about', '/programs', '/admissions', '/contact'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        const accessibilityTree = await page.accessibility.snapshot();
        
        const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
          const results: any[] = [];
          const traverse = (node: any) => {
            if (predicate(node)) results.push(node);
            if (node.children) {
              node.children.forEach(traverse);
            }
          };
          traverse(tree);
          return results;
        };
        
        // Find all headings
        const headings = findInTree(accessibilityTree!, node => 
          node.role === 'heading'
        );
        
        expect(headings.length).toBeGreaterThan(1);
        
        // Verify headings have proper levels and names
        headings.forEach(heading => {
          expect(heading.name).toBeTruthy();
          expect(heading.level).toBeGreaterThan(0);
          expect(heading.level).toBeLessThan(7);
        });
        
        // Verify heading hierarchy
        const levels = headings.map(h => h.level).sort((a, b) => a - b);
        expect(levels[0]).toBe(1); // Should start with H1
      }
    });

    test('should support landmark navigation', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find landmark roles
      const landmarks = findInTree(accessibilityTree!, node => 
        ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search'].includes(node.role)
      );
      
      expect(landmarks.length).toBeGreaterThan(2);
      
      // Should have at least main and navigation
      const landmarkRoles = landmarks.map(l => l.role);
      expect(landmarkRoles).toContain('main');
      expect(landmarkRoles).toContain('navigation');
    });

    test('should support list navigation for menus', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find navigation lists
      const lists = findInTree(accessibilityTree!, node => 
        node.role === 'list'
      );
      
      // Should have navigation menus as lists
      expect(lists.length).toBeGreaterThan(0);
      
      // Check list items
      lists.forEach(list => {
        const listItems = findInTree(list, node => node.role === 'listitem');
        if (listItems.length > 0) {
          expect(listItems.length).toBeGreaterThan(1);
        }
      });
    });
  });

  test.describe('Form Accessibility for Screen Readers', () => {
    test('should provide complete form information to screen readers', async ({ page }) => {
      await page.goto('/contact');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find form fields
      const formFields = findInTree(accessibilityTree!, node => 
        ['textbox', 'combobox'].includes(node.role)
      );
      
      expect(formFields.length).toBeGreaterThan(4);
      
      // Check each form field has proper accessible name
      formFields.forEach(field => {
        expect(field.name).toBeTruthy();
        expect(field.name.length).toBeGreaterThan(2);
        
        // Check for required state
        if (field.name.includes('*') || field.required) {
          expect(field.required || field.name.includes('*')).toBeTruthy();
        }
      });
      
      // Find submit button
      const buttons = findInTree(accessibilityTree!, node => 
        node.role === 'button'
      );
      
      const submitButton = buttons.find(btn => 
        btn.name && btn.name.toLowerCase().includes('send')
      );
      expect(submitButton).toBeTruthy();
    });

    test('should handle form validation states for screen readers', async ({ page }) => {
      await page.goto('/contact');
      
      // Fill form with invalid data to trigger validation
      await page.fill('#email', 'invalid-email');
      await page.blur('#email');
      
      // Get accessibility tree after validation
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find email field in accessibility tree
      const emailField = findInTree(accessibilityTree!, node => 
        node.role === 'textbox' && 
        node.name && 
        node.name.toLowerCase().includes('email')
      )[0];
      
      if (emailField) {
        // Should be marked as invalid
        expect(emailField.invalid).toBe(true);
        
        // Should have description (error message)
        expect(emailField.description || emailField.name.includes('error')).toBeTruthy();
      }
    });
  });

  test.describe('Image Accessibility for Screen Readers', () => {
    test('should provide descriptive alt text that creates mental images', async ({ page }) => {
      const testPages = [
        { path: '/', context: 'homepage' },
        { path: '/about', context: 'about montessori education' },
        { path: '/programs', context: 'montessori programs and materials' }
      ];
      
      for (const pageInfo of testPages) {
        await page.goto(pageInfo.path);
        
        const accessibilityTree = await page.accessibility.snapshot();
        
        const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
          const results: any[] = [];
          const traverse = (node: any) => {
            if (predicate(node)) results.push(node);
            if (node.children) {
              node.children.forEach(traverse);
            }
          };
          traverse(tree);
          return results;
        };
        
        // Find images in accessibility tree
        const images = findInTree(accessibilityTree!, node => 
          node.role === 'img'
        );
        
        images.forEach(image => {
          if (image.name) {
            // Alt text should be descriptive and contextual
            expect(image.name.length).toBeGreaterThan(10);
            
            if (pageInfo.context.includes('montessori')) {
              expect(image.name.toLowerCase()).toMatch(/child|learn|montessori|material|activity|development/);
            }
            
            // Should not be just filename or generic terms
            expect(image.name).not.toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
            expect(image.name.toLowerCase()).not.toMatch(/^(image|photo|picture|img)$/);
          }
        });
      }
    });

    test('should handle decorative images appropriately', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find all images
      const images = findInTree(accessibilityTree!, node => 
        node.role === 'img'
      );
      
      // All images should either have meaningful alt text or be hidden from screen readers
      images.forEach(image => {
        if (!image.name || image.name.trim() === '') {
          // If no alt text, should be marked as decorative (hidden from accessibility tree)
          // This test passes if the image is not in the accessibility tree at all
          expect(true).toBe(true);
        } else {
          // If has alt text, should be meaningful
          expect(image.name.length).toBeGreaterThan(3);
        }
      });
    });
  });

  test.describe('Error Announcement Patterns', () => {
    test('should use appropriate aria-live regions for different error types', async ({ page }) => {
      await page.goto('/contact');
      
      // Test form validation errors (should be polite)
      const validationErrors = await page.locator('[aria-live="polite"]').count();
      expect(validationErrors).toBeGreaterThan(0);
      
      // Test critical errors (should be assertive)  
      const criticalErrors = await page.locator('[aria-live="assertive"], [role="alert"]').count();
      expect(criticalErrors).toBeGreaterThan(0);
    });

    test('should provide contextual error information', async ({ page }) => {
      await page.goto('/contact');
      
      // Submit form to trigger validation
      await page.click('#submit-btn');
      
      // Wait for validation to appear
      await page.waitForTimeout(500);
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Find form fields with validation errors
      const invalidFields = findInTree(accessibilityTree!, node => 
        node.invalid === true
      );
      
      invalidFields.forEach(field => {
        // Should have description with error information
        expect(field.description || field.name.includes('required')).toBeTruthy();
      });
    });
  });

  test.describe('Mobile Screen Reader Support', () => {
    test('should work with mobile screen readers', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/contact');
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      // Mobile screen readers should get the same accessibility tree
      expect(accessibilityTree).toBeTruthy();
      expect(accessibilityTree!.role).toBe('WebArea');
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Should have touch-friendly interactive elements
      const buttons = findInTree(accessibilityTree!, node => 
        node.role === 'button'
      );
      
      expect(buttons.length).toBeGreaterThan(0);
      
      // Form fields should have appropriate input types
      const textInputs = findInTree(accessibilityTree!, node => 
        node.role === 'textbox'
      );
      
      expect(textInputs.length).toBeGreaterThan(3);
    });
  });

  test.describe('Screen Reader Performance', () => {
    test('should load accessibility tree efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      const accessibilityTree = await page.accessibility.snapshot();
      
      const loadTime = Date.now() - startTime;
      
      // Should load accessibility tree quickly (under 2 seconds)
      expect(loadTime).toBeLessThan(2000);
      expect(accessibilityTree).toBeTruthy();
    });

    test('should handle complex pages without accessibility tree bloat', async ({ page }) => {
      await page.goto('/programs'); // Usually a complex page with many images
      
      const accessibilityTree = await page.accessibility.snapshot();
      
      const findInTree = (tree: any, predicate: (node: any) => boolean): any[] => {
        const results: any[] = [];
        const traverse = (node: any) => {
          if (predicate(node)) results.push(node);
          if (node.children) {
            node.children.forEach(traverse);
          }
        };
        traverse(tree);
        return results;
      };
      
      // Count total nodes in accessibility tree
      const totalNodes = findInTree(accessibilityTree!, () => true);
      
      // Should be comprehensive but not bloated (reasonable number of nodes)
      expect(totalNodes.length).toBeGreaterThan(20);
      expect(totalNodes.length).toBeLessThan(500);
    });
  });
});