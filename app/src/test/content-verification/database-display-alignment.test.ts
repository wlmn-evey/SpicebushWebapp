import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getCollection, 
  getEntry, 
  getSetting 
} from '@lib/content-db-direct';

/**
 * Database vs Display Content Alignment Tests
 * 
 * These tests verify that content stored in the database matches what should be
 * displayed on the website. They catch discrepancies between stored data and
 * rendered content, ensuring data integrity throughout the content pipeline.
 */

describe('Database vs Display Content Alignment', () => {
  describe('School Information Alignment', () => {
    it('should have matching contact information between database and display formats', async () => {
      const schoolInfo = await getEntry('school-info', 'general');
      expect(schoolInfo).toBeDefined();
      
      const data = schoolInfo!.data;
      
      // Verify phone number is in consistent display format
      expect(data.phone).toBe('(484) 202-0712');
      expect(data.phone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
      
      // Verify email is properly formatted
      expect(data.email).toBe('information@spicebushmontessori.org');
      expect(data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      // Verify address components are complete and formatted consistently
      expect(data.address.street).toBe('827 Concord Road');
      expect(data.address.city).toBe('Glen Mills');
      expect(data.address.state).toBe('PA');
      expect(data.address.zip).toBe('19342');
      
      // Verify ages served is in display-ready format
      expect(data.agesServed).toBe('3 to 6 years');
      
      // Verify school year format is consistent
      expect(data.schoolYear).toMatch(/^\d{4}-\d{4}$/);
      expect(data.schoolYear).toBe('2025-2026');
    });

    it('should have social media URLs ready for direct display use', async () => {
      const schoolInfo = await getEntry('school-info', 'general');
      const socialMedia = schoolInfo!.data.socialMedia;
      
      // URLs should be complete and valid
      expect(socialMedia.facebook).toMatch(/^https:\/\/www\.facebook\.com\//);
      expect(socialMedia.instagram).toMatch(/^https:\/\/www\.instagram\.com\//);
      
      // URLs should be specific to Spicebush
      expect(socialMedia.facebook).toContain('SpicebushMontessori');
      expect(socialMedia.instagram).toContain('spicebushmontessori');
    });
  });

  describe('Staff Information Display Readiness', () => {
    it('should have staff data formatted for immediate display use', async () => {
      const staffCollection = await getCollection('staff');
      expect(staffCollection.length).toBeGreaterThan(0);
      
      staffCollection.forEach(staffEntry => {
        const staff = staffEntry.data;
        
        // Name should be display-ready (proper capitalization)
        expect(staff.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+/);
        
        // Role should be display-ready (proper title case)
        expect(staff.role).toMatch(/Teacher|Lead|Head|Assistant/);
        
        // Photo path should be complete and point to optimized images
        expect(staff.photo).toMatch(/^\/images\/(optimized\/)?teachers\//);
        expect(staff.photo).toMatch(/\.(jpg|jpeg|png|webp|svg)$/);
        
        // Languages should be in display format
        expect(Array.isArray(staff.languages)).toBe(true);
        expect(staff.languages.length).toBeGreaterThan(0);
        staff.languages.forEach(lang => {
          expect(typeof lang).toBe('string');
          expect(lang.length).toBeGreaterThan(0);
        });
        
        // Start year should be a valid year
        expect(staff.startYear).toBeGreaterThan(2020);
        expect(staff.startYear).toBeLessThanOrEqual(new Date().getFullYear());
        
        // Order should be a positive integer for sorting
        expect(staff.order).toBeGreaterThan(0);
        expect(Number.isInteger(staff.order)).toBe(true);
      });
    });

    it('should have staff ordering suitable for display hierarchy', async () => {
      const staffCollection = await getCollection('staff');
      const staffByOrder = staffCollection
        .map(entry => entry.data)
        .sort((a, b) => a.order - b.order);
      
      // First staff member should be order 1
      expect(staffByOrder[0].order).toBe(1);
      
      // Orders should be sequential or at least increasing
      for (let i = 1; i < staffByOrder.length; i++) {
        expect(staffByOrder[i].order).toBeGreaterThanOrEqual(staffByOrder[i-1].order);
      }
      
      // Lead/Head teachers should generally come first in ordering
      const leadStaff = staffByOrder.filter(s => 
        s.role.includes('Lead') || s.role.includes('Head')
      );
      if (leadStaff.length > 0) {
        expect(leadStaff[0].order).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Hours Information Display Format', () => {
    it('should have hours data in display-ready format', async () => {
      const hoursCollection = await getCollection('hours');
      expect(hoursCollection.length).toBe(7); // All 7 days of week
      
      hoursCollection.forEach(hourEntry => {
        const hours = hourEntry.data;
        
        // Day should be full day name
        expect(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
          .toContain(hours.day);
        
        if (!hours.is_closed) {
          // Times should be in 12-hour format with AM/PM
          expect(hours.open_time).toMatch(/^(1?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/);
          expect(hours.close_time).toMatch(/^(1?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/);
          
          // Extended care note should be consistent when present
          if (hours.note) {
            expect(hours.note).toContain('Extended care available until 5:30 PM');
          }
        }
        
        // Order should correspond to day of week (1=Monday, 7=Sunday)
        const dayToOrder = {
          'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
          'Friday': 5, 'Saturday': 6, 'Sunday': 7
        };
        expect(hours.order).toBe(dayToOrder[hours.day as keyof typeof dayToOrder]);
      });
    });

    it('should have consistent extended care messaging', async () => {
      const hoursCollection = await getCollection('hours');
      const schoolInfo = await getEntry('school-info', 'general');
      
      const extendedCareTime = schoolInfo!.data.extendedCareUntil;
      
      hoursCollection.forEach(hourEntry => {
        const hours = hourEntry.data;
        
        // Weekdays with extended care should have consistent close time
        if (['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(hours.day) && !hours.is_closed) {
          expect(hours.close_time).toBe(extendedCareTime);
          
          if (hours.note) {
            expect(hours.note).toContain(extendedCareTime);
          }
        }
      });
    });
  });

  describe('Tuition Information Display Consistency', () => {
    it('should have tuition programs with display-ready information', async () => {
      const tuitionCollection = await getCollection('tuition');
      const programs = tuitionCollection.filter(entry => entry.data.type === 'program');
      
      expect(programs.length).toBeGreaterThan(0);
      
      programs.forEach(programEntry => {
        const program = programEntry.data;
        
        // Program name should be display-ready
        expect(program.name).toMatch(/^[A-Z]/); // Starts with capital
        expect(program.name).toContain('Day'); // Should specify day type
        
        // Program type should be consistent terminology
        expect(['Half Day', 'Full Day']).toContain(program.program_type);
        
        // Days per week should be reasonable
        expect(program.days_per_week).toBeGreaterThan(0);
        expect(program.days_per_week).toBeLessThanOrEqual(5);
        
        // Daily hours should be reasonable for childcare
        expect(program.daily_hours).toBeGreaterThan(2);
        expect(program.daily_hours).toBeLessThanOrEqual(10);
        
        // Description should be complete and informative
        expect(program.description).toMatch(/AM.*PM/); // Should contain time range
        expect(program.description.length).toBeGreaterThan(20);
        
        // Display order should be positive
        expect(program.display_order).toBeGreaterThan(0);
        
        // Active programs should be marked as such
        expect(program.active).toBe(true);
      });
    });

    it('should have tuition rates with consistent pricing display format', async () => {
      const tuitionCollection = await getCollection('tuition');
      const rates = tuitionCollection.filter(entry => entry.data.type === 'rate');
      
      expect(rates.length).toBeGreaterThan(0);
      
      rates.forEach(rateEntry => {
        const rate = rateEntry.data;
        
        // Rate label should be display-ready
        expect(rate.rate_label).toMatch(/^Tuition [A-Z]/);
        
        // Program ID should reference a valid program
        expect(rate.program_id).toBeDefined();
        expect(rate.program_id.length).toBeGreaterThan(0);
        
        // Tuition prices should be reasonable positive numbers
        expect(rate.tuition_price).toBeGreaterThan(5000); // Reasonable minimum
        expect(rate.tuition_price).toBeLessThan(50000); // Reasonable maximum
        
        // Extended care pricing should be consistent
        if (rate.extended_care_available) {
          expect(rate.extended_care_price).toBeGreaterThan(0);
          expect(rate.extended_care_price).toBeLessThan(rate.tuition_price); // Should be less than main tuition
        }
        
        // School year should be current format
        expect(rate.school_year).toBe('2025-2026');
        
        // Display order should be positive
        expect(rate.display_order).toBeGreaterThan(0);
        
        // Active rates should be marked as such
        expect(rate.active).toBe(true);
      });
    });
  });

  describe('Settings Consistency with Content', () => {
    it('should have settings that match content data', async () => {
      const schoolInfo = await getEntry('school-info', 'general');
      const currentSchoolYearSetting = await getSetting('current-school-year');
      
      // School year should be consistent between settings and content
      if (currentSchoolYearSetting) {
        expect(currentSchoolYearSetting).toBe(schoolInfo!.data.schoolYear);
      }
      
      // Additional settings consistency checks
      const annualIncreaseSetting = await getSetting('annual-increase-rate');
      const siblingDiscountSetting = await getSetting('sibling-discount-rate');
      const upfrontDiscountSetting = await getSetting('upfront-discount-rate');
      
      // Settings should be reasonable percentages if they exist
      if (annualIncreaseSetting) {
        expect(typeof annualIncreaseSetting).toBe('number');
        expect(annualIncreaseSetting).toBeGreaterThan(0);
        expect(annualIncreaseSetting).toBeLessThan(0.2); // Less than 20%
      }
      
      if (siblingDiscountSetting) {
        expect(typeof siblingDiscountSetting).toBe('number');
        expect(siblingDiscountSetting).toBeGreaterThan(0);
        expect(siblingDiscountSetting).toBeLessThan(0.5); // Less than 50%
      }
      
      if (upfrontDiscountSetting) {
        expect(typeof upfrontDiscountSetting).toBe('number');
        expect(upfrontDiscountSetting).toBeGreaterThan(0);
        expect(upfrontDiscountSetting).toBeLessThan(0.2); // Less than 20%
      }
    });
  });

  describe('Content Structure Validation', () => {
    it('should have all required content collections populated', async () => {
      // Verify all critical collections exist and have content
      const schoolInfo = await getCollection('school-info');
      const staff = await getCollection('staff');
      const hours = await getCollection('hours');
      const tuition = await getCollection('tuition');
      
      expect(schoolInfo.length).toBeGreaterThan(0);
      expect(staff.length).toBeGreaterThan(0);
      expect(hours.length).toBe(7); // Exactly 7 days
      expect(tuition.length).toBeGreaterThan(0);
    });

    it('should have content entries with proper metadata structure', async () => {
      const collections = ['school-info', 'staff', 'hours', 'tuition'];
      
      for (const collectionName of collections) {
        const collection = await getCollection(collectionName);
        
        collection.forEach(entry => {
          // Every entry should have required fields
          expect(entry.id).toBeDefined();
          expect(entry.slug).toBeDefined();
          expect(entry.collection).toBe(collectionName);
          expect(entry.data).toBeDefined();
          expect(typeof entry.data).toBe('object');
          
          // Slug should be URL-safe
          expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
        });
      }
    });

    it('should have consistent data types across similar content', async () => {
      // Staff members should all have same data structure
      const staff = await getCollection('staff');
      if (staff.length > 0) {
        const firstStaff = staff[0].data;
        const expectedKeys = Object.keys(firstStaff).sort();
        
        staff.forEach(staffEntry => {
          const staffKeys = Object.keys(staffEntry.data).sort();
          expect(staffKeys).toEqual(expectedKeys);
        });
      }
      
      // Hours entries should all have same data structure
      const hours = await getCollection('hours');
      if (hours.length > 0) {
        const firstHours = hours[0].data;
        const expectedKeys = Object.keys(firstHours).sort();
        
        hours.forEach(hourEntry => {
          const hourKeys = Object.keys(hourEntry.data).sort();
          expect(hourKeys).toEqual(expectedKeys);
        });
      }
    });
  });
});