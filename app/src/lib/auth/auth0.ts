import { randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const AUTH0_STATE_COOKIE_NAME = 'sbms-auth0-state';
export const AUTH0_NONCE_COOKIE_NAME = 'sbms-auth0-nonce';
export const AUTH0_NEXT_PATH_COOKIE_NAME = 'sbms-auth0-next';

const AUTH0_STATE_TTL_SECONDS = 10 * 60;
const DEFAULT_AFTER_LOGIN_PATH = '/admin';

type Auth0Config = {
  domain: string;
  clientId: string;
  clientSecret: string;
  callbackUrl?: string;
  audience?: string;
  logoutReturnTo?: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const normalizeDomain = (domain: string): string =>
  domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');

const normalizeInternalPath = (value: string | null | undefined): string => {
  if (!value) return DEFAULT_AFTER_LOGIN_PATH;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  return trimmed;
};

const getSiteOrigin = (requestUrl?: string): string => {
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // Fall through to environment values.
    }
  }

  const configured = process.env.PUBLIC_SITE_URL || process.env.URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'https://spicebushmontessori.org';
};

const getAuth0Config = (): Auth0Config | null => {
  const domainRaw = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_CLIENT_SECRET?.trim();

  if (!domainRaw || !clientId || !clientSecret) {
    return null;
  }

  return {
    domain: normalizeDomain(domainRaw),
    clientId,
    clientSecret,
    callbackUrl: process.env.AUTH0_CALLBACK_URL?.trim(),
    audience: process.env.AUTH0_AUDIENCE?.trim(),
    logoutReturnTo: process.env.AUTH0_LOGOUT_RETURN_TO?.trim()
  };
};

const getJwks = (domain: string): ReturnType<typeof createRemoteJWKSet> => {
  const cached = jwksCache.get(domain);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  jwksCache.set(domain, jwks);
  return jwks;
};

export const hasAuth0Config = (): boolean => getAuth0Config() !== null;

export const getAuth0StateCookieTtlSeconds = (): number => AUTH0_STATE_TTL_SECONDS;

export interface Auth0LoginRequest {
  authorizeUrl: string;
  state: string;
  nonce: string;
  nextPath: string;
}

export const createAuth0LoginRequest = (params: {
  requestUrl?: string;
  nextPath?: string | null;
}): Auth0LoginRequest | null => {
  const config = getAuth0Config();
  if (!config) {
    return null;
  }

  const siteOrigin = getSiteOrigin(params.requestUrl);
  const redirectUri = config.callbackUrl || `${siteOrigin}/auth/callback`;
  const state = randomBytes(24).toString('hex');
  const nonce = randomBytes(24).toString('hex');
  const nextPath = normalizeInternalPath(params.nextPath);

  const authorizeUrl = new URL(`https://${config.domain}/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('nonce', nonce);

  if (config.audience) {
    authorizeUrl.searchParams.set('audience', config.audience);
  }

  return {
    authorizeUrl: authorizeUrl.toString(),
    state,
    nonce,
    nextPath
  };
};

export const exchangeAuth0CodeForEmail = async (params: {
  code: string;
  expectedNonce: string;
  requestUrl?: string;
}): Promise<string | null> => {
  const config = getAuth0Config();
  if (!config) {
    return null;
  }

  const siteOrigin = getSiteOrigin(params.requestUrl);
  const redirectUri = config.callbackUrl || `${siteOrigin}/auth/callback`;

  const tokenResponse = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenPayload = (await tokenResponse.json()) as {
    id_token?: string;
  };

  const idToken = tokenPayload.id_token;
  if (!idToken) {
    return null;
  }

  const jwks = getJwks(config.domain);
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://${config.domain}/`,
    audience: config.clientId
  });

  if (payload.nonce !== params.expectedNonce) {
    return null;
  }

  if (payload.email_verified === false) {
    return null;
  }

  if (typeof payload.email !== 'string' || !payload.email.includes('@')) {
    return null;
  }

  return payload.email.trim().toLowerCase();
};

export const buildAuth0LogoutUrl = (params: {
  requestUrl?: string;
  returnPath?: string;
}): string | null => {
  const config = getAuth0Config();
  if (!config) {
    return null;
  }

  const origin = getSiteOrigin(params.requestUrl);
  const safeReturnPath = normalizeInternalPath(params.returnPath || '/auth/sign-in?notice=signed-out');
  const returnTo = config.logoutReturnTo || `${origin}${safeReturnPath}`;

  const logoutUrl = new URL(`https://${config.domain}/v2/logout`);
  logoutUrl.searchParams.set('client_id', config.clientId);
  logoutUrl.searchParams.set('returnTo', returnTo);

  return logoutUrl.toString();
};
