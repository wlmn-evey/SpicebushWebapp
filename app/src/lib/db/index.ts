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
import { getContactSubmissions } from './contact-submissions';
import { recordAnalyticsEvent, getAnalyticsOverview, getRecentAnalyticsEvents } from './analytics';

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
  contact: {
    getContactSubmissions
  },
  analytics: {
    recordAnalyticsEvent,
    getAnalyticsOverview,
    getRecentAnalyticsEvents
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
export { getContactSubmissions } from './contact-submissions';
export { recordAnalyticsEvent, getAnalyticsOverview, getRecentAnalyticsEvents } from './analytics';
export { getPublicClient, getServiceClient, withServiceClient } from './client';
