/**
 * @deprecated Caching is now handled within the database layer.
 * Import from `@lib/db` instead. This file remains as a compatibility shim.
 */
export {
  getCollection,
  getEntry,
  getAllSettings,
  getSetting,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  cacheUtils
} from './db';
