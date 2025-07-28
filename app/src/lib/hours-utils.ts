// Hours Widget Utilities
// Extracted from HoursWidget.astro to reduce complexity

interface HoursData {
  start: number;
  end: number;
  before_care_offset: number;
  after_care_offset: number;
  aftercare_available: boolean;
  closed: boolean;
}

interface Holiday {
  date: string;
  name: string;
  localName?: string;
}

// Format time helper with improved formatting
export function formatTime(value: number): string {
  if (value === 0) return '';
  
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  if (minutes === 0) {
    return `${displayHour} ${ampm}`;
  } else {
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
}

// Update current time display
export function updateCurrentTime(timeElement: HTMLElement): void {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  timeElement.textContent = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Fetch US holidays from public API
export async function fetchUpcomingHolidays(): Promise<Holiday[]> {
  try {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);
    
    const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${currentYear}/US`);
    
    if (!response.ok) {
      console.warn('Holiday API request failed, using fallback');
      return getFallbackHolidays(today, sevenDaysFromNow);
    }
    
    const allHolidays = await response.json();
    return allHolidays.filter((holiday: Holiday) => {
      const [year, month, day] = holiday.date.split('-').map(Number);
      const holidayDate = new Date(year, month - 1, day);
      return holidayDate >= today && holidayDate <= sevenDaysFromNow;
    });
    
  } catch (error) {
    console.error('Error fetching holidays from API:', error);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);
    
    return getFallbackHolidays(today, sevenDaysFromNow);
  }
}

// Fallback holiday data
function getFallbackHolidays(today: Date, sevenDaysFromNow: Date): Holiday[] {
  const currentYear = today.getFullYear();
  
  const commonHolidays = [
    { date: `${currentYear}-01-01`, name: "New Year's Day" },
    { date: `${currentYear}-01-15`, name: "Martin Luther King Jr. Day" },
    { date: `${currentYear}-02-19`, name: "Presidents Day" },
    { date: `${currentYear}-05-27`, name: "Memorial Day" },
    { date: `${currentYear}-07-04`, name: "Independence Day" },
    { date: `${currentYear}-09-02`, name: "Labor Day" },
    { date: `${currentYear}-10-14`, name: "Columbus Day" },
    { date: `${currentYear}-11-11`, name: "Veterans Day" },
    { date: `${currentYear}-11-28`, name: "Thanksgiving Day" },
    { date: `${currentYear}-12-25`, name: "Christmas Day" }
  ];
  
  return commonHolidays.filter(holiday => {
    const [year, month, day] = holiday.date.split('-').map(Number);
    const holidayDate = new Date(year, month - 1, day);
    return holidayDate >= today && holidayDate <= sevenDaysFromNow;
  });
}

// Get default hours data
export function getDefaultHoursData(): Record<string, HoursData> {
  return {
    Sunday: { start: 0, end: 0, before_care_offset: 0, after_care_offset: 0, aftercare_available: false, closed: true },
    Monday: { start: 8.5, end: 15, before_care_offset: 1, after_care_offset: 2.5, aftercare_available: true, closed: false },
    Tuesday: { start: 8.5, end: 15, before_care_offset: 1, after_care_offset: 2.5, aftercare_available: true, closed: false },
    Wednesday: { start: 8.5, end: 15, before_care_offset: 1, after_care_offset: 2.5, aftercare_available: true, closed: false },
    Thursday: { start: 8.5, end: 15, before_care_offset: 1, after_care_offset: 2.5, aftercare_available: true, closed: false },
    Friday: { start: 8.5, end: 15, before_care_offset: 1, after_care_offset: 0, aftercare_available: false, closed: false },
    Saturday: { start: 0, end: 0, before_care_offset: 0, after_care_offset: 0, aftercare_available: false, closed: true }
  };
}

// Helper function to get appropriate emoji for holidays
export function getHolidayEmoji(holidayName: string): string {
  const name = holidayName.toLowerCase();
  
  if (name.includes('new year')) return '🎊';
  if (name.includes('martin luther king')) return '✊';
  if (name.includes('president')) return '🇺🇸';
  if (name.includes('memorial')) return '🇺🇸';
  if (name.includes('independence') || name.includes('july')) return '🎆';
  if (name.includes('labor')) return '⚒️';
  if (name.includes('columbus')) return '⛵';
  if (name.includes('veteran')) return '🇺🇸';
  if (name.includes('thanksgiving')) return '🦃';
  if (name.includes('christmas')) return '🎄';
  
  return '🎉'; // Default holiday emoji
}

// Helper function to format holiday date
export function formatHolidayDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowMidnight = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (dateMidnight.getTime() === todayMidnight.getTime()) {
    return 'Today';
  } else if (dateMidnight.getTime() === tomorrowMidnight.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric' 
    });
  }
}

// Convert database hours to local format
export function processHoursData(dbHours: any[], days: string[]): Record<string, HoursData> {
  const hoursData: Record<string, HoursData> = {};
  
  if (dbHours && dbHours.length > 0) {
    dbHours.forEach(hour => {
      hoursData[hour.day_of_week] = {
        start: hour.start_time,
        end: hour.end_time,
        before_care_offset: hour.before_care_offset || 1,
        after_care_offset: hour.after_care_offset || 2.5,
        aftercare_available: hour.aftercare_available !== false,
        closed: hour.closed || false
      };
    });
    
    // Fill in any missing days with sensible defaults
    days.forEach(day => {
      if (!hoursData[day]) {
        const isWeekend = day === 'Saturday' || day === 'Sunday';
        hoursData[day] = {
          start: isWeekend ? 0 : 8.5,
          end: isWeekend ? 0 : 15,
          before_care_offset: isWeekend ? 0 : 1,
          after_care_offset: isWeekend ? 0 : 2.5,
          aftercare_available: !isWeekend && day !== 'Friday',
          closed: isWeekend
        };
      }
    });
    
    return hoursData;
  } else {
    return getDefaultHoursData();
  }
}