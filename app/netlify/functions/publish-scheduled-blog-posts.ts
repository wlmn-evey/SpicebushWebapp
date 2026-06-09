import type { Handler } from '@netlify/functions';
import { publishDueScheduledPosts } from '../../src/lib/blog-scheduled-publish';

// Every 5 minutes (R3-F12): by-design visibility lag (the 5-min collection TTL) never produces a
// visibly-overdue post. In-file `export const config` schedule, mirroring the existing
// process-announcement-email-jobs cron — not netlify.toml (R1-F14).
export const config = {
  schedule: '*/5 * * * *'
};

export const handler: Handler = async () => {
  try {
    const summary = await publishDueScheduledPosts();
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
        error: error instanceof Error ? error.message : 'Failed to publish scheduled blog posts',
        timestamp: new Date().toISOString()
      })
    };
  }
};
