/**
 * @deprecated Use `db` from `@lib/db`. This module proxies the Netlify DB implementation
 * to preserve backwards compatibility while the codebase migrates.
 */
export {
  getCollection,
  getEntry,
  getEntries,
  getAllSettings,
  getSetting,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  getSchoolInfo,
  cacheUtils,
  getCollectionDirect,
  getEntryDirect,
  getAllSettingsDirect,
  getSettingDirect
} from './db';

export { getRecentMessages, getCommunicationStats, getTemplates } from './db';
export type { ContentEntry } from './db';
