/**
 * Content database adapter with performance optimizations
 * This module provides a consistent API for accessing content with caching
 * Uses high-performance caching layer for optimal loading times
 */

// Re-export optimized cached functions by default
export {
  getCollection,
  getEntry,
  getAllSettings,
  getSetting,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  cacheUtils
} from './content-cache';

// Re-export direct functions for special cases and admin operations
export {
  getCollectionDirect,
  getEntryDirect,
  getAllSettingsDirect,
  getSettingDirect,
  getEntries,
  getSchoolInfo,
  getRecentMessages,
  getCommunicationStats,
  getTemplates,
  getNewsletterSubscribers,  
  getNewsletterStats
} from './content-db-direct';

// Re-export types
export type { ContentEntry } from './content-db-direct';