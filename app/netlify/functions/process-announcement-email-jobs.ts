import type { Handler } from '@netlify/functions';
import { processDueAnnouncementEmailJobs } from '../../src/lib/announcement-email';

export const config = {
  schedule: '*/15 * * * *'
};

export const handler: Handler = async () => {
  try {
    const summary = await processDueAnnouncementEmailJobs({ limit: 40 });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        summary,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process announcement email jobs',
        timestamp: new Date().toISOString()
      })
    };
  }
};
