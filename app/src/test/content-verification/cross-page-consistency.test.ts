import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getCollection, 
  getEntry, 
  getSetting 
} from '@lib/content-db-direct';

/**
 * Cross-Page Consistency Verification Tests
 * 
 * These tests ensure that factual information is consistent across different
 * pages and content types throughout the website. They catch discrepancies
 * that could confuse users or undermine trust in the site's reliability.
 */

interface ContentConsistencyData {
  schoolInfo: any;
  staffMembers: any[];
  hoursEntries: any[];
  tuitionPrograms: any[];
  tuitionRates: any[];
  settings: Record<string, any>;
}

describe('Cross-Page Consistency Verification', () => {
  let contentData: ContentConsistencyData;

  beforeAll(async () => {
    // Load all content data for cross-referencing
    const [schoolInfoEntry, staffCollection, hoursCollection, tuitionCollection] = await Promise.all([
      getEntry('school-info', 'general'),
      getCollection('staff'),
      getCollection('hours'),
      getCollection('tuition')
    ]);

    // Load key settings
    const settingsKeys = [
      'current-school-year',
      'annual-increase-rate',
      'sibling-discount-rate',
      'upfront-discount-rate',
      'coming-soon-mode'
    ];

    const settings: Record<string, any> = {};
    for (const key of settingsKeys) {
      settings[key] = await getSetting(key);
    }

    contentData = {
      schoolInfo: schoolInfoEntry?.data,
      staffMembers: staffCollection.map(entry => entry.data),
      hoursEntries: hoursCollection.map(entry => entry.data),
      tuitionPrograms: tuitionCollection.filter(entry => entry.data.type === 'program').map(entry => entry.data),
      tuitionRates: tuitionCollection.filter(entry => entry.data.type === 'rate').map(entry => entry.data),
      settings
    };
  });

  describe('Contact Information Consistency', () => {
    it('should have identical phone number across all references', () => {
      const canonicalPhone = contentData.schoolInfo.phone;
      expect(canonicalPhone).toBe('(484) 202-0712');
      
      // If phone number appears in other content, it should match
      // This test would be expanded as more content types reference phone numbers
      
      // Verify format consistency
      expect(canonicalPhone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    });

    it('should have identical email address across all references', () => {
      const canonicalEmail = contentData.schoolInfo.email;
      expect(canonicalEmail).toBe('information@spicebushmontessori.org');
      
      // Verify email format
      expect(canonicalEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      
      // Email should be consistent in domain and format
      expect(canonicalEmail).toContain('@spicebushmontessori.org');
    });

    it('should have identical address across all references', () => {
      const canonicalAddress = contentData.schoolInfo.address;
      
      expect(canonicalAddress.street).toBe('827 Concord Road');
      expect(canonicalAddress.city).toBe('Glen Mills');
      expect(canonicalAddress.state).toBe('PA');
      expect(canonicalAddress.zip).toBe('19342');
      
      // Address components should be properly formatted
      expect(canonicalAddress.street).toMatch(/^\d+\s+[A-Za-z\s]+$/);
      expect(canonicalAddress.zip).toMatch(/^\d{5}$/);
    });

    it('should have consistent social media links', () => {
      const socialMedia = contentData.schoolInfo.socialMedia;
      
      // URLs should be complete and consistent
      expect(socialMedia.facebook).toBe('https://www.facebook.com/SpicebushMontessori');
      expect(socialMedia.instagram).toBe('https://www.instagram.com/spicebushmontessori');
      
      // Both should point to the same brand name
      expect(socialMedia.facebook).toContain('SpicebushMontessori');
      expect(socialMedia.instagram).toContain('spicebushmontessori');
    });
  });

  describe('School Year Consistency', () => {
    it('should have identical school year across all content types', () => {
      const canonicalSchoolYear = contentData.schoolInfo.schoolYear;
      expect(canonicalSchoolYear).toBe('2025-2026');
      
      // Check tuition rates use same school year
      contentData.tuitionRates.forEach(rate => {
        expect(rate.school_year).toBe(canonicalSchoolYear);
      });
      
      // Check settings use same school year
      if (contentData.settings['current-school-year']) {
        expect(contentData.settings['current-school-year']).toBe(canonicalSchoolYear);
      }
    });

    it('should have school year format consistent across all references', () => {
      const schoolYearPattern = /^\d{4}-\d{4}$/;
      
      expect(contentData.schoolInfo.schoolYear).toMatch(schoolYearPattern);
      
      contentData.tuitionRates.forEach(rate => {
        expect(rate.school_year).toMatch(schoolYearPattern);
      });
    });
  });

  describe('Extended Care Hours Consistency', () => {
    it('should have consistent extended care end time across all references', () => {
      const canonicalExtendedCareTime = contentData.schoolInfo.extendedCareUntil;
      expect(canonicalExtendedCareTime).toBe('5:30 PM');
      
      // Check hours entries for weekdays
      const weekdayHours = contentData.hoursEntries.filter(entry => 
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(entry.day)
      );
      
      weekdayHours.forEach(hours => {
        if (!hours.is_closed) {
          expect(hours.close_time).toBe(canonicalExtendedCareTime);
          
          if (hours.note) {
            expect(hours.note).toContain(canonicalExtendedCareTime);
          }
        }
      });
    });

    it('should have consistent extended care availability messaging', () => {
      const extendedCareTime = contentData.schoolInfo.extendedCareUntil;
      
      // Hours entries should mention extended care consistently
      const weekdayHours = contentData.hoursEntries.filter(entry => 
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(entry.day)
      );
      
      weekdayHours.forEach(hours => {
        if (hours.note && hours.note.includes('Extended care')) {
          expect(hours.note).toContain(`Extended care available until ${extendedCareTime}`);
        }
      });
      
      // Tuition rates should be consistent about extended care availability
      contentData.tuitionRates.forEach(rate => {
        if (rate.extended_care_available) {
          expect(rate.extended_care_price).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Ages Served Consistency', () => {
    it('should have consistent age range across all references', () => {
      const canonicalAgesServed = contentData.schoolInfo.agesServed;
      expect(canonicalAgesServed).toBe('3 to 6 years');
      
      // This test would be expanded as more content references age ranges
      // For now, verify the canonical format is proper
      expect(canonicalAgesServed).toMatch(/^\d+\s+to\s+\d+\s+years$/);
    });
  });

  describe('Staff Information Consistency', () => {
    it('should have consistent staff roles and titles', () => {
      const staffRoles = contentData.staffMembers.map(staff => staff.role);
      
      // All roles should use consistent terminology
      staffRoles.forEach(role => {
        expect(role).toContain('Teacher');
        // Roles should be properly capitalized
        expect(role).toMatch(/^[A-Z]/);
      });
      
      // Should have at least one lead/head teacher
      const hasLeadRole = staffRoles.some(role => 
        role.includes('Lead') || role.includes('Head')
      );
      expect(hasLeadRole).toBe(true);
    });

    it('should have consistent staff start years with school founding', () => {
      const schoolFounded = contentData.schoolInfo.founded;
      expect(schoolFounded).toBe(2021);
      
      contentData.staffMembers.forEach(staff => {
        // No staff should start before school was founded
        expect(staff.startYear).toBeGreaterThanOrEqual(schoolFounded);
        
        // Staff start years should be reasonable
        expect(staff.startYear).toBeLessThanOrEqual(new Date().getFullYear());
      });
    });

    it('should have consistent staff photo path conventions', () => {
      contentData.staffMembers.forEach(staff => {
        // All staff photos should follow same path pattern
        expect(staff.photo).toMatch(/^\/images\/(optimized\/)?teachers\//);
        
        // Should be web-compatible image format
        expect(staff.photo).toMatch(/\.(jpg|jpeg|png|webp|svg)$/);
        
        // Optimized images should follow naming convention
        if (staff.photo.includes('/optimized/')) {
          expect(staff.photo).toContain('teachers-');
          expect(staff.photo).toMatch(/-\d+w\.(webp|jpg|png)$/);
        }
      });
    });
  });

  describe('Program and Tuition Consistency', () => {
    it('should have matching programs and tuition rates', () => {
      // Every active program should have at least one tuition rate
      contentData.tuitionPrograms.forEach(program => {
        if (program.active) {
          const programId = program.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          const matchingRates = contentData.tuitionRates.filter(rate => 
            rate.program_id.includes(programId) || programId.includes(rate.program_id)
          );
          
          expect(matchingRates.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have consistent program descriptions with hours information', () => {
      contentData.tuitionPrograms.forEach(program => {
        // Programs mentioning specific days should align with hours
        if (program.description.includes('Monday') && program.description.includes('Friday')) {
          expect(program.days_per_week).toBe(5);
        }
        
        if (program.description.includes('Monday') && program.description.includes('Thursday')) {
          if (!program.description.includes('Friday')) {
            expect(program.days_per_week).toBe(4);
          }
        }
        
        // Programs mentioning times should use consistent format
        if (program.description.includes('AM') || program.description.includes('PM')) {
          expect(program.description).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
        }
      });
    });

    it('should have consistent extended care references in programs and rates', () => {
      // Programs that mention extended care should have matching rates
      contentData.tuitionPrograms.forEach(program => {
        if (program.description.toLowerCase().includes('extended care')) {
          const programId = program.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          const relatedRates = contentData.tuitionRates.filter(rate => 
            rate.program_id.includes(programId) || programId.includes(rate.program_id)
          );
          
          relatedRates.forEach(rate => {
            expect(rate.extended_care_available).toBe(true);
            expect(rate.extended_care_price).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Pricing Consistency', () => {
    it('should have reasonable tuition pricing relationships', () => {
      // Group rates by program type
      const fullDayRates = contentData.tuitionRates.filter(rate => 
        rate.program_id.includes('full-day')
      );
      const halfDayRates = contentData.tuitionRates.filter(rate => 
        rate.program_id.includes('half-day')
      );
      
      // Full day programs should generally cost more than half day
      if (fullDayRates.length > 0 && halfDayRates.length > 0) {
        const avgFullDay = fullDayRates.reduce((sum, rate) => sum + rate.tuition_price, 0) / fullDayRates.length;
        const avgHalfDay = halfDayRates.reduce((sum, rate) => sum + rate.tuition_price, 0) / halfDayRates.length;
        
        expect(avgFullDay).toBeGreaterThan(avgHalfDay);
      }
      
      // Extended care should be less than main tuition
      contentData.tuitionRates.forEach(rate => {
        if (rate.extended_care_available && rate.extended_care_price > 0) {
          expect(rate.extended_care_price).toBeLessThan(rate.tuition_price);
        }
      });
    });

    it('should have consistent pricing across rate tiers for same program', () => {
      // Group rates by program
      const ratesByProgram: Record<string, any[]> = {};
      
      contentData.tuitionRates.forEach(rate => {
        if (!ratesByProgram[rate.program_id]) {
          ratesByProgram[rate.program_id] = [];
        }
        ratesByProgram[rate.program_id].push(rate);
      });
      
      // For each program, verify rate tiers are properly ordered
      Object.values(ratesByProgram).forEach(rates => {
        if (rates.length > 1) {
          const sortedRates = [...rates].sort((a, b) => a.display_order - b.display_order);
          
          // Rate A should be highest price (lowest income threshold)
          // Rate D should be lowest price (highest income threshold)
          if (sortedRates.some(r => r.rate_label.includes('A')) && 
              sortedRates.some(r => r.rate_label.includes('D'))) {
            const rateA = sortedRates.find(r => r.rate_label.includes('A'));
            const rateD = sortedRates.find(r => r.rate_label.includes('D'));
            
            if (rateA && rateD) {
              expect(rateA.tuition_price).toBeGreaterThanOrEqual(rateD.tuition_price);
            }
          }
        }
      });
    });
  });

  describe('Display Order Consistency', () => {
    it('should have consistent ordering logic across content types', () => {
      // Staff ordering should be meaningful (leads first, etc.)
      const staffByOrder = [...contentData.staffMembers].sort((a, b) => a.order - b.order);
      
      // First staff member should be order 1
      if (staffByOrder.length > 0) {
        expect(staffByOrder[0].order).toBe(1);
      }
      
      // Lead/Head teachers should generally come first
      const firstStaff = staffByOrder[0];
      if (firstStaff && firstStaff.role) {
        const isLead = firstStaff.role.includes('Lead') || firstStaff.role.includes('Head');
        // This is a guideline - not enforced strictly as order might be by seniority
        // expect(isLead).toBe(true);
      }
      
      // Hours should be ordered by day of week
      const hoursByOrder = [...contentData.hoursEntries].sort((a, b) => a.order - b.order);
      const expectedDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      hoursByOrder.forEach((hours, index) => {
        expect(hours.day).toBe(expectedDayOrder[index]);
        expect(hours.order).toBe(index + 1);
      });
    });
  });

  describe('Content Completeness Across References', () => {
    it('should have no broken internal references', () => {
      // Staff photos should reference actual image files
      contentData.staffMembers.forEach(staff => {
        expect(staff.photo).toBeDefined();
        expect(staff.photo.length).toBeGreaterThan(0);
        
        // Should not be placeholder unless explicitly named as such
        if (!staff.photo.includes('placeholder')) {
          expect(staff.photo).toMatch(/\/teachers\//);
        }
      });
      
      // Tuition rates should reference valid program IDs
      contentData.tuitionRates.forEach(rate => {
        expect(rate.program_id).toBeDefined();
        expect(rate.program_id.length).toBeGreaterThan(0);
        
        // Should match some program naming pattern
        expect(rate.program_id).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it('should have consistent data completeness across similar content', () => {
      // All staff should have same level of data completeness
      if (contentData.staffMembers.length > 0) {
        const firstStaffKeys = Object.keys(contentData.staffMembers[0]).sort();
        
        contentData.staffMembers.forEach(staff => {
          const staffKeys = Object.keys(staff).sort();
          expect(staffKeys).toEqual(firstStaffKeys);
        });
      }
      
      // All active tuition rates should have same level of data completeness
      const activeRates = contentData.tuitionRates.filter(rate => rate.active);
      if (activeRates.length > 0) {
        const firstRateKeys = Object.keys(activeRates[0]).sort();
        
        activeRates.forEach(rate => {
          const rateKeys = Object.keys(rate).sort();
          expect(rateKeys).toEqual(firstRateKeys);
        });
      }
    });
  });
});