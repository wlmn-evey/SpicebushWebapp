/**
 * Date utility functions for safe date handling across the application
 * These functions provide robust date parsing and formatting with graceful error handling
 */

/**
 * Safely parses a date from various input formats
 * @param date - The date input (Date object, string, number, or any)
 * @returns A valid Date object or null if parsing fails
 * 
 * @example
 * safeParseDate('2024-01-15') // Returns: Date object
 * safeParseDate(new Date()) // Returns: Date object
 * safeParseDate('invalid') // Returns: null
 */
export function safeParseDate(date: any): Date | null {
  if (!date) {
    return null;
  }

  // If already a valid Date object, return it
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }

  // Try to parse string or number inputs
  try {
    const parsed = new Date(date);
    
    // Check if the parsed date is valid
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (error) {
    // Parsing failed, will return null
  }

  return null;
}

/**
 * Formats a date for display with graceful fallback
 * @param date - The date input to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string or fallback text
 * 
 * @example
 * formatBlogDate('2024-01-15') // Returns: "Jan 15, 2024"
 * formatBlogDate('invalid') // Returns: "Date unavailable"
 */
export function formatBlogDate(
  date: any, 
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return 'Date unavailable';
  }

  try {
    return parsedDate.toLocaleDateString('en-US', options);
  } catch (error) {
    // Fallback if locale formatting fails
    return parsedDate.toDateString();
  }
}

/**
 * Safely gets ISO string representation of a date
 * @param date - The date input
 * @returns ISO string or empty string as fallback
 * 
 * @example
 * getISOString('2024-01-15') // Returns: "2024-01-15T00:00:00.000Z"
 * getISOString('invalid') // Returns: ""
 */
export function getISOString(date: any): string {
  const parsedDate = safeParseDate(date);
  
  if (!parsedDate) {
    return '';
  }

  try {
    return parsedDate.toISOString();
  } catch (error) {
    // Return empty string if conversion fails
    return '';
  }
}

/**
 * Compares two dates for sorting
 * @param a - First date
 * @param b - Second date
 * @param descending - Sort in descending order (newest first)
 * @returns Comparison result for Array.sort()
 */
export function compareDates(a: any, b: any, descending: boolean = true): number {
  const dateA = safeParseDate(a);
  const dateB = safeParseDate(b);
  
  // Handle null dates by placing them at the end
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  
  const comparison = dateA.getTime() - dateB.getTime();
  return descending ? -comparison : comparison;
}