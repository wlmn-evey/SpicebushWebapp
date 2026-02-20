import { SignJWT, importPKCS8 } from 'jose';

const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GA4_REPORT_ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  data: Ga4OverviewReport;
};

const reportCache = new Map<string, CacheEntry>();

const asString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toInteger = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const readEnv = (key: string): string => {
  const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const runtimeValue = runtimeEnv?.[key];
  if (typeof runtimeValue === 'string' && runtimeValue.trim().length > 0) {
    return runtimeValue.trim();
  }

  const meta = import.meta as unknown;
  if (meta && typeof meta === 'object' && 'env' in (meta as Record<string, unknown>)) {
    const candidate = (meta as { env?: unknown }).env;
    if (candidate && typeof candidate === 'object') {
      const importEnv = candidate as Record<string, string | undefined>;
      const importValue = importEnv[key];
      if (typeof importValue === 'string' && importValue.trim().length > 0) {
        return importValue.trim();
      }
    }
  }

  return '';
};

type ServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
};

export interface Ga4TopPage {
  pagePath: string;
  views: number;
}

export interface Ga4CampaignRow {
  campaign: string;
  sourceMedium: string;
  sessions: number;
  eventCount: number;
}

export interface Ga4OverviewReport {
  available: boolean;
  windowDays: number;
  message: string;
  summary: {
    sessions: number;
    totalUsers: number;
    newUsers: number;
    pageViews: number;
    eventCount: number;
  };
  topPages: Ga4TopPage[];
  topCampaigns: Ga4CampaignRow[];
  fetchedAt: string | null;
}

const getServiceAccountCredentials = (): ServiceAccountCredentials | null => {
  const rawJson = readEnv('GA4_SERVICE_ACCOUNT_JSON');
  if (rawJson.length > 0) {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const clientEmail = asString(parsed.client_email);
      const privateKey = asString(parsed.private_key).replace(/\\n/g, '\n');
      if (clientEmail && privateKey) {
        return { clientEmail, privateKey };
      }
    } catch {
      // Fall back to split variables when JSON is present but malformed.
    }
  }

  const clientEmail = readEnv('GA4_SERVICE_ACCOUNT_EMAIL');
  const privateKey = readEnv('GA4_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey };
  }

  return null;
};

const requestAccessToken = async (credentials: ServiceAccountCredentials): Promise<string> => {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAtSeconds + 3600;

  const privateKey = await importPKCS8(credentials.privateKey, 'RS256');
  const assertion = await new SignJWT({ scope: GA4_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(credentials.clientEmail)
    .setSubject(credentials.clientEmail)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(privateKey);

  const tokenRequestBody = new URLSearchParams();
  tokenRequestBody.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  tokenRequestBody.set('assertion', assertion);

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenRequestBody
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text().catch(() => '');
    throw new Error(`Failed to obtain GA4 access token (${tokenResponse.status}): ${detail.slice(0, 180)}`);
  }

  const payload = await tokenResponse.json() as { access_token?: unknown };
  const accessToken = asString(payload.access_token);
  if (!accessToken) {
    throw new Error('GA4 access token response was missing access_token');
  }

  return accessToken;
};

type RunReportRequest = {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  metrics: Array<{ name: string }>;
  dimensions?: Array<{ name: string }>;
  limit?: string;
  orderBys?: Array<{
    metric?: {
      metricName: string;
    };
    desc?: boolean;
  }>;
};

type RunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

const runGa4Report = async (
  propertyId: string,
  accessToken: string,
  payload: RunReportRequest
): Promise<RunReportResponse> => {
  const response = await fetch(
    `${GA4_REPORT_ENDPOINT}/properties/${encodeURIComponent(propertyId)}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GA4 runReport failed (${response.status}): ${detail.slice(0, 220)}`);
  }

  return await response.json() as RunReportResponse;
};

const defaultReport = (windowDays: number, message: string): Ga4OverviewReport => ({
  available: false,
  windowDays,
  message,
  summary: {
    sessions: 0,
    totalUsers: 0,
    newUsers: 0,
    pageViews: 0,
    eventCount: 0
  },
  topPages: [],
  topCampaigns: [],
  fetchedAt: null
});

export async function getGa4OverviewReport(propertyIdInput: string, windowDaysInput: number): Promise<Ga4OverviewReport> {
  const propertyId = asString(propertyIdInput);
  const windowDays = Math.min(365, Math.max(1, Math.trunc(windowDaysInput)));
  const cacheKey = `${propertyId}:${windowDays}`;
  const now = Date.now();

  const cachedEntry = reportCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.data;
  }

  if (!propertyId) {
    return defaultReport(windowDays, 'Set GA4 property ID to load Google Analytics reporting.');
  }

  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    return defaultReport(
      windowDays,
      'GA4 credentials missing. Set GA4_SERVICE_ACCOUNT_JSON or GA4_SERVICE_ACCOUNT_EMAIL + GA4_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  try {
    const accessToken = await requestAccessToken(credentials);
    const dateRanges = [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }];

    const [summaryReport, topPagesReport, campaignsReport] = await Promise.all([
      runGa4Report(propertyId, accessToken, {
        dateRanges,
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'eventCount' }
        ]
      }),
      runGa4Report(propertyId, accessToken, {
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: '8',
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
      }),
      runGa4Report(propertyId, accessToken, {
        dateRanges,
        dimensions: [{ name: 'sessionCampaignName' }, { name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'eventCount' }],
        limit: '8',
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      })
    ]);

    const summaryRow = summaryReport.rows?.[0];
    const summaryMetrics = summaryRow?.metricValues ?? [];

    const report: Ga4OverviewReport = {
      available: true,
      windowDays,
      message: 'Loaded from Google Analytics Data API.',
      summary: {
        sessions: toInteger(summaryMetrics[0]?.value),
        totalUsers: toInteger(summaryMetrics[1]?.value),
        newUsers: toInteger(summaryMetrics[2]?.value),
        pageViews: toInteger(summaryMetrics[3]?.value),
        eventCount: toInteger(summaryMetrics[4]?.value)
      },
      topPages: (topPagesReport.rows ?? []).map((row) => ({
        pagePath: asString(row.dimensionValues?.[0]?.value) || '(not set)',
        views: toInteger(row.metricValues?.[0]?.value)
      })),
      topCampaigns: (campaignsReport.rows ?? []).map((row) => ({
        campaign: asString(row.dimensionValues?.[0]?.value) || '(not set)',
        sourceMedium: asString(row.dimensionValues?.[1]?.value) || '(not set)',
        sessions: toInteger(row.metricValues?.[0]?.value),
        eventCount: toInteger(row.metricValues?.[1]?.value)
      })),
      fetchedAt: new Date().toISOString()
    };

    reportCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      data: report
    });

    return report;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown GA4 error';
    return defaultReport(windowDays, `GA4 reporting unavailable: ${detail}`);
  }
}
