/**
 * Accessibility tests for contact page Google Map embed
 * Verifies proper text alternative via aria-describedby
 * as per Bug #039 fix
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Contact Page Map Accessibility', () => {
  let astroSource: string;

  beforeEach(() => {
    // Read the contact page source
    astroSource = fs.readFileSync(
      path.join(process.cwd(), 'src', 'pages', 'contact.astro'), 
      'utf-8'
    );
  });

  describe('Google Map iframe Accessibility', () => {
    it('should have aria-describedby attribute on iframe', () => {
      // Find the iframe element
      const iframeMatch = astroSource.match(
        /<iframe[^>]*src="https:\/\/www\.google\.com\/maps\/embed[^>]*>/
      );
      
      expect(iframeMatch).toBeTruthy();
      
      if (iframeMatch) {
        // Verify aria-describedby is present
        expect(iframeMatch[0]).toContain('aria-describedby="school-address"');
      }
    });

    it('should have proper title attribute on iframe', () => {
      const iframeMatch = astroSource.match(
        /<iframe[^>]*title="[^"]*"[^>]*>/
      );
      
      expect(iframeMatch).toBeTruthy();
      
      if (iframeMatch) {
        // Verify title is descriptive
        expect(iframeMatch[0]).toContain('title="Spicebush Montessori School Location Map"');
      }
    });

    it('should have complete iframe attributes for accessibility', () => {
      // Extract the full iframe element
      const iframeStart = astroSource.indexOf('<iframe');
      const iframeEnd = astroSource.indexOf('></iframe>', iframeStart) + 1;
      const iframeElement = astroSource.substring(iframeStart, iframeEnd);

      // Check all required attributes
      expect(iframeElement).toContain('src="https://www.google.com/maps/embed');
      expect(iframeElement).toContain('width=');
      expect(iframeElement).toContain('height=');
      expect(iframeElement).toContain('allowfullscreen=""');
      expect(iframeElement).toContain('loading="lazy"');
      expect(iframeElement).toContain('referrerpolicy="no-referrer-when-downgrade"');
      expect(iframeElement).toContain('title="Spicebush Montessori School Location Map"');
      expect(iframeElement).toContain('aria-describedby="school-address"');
    });
  });

  describe('Address Section Accessibility', () => {
    it('should have id="school-address" on address section', () => {
      // Look for the div with id="school-address"
      const addressSectionMatch = astroSource.match(
        /<div[^>]*id="school-address"[^>]*>/
      );
      
      expect(addressSectionMatch).toBeTruthy();
    });

    it('should contain complete address information in the section', () => {
      // Find the school-address section
      const addressStart = astroSource.indexOf('id="school-address"');
      expect(addressStart).toBeGreaterThan(-1);

      // Extract content around the address section
      const sectionStart = astroSource.lastIndexOf('<div', addressStart);
      const sectionEnd = astroSource.indexOf('</div>', addressStart) + 6;
      const addressSection = astroSource.substring(sectionStart, sectionEnd);

      // Verify address content
      expect(addressSection).toContain('827 Concord Road');
      expect(addressSection).toContain('Glen Mills, PA 19342');
      expect(addressSection).toContain('Address');
    });

    it('should have proper heading structure in address section', () => {
      // Find the school-address section
      const addressStart = astroSource.indexOf('id="school-address"');
      const sectionEnd = astroSource.indexOf('</div>', addressStart);
      const addressSection = astroSource.substring(addressStart, sectionEnd);

      // Check for heading
      const headingMatch = addressSection.match(/<h4[^>]*>Address<\/h4>/);
      expect(headingMatch).toBeTruthy();
    });

    it('should use semantic address element', () => {
      // Find the address within the school-address section
      const addressStart = astroSource.indexOf('id="school-address"');
      const sectionEnd = astroSource.indexOf('</div>', addressStart + 500);
      const addressSection = astroSource.substring(addressStart, sectionEnd);

      // Check for semantic address element
      const addressElementMatch = addressSection.match(/<address[^>]*>/);
      expect(addressElementMatch).toBeTruthy();
      
      // Verify it contains the actual address
      const addressContent = addressSection.match(
        /<address[^>]*>[\s\S]*?827 Concord Road[\s\S]*?Glen Mills, PA 19342[\s\S]*?<\/address>/
      );
      expect(addressContent).toBeTruthy();
    });
  });

  describe('Map and Address Relationship', () => {
    it('should have proper ARIA relationship between map and address', () => {
      // Verify both elements exist with correct attributes
      const iframeMatch = astroSource.match(
        /<iframe[^>]*aria-describedby="school-address"[^>]*>/
      );
      const addressMatch = astroSource.match(
        /<div[^>]*id="school-address"[^>]*>/
      );

      expect(iframeMatch).toBeTruthy();
      expect(addressMatch).toBeTruthy();
    });

    it('should have address section before or near the map', () => {
      // Find positions of both elements
      const iframePosition = astroSource.indexOf('<iframe');
      const addressPosition = astroSource.indexOf('id="school-address"');

      expect(iframePosition).toBeGreaterThan(-1);
      expect(addressPosition).toBeGreaterThan(-1);

      // They should be in the same section (within reasonable distance)
      const distance = Math.abs(iframePosition - addressPosition);
      expect(distance).toBeLessThan(2000); // Within ~2000 characters
    });
  });

  describe('Additional Map Section Accessibility', () => {
    it('should have proper section heading for map area', () => {
      // Find the map section
      const findUsMatch = astroSource.match(
        /<h2[^>]*>Find Us<\/h2>/
      );
      
      expect(findUsMatch).toBeTruthy();
    });

    it('should have descriptive text near the map', () => {
      // Look for descriptive text about location
      const descriptionMatch = astroSource.match(
        /We're located in Glen Mills, Pennsylvania, easily accessible from the greater Philadelphia area\./
      );
      
      expect(descriptionMatch).toBeTruthy();
    });

    it('should have accessible parking and transportation info', () => {
      // Check for parking information
      expect(astroSource).toContain('Parking');
      expect(astroSource).toContain('Free parking is available on-site');
      expect(astroSource).toContain('Visitor spaces are clearly marked');

      // Check for public transportation info
      expect(astroSource).toContain('Public Transportation');
      expect(astroSource).toContain('Limited public transit access');
    });

    it('should have accessible "Get Directions" link', () => {
      // Find the Get Directions link
      const directionsLinkMatch = astroSource.match(
        /<a[^>]*href="https:\/\/maps\.google\.com[^"]*"[^>]*>[\s\S]*?Get Directions[\s\S]*?<\/a>/
      );
      
      expect(directionsLinkMatch).toBeTruthy();
      
      if (directionsLinkMatch) {
        // Verify it opens in new tab with proper attributes
        expect(directionsLinkMatch[0]).toContain('target="_blank"');
        expect(directionsLinkMatch[0]).toContain('rel="noopener noreferrer"');
      }
    });
  });

  describe('Map Section Structure Validation', () => {
    it('should have proper grid layout for map and info', () => {
      // Check for grid structure
      const gridMatch = astroSource.match(
        /<div[^>]*class="[^"]*grid[^"]*grid-cols-1[^"]*lg:grid-cols-3[^"]*"[^>]*>/
      );
      
      expect(gridMatch).toBeTruthy();
    });

    it('should have "Getting Here" section with all required info', () => {
      // Find the Getting Here section
      const gettingHereMatch = astroSource.match(
        /<h3[^>]*>Getting Here<\/h3>/
      );
      
      expect(gettingHereMatch).toBeTruthy();

      // Verify it's in a structured container
      const gettingHereStart = astroSource.indexOf('Getting Here');
      const sectionContent = astroSource.substring(
        gettingHereStart - 200, 
        gettingHereStart + 1500
      );

      // Check for all required subsections
      expect(sectionContent).toContain('id="school-address"');
      expect(sectionContent).toContain('Address');
      expect(sectionContent).toContain('Parking');
      expect(sectionContent).toContain('Public Transportation');
    });
  });

  describe('WCAG 2.1 Compliance Checks', () => {
    it('should meet WCAG 2.1 Level A requirements for embedded content', () => {
      // Verify iframe has both title and aria-describedby
      const iframeMatch = astroSource.match(
        /<iframe[^>]*>/
      );
      
      if (iframeMatch) {
        const iframe = iframeMatch[0];
        
        // 1.1.1 Non-text Content - must have text alternative
        expect(iframe).toContain('title=');
        expect(iframe).toContain('aria-describedby=');
        
        // 4.1.2 Name, Role, Value - must have proper attributes
        expect(iframe).toMatch(/title="[^"]+"/);
        expect(iframe).toMatch(/aria-describedby="[^"]+"/);
      }
    });

    it('should provide multiple ways to access location information', () => {
      // Verify multiple access methods as per WCAG 2.4.5
      
      // 1. Visual map
      expect(astroSource).toContain('iframe');
      expect(astroSource).toContain('google.com/maps/embed');
      
      // 2. Text address
      expect(astroSource).toContain('827 Concord Road');
      expect(astroSource).toContain('Glen Mills, PA 19342');
      
      // 3. Link to directions
      expect(astroSource).toContain('Get Directions');
      expect(astroSource).toContain('maps.google.com/?q=');
    });
  });
});