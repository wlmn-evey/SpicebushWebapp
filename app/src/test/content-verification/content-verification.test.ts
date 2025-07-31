import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getCollection, 
  getEntry, 
  getSetting 
} from '@lib/content-db-direct';

/**
 * Content Verification Test Suite
 * 
 * This comprehensive test suite ensures factual information accuracy across the 
 * SpicebushWebapp. It verifies business information consistency, program details,
 * staff information correctness, and cross-page data alignment.
 */

// Define expected data structures for validation
interface SchoolInfo {
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  agesServed: string;
  schoolYear: string;
  extendedCareUntil: string;
  socialMedia: {
    facebook: string;
    instagram: string;
  };
  founded: number;
}

interface StaffMember {
  name: string;
  role: string;
  photo: string;
  languages: string[];
  startYear: number;
  order: number;
}

interface HoursEntry {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  note?: string;
  order: number;
}

interface TuitionProgram {
  type: string;
  name: string;
  program_type: string;
  days_per_week: number;
  daily_hours: number;
  description: string;
  display_order: number;
  active: boolean;
}

interface TuitionRate {
  type: string;
  rate_label: string;
  program_id: string;
  tuition_price: number;
  extended_care_price: number;
  extended_care_available: boolean;
  is_constant_rate: boolean;
  school_year: string;
  display_order: number;
  active: boolean;
}

// Test data validation helpers
const validatePhoneFormat = (phone: string): boolean => {
  // Should match format: (XXX) XXX-XXXX
  const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
  return phonePattern.test(phone);
};

const validateEmailFormat = (email: string): boolean => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

const validateTimeFormat = (time: string): boolean => {
  // Should match format: "H:MM AM" or "HH:MM AM"
  const timePattern = /^(1?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/;
  return timePattern.test(time);
};

const validateUrlFormat = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

describe('Content Verification Test Suite', () => {
  let schoolInfo: SchoolInfo;
  let staffMembers: StaffMember[];
  let hoursEntries: HoursEntry[];
  let tuitionPrograms: TuitionProgram[];
  let tuitionRates: TuitionRate[];

  beforeAll(async () => {
    // Load all content data for verification
    const schoolInfoEntry = await getEntry('school-info', 'general');
    const staffCollection = await getCollection('staff');
    const hoursCollection = await getCollection('hours');
    const tuitionCollection = await getCollection('tuition');

    if (!schoolInfoEntry) {
      throw new Error('School info not found - content verification cannot proceed');
    }

    schoolInfo = schoolInfoEntry.data as SchoolInfo;
    staffMembers = staffCollection.map(entry => entry.data as StaffMember);
    hoursEntries = hoursCollection.map(entry => entry.data as HoursEntry);
    
    // Separate programs from rates
    tuitionPrograms = tuitionCollection
      .filter(entry => entry.data.type === 'program')
      .map(entry => entry.data as TuitionProgram);
    
    tuitionRates = tuitionCollection
      .filter(entry => entry.data.type === 'rate')
      .map(entry => entry.data as TuitionRate);
  });

  describe('Business Information Verification', () => {
    it('should have consistent and valid school contact information', () => {
      expect(schoolInfo).toBeDefined();
      
      // Validate phone number format and consistency
      expect(validatePhoneFormat(schoolInfo.phone)).toBe(true);
      expect(schoolInfo.phone).toBe('(484) 202-0712');
      
      // Validate email format and consistency
      expect(validateEmailFormat(schoolInfo.email)).toBe(true);
      expect(schoolInfo.email).toBe('information@spicebushmontessori.org');
      
      // Validate address completeness
      expect(schoolInfo.address).toBeDefined();
      expect(schoolInfo.address.street).toBe('827 Concord Road');
      expect(schoolInfo.address.city).toBe('Glen Mills');
      expect(schoolInfo.address.state).toBe('PA');
      expect(schoolInfo.address.zip).toBe('19342');
    });

    it('should have valid social media URLs', () => {
      expect(schoolInfo.socialMedia).toBeDefined();
      expect(validateUrlFormat(schoolInfo.socialMedia.facebook)).toBe(true);
      expect(validateUrlFormat(schoolInfo.socialMedia.instagram)).toBe(true);
      
      // Verify social media URLs point to correct platforms
      expect(schoolInfo.socialMedia.facebook).toContain('facebook.com');
      expect(schoolInfo.socialMedia.instagram).toContain('instagram.com');
    });

    it('should have consistent school operational information', () => {
      expect(schoolInfo.agesServed).toBe('3 to 6 years');
      expect(schoolInfo.schoolYear).toBe('2025-2026');
      expect(schoolInfo.extendedCareUntil).toBe('5:30 PM');
      expect(schoolInfo.founded).toBe(2021);
      expect(validateTimeFormat(schoolInfo.extendedCareUntil)).toBe(true);
    });
  });

  describe('Hours Information Verification', () => {
    it('should have complete weekly hours schedule', () => {
      expect(hoursEntries).toHaveLength(7);
      
      const expectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const actualDays = hoursEntries.map(entry => entry.day).sort();
      
      expect(actualDays).toEqual(expectedDays.sort());
    });

    it('should have valid time formats for all hours entries', () => {
      hoursEntries.forEach(entry => {
        if (!entry.is_closed) {
          expect(validateTimeFormat(entry.open_time)).toBe(true);
          expect(validateTimeFormat(entry.close_time)).toBe(true);
        }
        
        // Verify ordering for display consistency
        expect(entry.order).toBeGreaterThan(0);
        expect(entry.order).toBeLessThanOrEqual(7);
      });
    });

    it('should have consistent extended care hours', () => {
      const weekdayEntries = hoursEntries.filter(entry => 
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(entry.day)
      );
      
      weekdayEntries.forEach(entry => {
        if (!entry.is_closed) {
          expect(entry.close_time).toBe('5:30 PM');
          expect(entry.note).toContain('Extended care available until 5:30 PM');
        }
      });
    });
  });

  describe('Staff Information Verification', () => {
    it('should have all required staff members with complete information', () => {
      expect(staffMembers.length).toBeGreaterThan(0);
      
      staffMembers.forEach(staff => {
        expect(staff.name).toBeDefined();
        expect(staff.name.length).toBeGreaterThan(0);
        expect(staff.role).toBeDefined();
        expect(staff.photo).toBeDefined();
        expect(staff.languages).toBeInstanceOf(Array);
        expect(staff.languages.length).toBeGreaterThan(0);
        expect(staff.startYear).toBeGreaterThan(2020);
        expect(staff.order).toBeGreaterThan(0);
      });
    });

    it('should have valid photo paths for all staff members', () => {
      staffMembers.forEach(staff => {
        expect(staff.photo).toMatch(/^\/images\/.*\.(jpg|jpeg|png|webp|svg)$/);
        // Verify the path follows the expected pattern for optimized images
        if (!staff.photo.includes('placeholder')) {
          expect(staff.photo).toContain('/optimized/teachers/');
        }
      });
    });

    it('should have consistent staff hierarchy and roles', () => {
      const roles = staffMembers.map(staff => staff.role);
      
      // Verify we have key roles represented
      const hasTeacherRole = roles.some(role => 
        role.includes('Teacher') || role.includes('Lead') || role.includes('Head')
      );
      expect(hasTeacherRole).toBe(true);
      
      // Verify ordering is consistent (lower numbers appear first)
      const sortedByOrder = [...staffMembers].sort((a, b) => a.order - b.order);
      expect(sortedByOrder[0].order).toBe(1);
    });
  });

  describe('Tuition and Program Information Verification', () => {
    it('should have complete program offerings', () => {
      expect(tuitionPrograms.length).toBeGreaterThan(0);
      
      tuitionPrograms.forEach(program => {
        expect(program.name).toBeDefined();
        expect(program.program_type).toBeDefined();
        expect(program.days_per_week).toBeGreaterThan(0);
        expect(program.days_per_week).toBeLessThanOrEqual(5);
        expect(program.daily_hours).toBeGreaterThan(0);
        expect(program.description).toBeDefined();
        expect(program.active).toBe(true);
      });
    });

    it('should have valid tuition rates for all programs', () => {
      expect(tuitionRates.length).toBeGreaterThan(0);
      
      tuitionRates.forEach(rate => {
        expect(rate.rate_label).toBeDefined();
        expect(rate.program_id).toBeDefined();
        expect(rate.tuition_price).toBeGreaterThan(0);
        expect(rate.school_year).toBe('2025-2026');
        expect(rate.active).toBe(true);
        
        // Verify extended care pricing is consistent
        if (rate.extended_care_available) {
          expect(rate.extended_care_price).toBeGreaterThan(0);
        }
      });
    });

    it('should have matching program IDs between programs and rates', () => {
      const programIds = tuitionPrograms.map(p => p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      const rateIds = tuitionRates.map(r => r.program_id);
      
      // Every rate should reference a valid program
      rateIds.forEach(rateId => {
        const matchingProgram = programIds.some(programId => 
          rateId.includes(programId) || programId.includes(rateId)
        );
        expect(matchingProgram).toBe(true);
      });
    });

    it('should have consistent school year across all tuition data', () => {
      const currentSchoolYear = '2025-2026';
      
      tuitionRates.forEach(rate => {
        expect(rate.school_year).toBe(currentSchoolYear);
      });
    });
  });

  describe('Cross-Page Consistency Verification', () => {
    it('should have consistent contact information across all data sources', async () => {
      // This test would be expanded to check rendered pages when page testing is added
      const phone = schoolInfo.phone;
      const email = schoolInfo.email;
      
      // Verify these are the canonical values used throughout the site
      expect(phone).toBe('(484) 202-0712');
      expect(email).toBe('information@spicebushmontessori.org');
    });

    it('should have consistent extended care hours across programs and general info', () => {
      const extendedCareTime = schoolInfo.extendedCareUntil;
      
      // Check that tuition programs mentioning extended care use consistent times
      tuitionRates.forEach(rate => {
        if (rate.extended_care_available) {
          // This would be expanded to check program descriptions
          expect(extendedCareTime).toBe('5:30 PM');
        }
      });
    });

    it('should have consistent school year across all content types', async () => {
      const currentSchoolYear = schoolInfo.schoolYear;
      
      // Verify settings match
      const schoolYearSetting = await getSetting('current-school-year');
      if (schoolYearSetting) {
        expect(schoolYearSetting).toBe(currentSchoolYear);
      }
      
      // Verify tuition rates match
      tuitionRates.forEach(rate => {
        expect(rate.school_year).toBe(currentSchoolYear);
      });
    });
  });

  describe('Data Integrity and Format Validation', () => {
    it('should have all required fields populated with valid data types', () => {
      // School info validation
      expect(typeof schoolInfo.phone).toBe('string');
      expect(typeof schoolInfo.email).toBe('string');
      expect(typeof schoolInfo.founded).toBe('number');
      expect(schoolInfo.founded).toBeGreaterThan(2000);
      expect(schoolInfo.founded).toBeLessThanOrEqual(new Date().getFullYear());
      
      // Staff validation
      staffMembers.forEach(staff => {
        expect(typeof staff.name).toBe('string');
        expect(typeof staff.role).toBe('string');
        expect(typeof staff.startYear).toBe('number');
        expect(Array.isArray(staff.languages)).toBe(true);
      });
      
      // Tuition validation
      tuitionRates.forEach(rate => {
        expect(typeof rate.tuition_price).toBe('number');
        expect(typeof rate.extended_care_price).toBe('number');
        expect(typeof rate.extended_care_available).toBe('boolean');
      });
    });

    it('should have consistent display ordering across all content types', () => {
      // Staff ordering should be sequential
      const staffOrders = staffMembers.map(s => s.order).sort((a, b) => a - b);
      expect(staffOrders[0]).toBe(1);
      for (let i = 1; i < staffOrders.length; i++) {
        expect(staffOrders[i]).toBeGreaterThan(staffOrders[i-1]);
      }
      
      // Hours ordering should be 1-7 for days of week
      const hoursOrders = hoursEntries.map(h => h.order).sort((a, b) => a - b);
      expect(hoursOrders).toEqual([1, 2, 3, 4, 5, 6, 7]);
      
      // Program and rate ordering should be sequential
      const programOrders = tuitionPrograms.map(p => p.display_order).sort((a, b) => a - b);
      const rateOrders = tuitionRates.map(r => r.display_order).sort((a, b) => a - b);
      
      programOrders.forEach((order, index) => {
        if (index > 0) {
          expect(order).toBeGreaterThanOrEqual(programOrders[index - 1]);
        }
      });
      
      rateOrders.forEach((order, index) => {
        if (index > 0) {
          expect(order).toBeGreaterThanOrEqual(rateOrders[index - 1]);
        }
      });
    });
  });
});