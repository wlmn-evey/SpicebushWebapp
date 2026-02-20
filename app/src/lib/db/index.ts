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
import {
  getAdSpendSummary,
  getRecentAdSpendEntries,
  insertAdSpendEntries,
  deleteAdSpendEntry,
  getCampaignValueRows
} from './ad-spend';
import {
  getCampAdminData,
  getPublishedCampWeeks,
  getCampPromotionSummary,
  createCampSeason,
  updateCampSeason,
  createCampWeek,
  updateCampWeek,
  deleteCampWeek,
  adjustCampWeekSeats,
  replaceCampWeekVariantsFromLines
} from './camp';
import {
  getActiveAnnouncements,
  getScheduleExceptionsInRange,
  getAnnouncementAdminData,
  createSchoolAnnouncement,
  updateSchoolAnnouncement,
  deleteSchoolAnnouncement,
  createScheduleException,
  updateScheduleException,
  deleteScheduleException
} from './announcements';

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
  adSpend: {
    getAdSpendSummary,
    getRecentAdSpendEntries,
    insertAdSpendEntries,
    deleteAdSpendEntry,
    getCampaignValueRows
  },
  camp: {
    getCampAdminData,
    getPublishedCampWeeks,
    getCampPromotionSummary,
    createCampSeason,
    updateCampSeason,
    createCampWeek,
    updateCampWeek,
    deleteCampWeek,
    adjustCampWeekSeats,
    replaceCampWeekVariantsFromLines
  },
  announcements: {
    getActiveAnnouncements,
    getScheduleExceptionsInRange,
    getAnnouncementAdminData,
    createSchoolAnnouncement,
    updateSchoolAnnouncement,
    deleteSchoolAnnouncement,
    createScheduleException,
    updateScheduleException,
    deleteScheduleException
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
export {
  getAdSpendSummary,
  getRecentAdSpendEntries,
  insertAdSpendEntries,
  deleteAdSpendEntry,
  getCampaignValueRows
} from './ad-spend';
export {
  getCampAdminData,
  getPublishedCampWeeks,
  getCampPromotionSummary,
  createCampSeason,
  updateCampSeason,
  createCampWeek,
  updateCampWeek,
  deleteCampWeek,
  adjustCampWeekSeats,
  replaceCampWeekVariantsFromLines
} from './camp';
export {
  getActiveAnnouncements,
  getScheduleExceptionsInRange,
  getAnnouncementAdminData,
  createSchoolAnnouncement,
  updateSchoolAnnouncement,
  deleteSchoolAnnouncement,
  createScheduleException,
  updateScheduleException,
  deleteScheduleException
} from './announcements';
export { getPublicClient, getServiceClient, withServiceClient } from './client';
