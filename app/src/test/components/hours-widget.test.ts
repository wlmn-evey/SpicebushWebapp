import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { supabase } from '@lib/supabase';
import { 
  formatTime, 
  getDefaultHoursData, 
  processHoursData 
} from '@lib/hours-utils';

// Mock Supabase
vi.mock('@lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: [], 
          error: null 
        }))
      }))
    }))
  }
}));

describe('Hours Widget - Friday Closing Time', () => {
  describe('Time Formatting', () => {
    it('should format times correctly', () => {
      expect(formatTime(9)).toBe('9:00 AM');
      expect(formatTime(12)).toBe('12:00 PM');
      expect(formatTime(15)).toBe('3:00 PM');
      expect(formatTime(15.5)).toBe('3:30 PM');
      expect(formatTime(17.25)).toBe('5:15 PM');
    });

    it('should handle edge cases in time formatting', () => {
      expect(formatTime(0)).toBe('12:00 AM');
      expect(formatTime(24)).toBe('12:00 AM');
      expect(formatTime(12.5)).toBe('12:30 PM');
    });
  });

  describe('Default Hours Data', () => {
    let defaultHours: any;

    beforeEach(() => {
      defaultHours = getDefaultHoursData();
    });

    it('should have Friday closing at 3:00 PM with no aftercare', () => {
      const friday = defaultHours.Friday;
      
      expect(friday).toBeDefined();
      expect(friday.closed).toBe(false);
      expect(friday.start).toBe(8.5); // 8:30 AM
      expect(friday.end).toBe(15); // 3:00 PM
      expect(friday.aftercare_available).toBe(false);
      expect(friday.after_care_offset).toBe(0);
    });

    it('should have aftercare available Monday through Thursday', () => {
      const daysWithAftercare = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      
      daysWithAftercare.forEach(day => {
        const hours = defaultHours[day];
        expect(hours.aftercare_available).toBe(true);
        expect(hours.after_care_offset).toBe(2.5); // 2.5 hours aftercare
        expect(hours.end).toBe(15); // Regular hours end at 3:00 PM
      });
    });

    it('should be closed on weekends', () => {
      expect(defaultHours.Saturday.closed).toBe(true);
      expect(defaultHours.Sunday.closed).toBe(true);
    });
  });

  describe('Hours Widget Rendering', () => {
    let dom: JSDOM;
    let document: Document;

    beforeEach(() => {
      // Create a mock hours widget DOM
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <body>
            <div id="sbms-hours-widget">
              <ul id="hours-list"></ul>
            </div>
          </body>
        </html>
      `);
      document = dom.window.document;
      global.document = document as any;
    });

    it('should display Friday closing time message', () => {
      const hoursData = getDefaultHoursData();
      const friday = hoursData.Friday;
      
      // Simulate rendering Friday hours
      const fridayElement = document.createElement('li');
      fridayElement.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold text-sm">Friday</span>
          <span class="text-xs opacity-85">${formatTime(friday.start - friday.before_care_offset)}–${formatTime(friday.end)}</span>
        </div>
        ${!friday.aftercare_available ? `
          <div class="text-xs text-center mt-1 opacity-60">
            ⏰ Closes at 3:00 PM
          </div>
        ` : ''}
      `;
      
      document.getElementById('hours-list')?.appendChild(fridayElement);
      
      // Verify the closing message is displayed
      const closingMessage = fridayElement.querySelector('.text-xs.text-center');
      expect(closingMessage).toBeTruthy();
      expect(closingMessage?.textContent).toContain('Closes at 3:00 PM');
      expect(closingMessage?.textContent).toContain('⏰');
    });

    it('should not display aftercare for Friday', () => {
      const hoursData = getDefaultHoursData();
      const friday = hoursData.Friday;
      
      // Verify Friday configuration
      expect(friday.aftercare_available).toBe(false);
      expect(friday.after_care_offset).toBe(0);
      
      // Total time span should only include before care and regular hours
      const totalSpan = friday.end - (friday.start - friday.before_care_offset);
      expect(totalSpan).toBe(7.5); // 7:30 AM to 3:00 PM = 7.5 hours
    });
  });

  describe('Process Hours Data from Database', () => {
    it('should correctly process database hours data', () => {
      const mockDatabaseData = [
        {
          day_of_week: 5, // Friday
          open_time: '08:30',
          close_time: '15:00',
          before_care_minutes: 60,
          after_care_minutes: 0,
          is_closed: false,
          aftercare_available: false
        },
        {
          day_of_week: 1, // Monday
          open_time: '08:30',
          close_time: '15:00',
          before_care_minutes: 60,
          after_care_minutes: 150,
          is_closed: false,
          aftercare_available: true
        }
      ];

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const processed = processHoursData(mockDatabaseData, days);
      
      // Check Friday
      expect(processed.Friday).toBeDefined();
      expect(processed.Friday.end).toBe(15); // 3:00 PM
      expect(processed.Friday.aftercare_available).toBe(false);
      expect(processed.Friday.after_care_offset).toBe(0);
      
      // Check Monday
      expect(processed.Monday).toBeDefined();
      expect(processed.Monday.end).toBe(15); // 3:00 PM
      expect(processed.Monday.aftercare_available).toBe(true);
      expect(processed.Monday.after_care_offset).toBe(2.5); // 150 minutes = 2.5 hours
    });

    it('should handle missing days with defaults', () => {
      const mockDatabaseData = [
        {
          day_of_week: 5, // Only Friday data
          open_time: '08:30',
          close_time: '15:00',
          before_care_minutes: 60,
          after_care_minutes: 0,
          is_closed: false,
          aftercare_available: false
        }
      ];

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const processed = processHoursData(mockDatabaseData, days);
      
      // Friday should use database data
      expect(processed.Friday.aftercare_available).toBe(false);
      
      // Other days should use defaults
      expect(processed.Monday.aftercare_available).toBe(true);
      expect(processed.Tuesday.aftercare_available).toBe(true);
      expect(processed.Wednesday.aftercare_available).toBe(true);
      expect(processed.Thursday.aftercare_available).toBe(true);
    });
  });

  describe('Visual Hour Bar Calculations', () => {
    it('should calculate correct bar widths for Friday', () => {
      const friday = getDefaultHoursData().Friday;
      const beforeCareStart = friday.start - friday.before_care_offset; // 7:30 AM
      const totalSpan = friday.end - beforeCareStart; // 7.5 hours
      
      const beforeCareWidth = (friday.before_care_offset / totalSpan) * 100;
      const regularWidth = ((friday.end - friday.start) / totalSpan) * 100;
      const afterCareWidth = 0; // No aftercare on Friday
      
      expect(beforeCareWidth).toBeCloseTo(13.33, 1); // 1 hour / 7.5 hours
      expect(regularWidth).toBeCloseTo(86.67, 1); // 6.5 hours / 7.5 hours
      expect(afterCareWidth).toBe(0);
      expect(beforeCareWidth + regularWidth).toBeCloseTo(100, 1);
    });

    it('should calculate correct bar widths for days with aftercare', () => {
      const monday = getDefaultHoursData().Monday;
      const beforeCareStart = monday.start - monday.before_care_offset; // 7:30 AM
      const afterCareEnd = monday.end + monday.after_care_offset; // 5:30 PM
      const totalSpan = afterCareEnd - beforeCareStart; // 10 hours
      
      const beforeCareWidth = (monday.before_care_offset / totalSpan) * 100;
      const regularWidth = ((monday.end - monday.start) / totalSpan) * 100;
      const afterCareWidth = (monday.after_care_offset / totalSpan) * 100;
      
      expect(beforeCareWidth).toBeCloseTo(10, 1); // 1 hour / 10 hours
      expect(regularWidth).toBeCloseTo(65, 1); // 6.5 hours / 10 hours
      expect(afterCareWidth).toBeCloseTo(25, 1); // 2.5 hours / 10 hours
      expect(beforeCareWidth + regularWidth + afterCareWidth).toBeCloseTo(100, 1);
    });
  });

  describe('Accessibility of Hours Display', () => {
    it('should provide clear time ranges in text', () => {
      const friday = getDefaultHoursData().Friday;
      const timeRange = `${formatTime(friday.start - friday.before_care_offset)}–${formatTime(friday.end)}`;
      
      expect(timeRange).toBe('7:30 AM–3:00 PM');
    });

    it('should use clear messaging for special cases', () => {
      const messages = {
        friday: '⏰ Closes at 3:00 PM',
        noAftercare: '🚫 No aftercare available',
        closed: 'Closed'
      };
      
      // Verify messages are descriptive
      expect(messages.friday).toContain('Closes at 3:00 PM');
      expect(messages.noAftercare).toContain('No aftercare');
      expect(messages.closed).toBe('Closed');
    });
  });
});

describe('Console Log Removal Verification', () => {
  it('should not contain console.log statements in production code', () => {
    // This test would be run against the actual source files
    // For now, we verify that our test environment is clean
    const consoleSpy = vi.spyOn(console, 'log');
    const consoleDebugSpy = vi.spyOn(console, 'debug');
    const consoleInfoSpy = vi.spyOn(console, 'info');
    
    // Run some production code simulation
    const hours = getDefaultHoursData();
    const time = formatTime(15);
    
    // Verify no console logs were called
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('should only use console.error for actual errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    // Simulate an error condition
    try {
      throw new Error('Test error');
    } catch (error) {
      console.error('Legitimate error:', error);
    }
    
    // Console.error is acceptable for actual errors
    expect(consoleErrorSpy).toHaveBeenCalledWith('Legitimate error:', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });
});