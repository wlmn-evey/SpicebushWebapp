import { getPublicClient, getServiceClient, withServiceClient } from './client';
import {
  getCollection,
  getEntry,
  getEntries,
  getAllSettings,
  getSetting,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  getSchoolInfo,
  cacheUtils
} from './content';
import { getRecentMessages, getCommunicationStats, getTemplates } from './communications';

export const db = {
  content: {
    getCollection,
    getEntry,
    getEntries,
    getAllSettings,
    getSetting,
    getBatchedPageData,
    getHomepageData,
    getAdminData,
    getSchoolInfo
  },
  cache: cacheUtils,
  communications: {
    getRecentMessages,
    getCommunicationStats,
    getTemplates
  },
  raw: {
    getPublicClient,
    getServiceClient,
    withServiceClient
  }
};

export type { ContentEntry } from './types';
export {
  getCollection,
  getCollectionDirect,
  getEntry,
  getEntryDirect,
  getEntries,
  getAllSettings,
  getAllSettingsDirect,
  getSetting,
  getSettingDirect,
  getBatchedPageData,
  getHomepageData,
  getAdminData,
  getSchoolInfo,
  cacheUtils
} from './content';

export { getRecentMessages, getCommunicationStats, getTemplates } from './communications';
export { getPublicClient, getServiceClient, withServiceClient } from './client';
