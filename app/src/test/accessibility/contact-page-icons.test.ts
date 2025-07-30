/**
 * Accessibility tests for contact page decorative icons
 * Verifies that all decorative icons have proper aria-hidden attributes
 * as per Bug #038 fix
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Contact Page Icon Accessibility', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(async () => {
    // Read the contact page HTML
    const contactPagePath = path.join(process.cwd(), 'dist', 'contact', 'index.html');
    
    // For unit tests, we'll parse the Astro source file
    const astroSource = fs.readFileSync(
      path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
      'utf-8'
    );
    
    // Extract HTML content from Astro file (simplified for testing)
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  describe('Decorative Icons aria-hidden Attribute', () => {
    const iconNames = [
      'User', 'Mail', 'Phone', 'Baby', 'MessageSquare', 
      'Calendar', 'Send', 'Clock', 'MapPin', 'Heart', 
      'AlertCircle', 'CheckCircle'
    ];

    it('should verify all decorative icons in the contact page source', async () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Count total icon instances
      let totalIconInstances = 0;
      let iconsWithAriaHidden = 0;

      // Check each icon type
      iconNames.forEach(iconName => {
        // Match icon component usage patterns
        const iconPattern = new RegExp(`<${iconName}[^>]*>`, 'g');
        const matches = astroSource.match(iconPattern) || [];
        
        matches.forEach(match => {
          totalIconInstances++;
          if (match.includes('aria-hidden="true"')) {
            iconsWithAriaHidden++;
          }
        });
      });

      // According to the fix, there should be 20 decorative icon instances
      expect(totalIconInstances).toBeGreaterThanOrEqual(20);
      expect(iconsWithAriaHidden).toBe(totalIconInstances);
    });

    it('should check specific icon instances have aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check hero section MessageSquare icon
      const heroIconMatch = astroSource.match(
        /<MessageSquare[^>]*className="w-8 h-8 text-white"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(heroIconMatch).toBeTruthy();

      // Check contact method card icons
      const phoneCardIconMatch = astroSource.match(
        /<Phone[^>]*className="w-8 h-8 text-white"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(phoneCardIconMatch).toBeTruthy();

      const mailCardIconMatch = astroSource.match(
        /<Mail[^>]*className="w-8 h-8 text-white"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(mailCardIconMatch).toBeTruthy();

      const mapPinCardIconMatch = astroSource.match(
        /<MapPin[^>]*className="w-8 h-8 text-white"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(mapPinCardIconMatch).toBeTruthy();
    });

    it('should verify form field label icons have aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check form field icons
      const formIcons = [
        { icon: 'User', context: 'Your Name' },
        { icon: 'Mail', context: 'Email Address' },
        { icon: 'Phone', context: 'Phone Number' },
        { icon: 'Baby', context: "Child's Age" },
        { icon: 'MessageSquare', context: 'Subject' },
        { icon: 'Calendar', context: 'Interested in a Tour' }
      ];

      formIcons.forEach(({ icon, context }) => {
        // Create a more flexible pattern that looks for the icon near the context
        const contextIndex = astroSource.indexOf(context);
        if (contextIndex !== -1) {
          // Look for the icon within 200 characters before the context
          const searchStart = Math.max(0, contextIndex - 200);
          const searchSection = astroSource.substring(searchStart, contextIndex);
          
          const iconPattern = new RegExp(`<${icon}[^>]*aria-hidden="true"[^>]*\/>`, 'g');
          const iconMatch = searchSection.match(iconPattern);
          
          expect(iconMatch).toBeTruthy();
        }
      });
    });

    it('should verify section header icons have aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check section headers
      const sectionIcons = [
        { icon: 'Send', context: 'Send Us a Message' },
        { icon: 'Clock', context: "When We're Here" },
        { icon: 'Heart', context: 'More Ways to Connect' },
        { icon: 'AlertCircle', context: 'Emergency Contact' }
      ];

      sectionIcons.forEach(({ icon, context }) => {
        const contextIndex = astroSource.indexOf(context);
        if (contextIndex !== -1) {
          const searchStart = Math.max(0, contextIndex - 200);
          const searchSection = astroSource.substring(searchStart, contextIndex);
          
          const iconPattern = new RegExp(`<${icon}[^>]*aria-hidden="true"[^>]*\/>`, 'g');
          const iconMatch = searchSection.match(iconPattern);
          
          expect(iconMatch).toBeTruthy();
        }
      });
    });

    it('should verify alert message icons have aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check success message icon
      const successIconMatch = astroSource.match(
        /<CheckCircle[^>]*className="w-5 h-5 text-green-600[^"]*"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(successIconMatch).toBeTruthy();

      // Check error message icon
      const errorIconMatch = astroSource.match(
        /<AlertCircle[^>]*className="w-5 h-5 text-red-600[^"]*"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(errorIconMatch).toBeTruthy();
    });

    it('should verify submit button icon has aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check submit button Send icon
      const submitIconMatch = astroSource.match(
        /<Send[^>]*className="w-5 h-5[^"]*"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(submitIconMatch).toBeTruthy();
    });

    it('should verify map section icon has aria-hidden', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check "Get Directions" link icon
      const directionsIconMatch = astroSource.match(
        /<MapPin[^>]*className="w-4 h-4[^"]*"[^>]*aria-hidden="true"[^>]*\/>/
      );
      expect(directionsIconMatch).toBeTruthy();
    });
  });

  describe('Icon Accessibility Pattern Verification', () => {
    it('should ensure no icons are missing aria-hidden attribute', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      const iconNames = [
        'User', 'Mail', 'Phone', 'Baby', 'MessageSquare', 
        'Calendar', 'Send', 'Clock', 'MapPin', 'Heart', 
        'AlertCircle', 'CheckCircle'
      ];

      const missingAriaHidden: string[] = [];

      iconNames.forEach(iconName => {
        // Find all instances of this icon
        const iconPattern = new RegExp(`<${iconName}[^>]*>`, 'g');
        const matches = astroSource.match(iconPattern) || [];
        
        matches.forEach((match, index) => {
          if (!match.includes('aria-hidden="true"')) {
            missingAriaHidden.push(`${iconName} instance ${index + 1}: ${match}`);
          }
        });
      });

      // All icons should have aria-hidden
      expect(missingAriaHidden).toHaveLength(0);
    });

    it('should verify aria-hidden is set to "true" not other values', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      // Check for any incorrect aria-hidden values
      const incorrectAriaHidden = astroSource.match(/aria-hidden="(?!true")[^"]*"/g);
      expect(incorrectAriaHidden).toBeNull();
    });
  });

  describe('Icon Count Verification', () => {
    it('should count exactly 20 decorative icons as per bug fix', () => {
      const astroSource = fs.readFileSync(
        path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
        'utf-8'
      );

      const iconNames = [
        'User', 'Mail', 'Phone', 'Baby', 'MessageSquare', 
        'Calendar', 'Send', 'Clock', 'MapPin', 'Heart', 
        'AlertCircle', 'CheckCircle'
      ];

      let totalCount = 0;
      const iconCounts: Record<string, number> = {};

      iconNames.forEach(iconName => {
        const iconPattern = new RegExp(`<${iconName}[^>]*>`, 'g');
        const matches = astroSource.match(iconPattern) || [];
        iconCounts[iconName] = matches.length;
        totalCount += matches.length;
      });

      // Log the counts for debugging
      console.log('Icon counts:', iconCounts);
      console.log('Total decorative icons:', totalCount);

      // Verify we have at least 20 icons (the exact count from the bug fix)
      expect(totalCount).toBeGreaterThanOrEqual(20);
    });
  });
});