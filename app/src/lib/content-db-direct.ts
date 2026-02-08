/**
 * @deprecated Direct PostgreSQL access has been replaced with shared Netlify DB helpers.
 * Import from `@lib/db` instead. This file now proxies to the unified implementation.
 */
export {
  getCollection,
  getEntry,
  getEntries,
  getAllSettings,
  getSetting,
  getCollectionDirect,
  getEntryDirect,
  getAllSettingsDirect,
  getSettingDirect,
  getRecentMessages,
  getCommunicationStats,
  getTemplates
} from './db';

export type { ContentEntry } from './db';
