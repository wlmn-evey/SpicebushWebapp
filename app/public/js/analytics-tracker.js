(function initSpicebushAnalytics() {
  const runtimeWindow = window;
  if (runtimeWindow.__sbAnalyticsInitialized) return;
  runtimeWindow.__sbAnalyticsInitialized = true;

  const config = runtimeWindow.sbAnalyticsConfig || {};
  const trackingEnabled = config.enabled === true;
  if (!trackingEnabled) return;

  const TRACK_ENDPOINT = '/api/analytics/track';
  const STORAGE_CLIENT_ID = 'sb_client_id';
  const STORAGE_FIRST_TOUCH = 'sb_first_touch';
  const STORAGE_LAST_TOUCH = 'sb_last_touch';
  const STORAGE_SESSION_ID = 'sb_session_id';
  const COOKIE_SESSION_ID = 'sb_session_id';
  const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

  const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];

  const clampText = (value, maxLength) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.slice(0, maxLength);
  };

  const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const safeReadJson = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore parse errors for stale localStorage data.
    }
    return null;
  };

  const safeGetLocalStorage = (key) => {
    try {
      return runtimeWindow.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeSetLocalStorage = (key, value) => {
    try {
      runtimeWindow.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures (private browsing/quota).
    }
  };

  const readCookie = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const writeCookie = (name, value) => {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  };

  const ensureClientId = () => {
    const existing = clampText(safeGetLocalStorage(STORAGE_CLIENT_ID), 120);
    if (existing) return existing;
    const next = makeId('sbcid');
    safeSetLocalStorage(STORAGE_CLIENT_ID, next);
    return next;
  };

  const ensureSessionId = () => {
    const existingSessionStorage = clampText(safeGetLocalStorage(STORAGE_SESSION_ID), 120);
    if (existingSessionStorage) {
      writeCookie(COOKIE_SESSION_ID, existingSessionStorage);
      return existingSessionStorage;
    }

    const existingCookie = clampText(readCookie(COOKIE_SESSION_ID), 120);
    if (existingCookie) {
      safeSetLocalStorage(STORAGE_SESSION_ID, existingCookie);
      return existingCookie;
    }

    const next = makeId('sbsid');
    safeSetLocalStorage(STORAGE_SESSION_ID, next);
    writeCookie(COOKIE_SESSION_ID, next);
    return next;
  };

  const getCurrentUrlPath = () => `${runtimeWindow.location.pathname}${runtimeWindow.location.search}`;

  const readCampaignParams = () => {
    const params = new URLSearchParams(runtimeWindow.location.search);
    const result = {};
    ATTRIBUTION_KEYS.forEach((key) => {
      const value = clampText(params.get(key), 160);
      if (value) {
        result[key] = value;
      }
    });
    return result;
  };

  const hasCampaignData = (record) => ATTRIBUTION_KEYS.some((key) => typeof record[key] === 'string' && record[key].length > 0);

  const buildTouchPayload = () => {
    const campaign = readCampaignParams();
    const referrer = clampText(document.referrer, 2048);

    return {
      ...campaign,
      landing_page: getCurrentUrlPath(),
      referrer_url: referrer || null,
      captured_at: new Date().toISOString()
    };
  };

  const updateAttributionStorage = () => {
    const touchPayload = buildTouchPayload();
    const firstTouch = safeReadJson(safeGetLocalStorage(STORAGE_FIRST_TOUCH));
    const lastTouch = safeReadJson(safeGetLocalStorage(STORAGE_LAST_TOUCH));
    const campaignPresent = hasCampaignData(touchPayload);

    if (!firstTouch && campaignPresent) {
      safeSetLocalStorage(STORAGE_FIRST_TOUCH, JSON.stringify(touchPayload));
    }

    if (campaignPresent) {
      safeSetLocalStorage(STORAGE_LAST_TOUCH, JSON.stringify(touchPayload));
    } else if (!firstTouch && !lastTouch) {
      // Record a baseline direct touch so forms still carry landing/referrer context.
      safeSetLocalStorage(STORAGE_LAST_TOUCH, JSON.stringify(touchPayload));
    }
  };

  const getAttributionPayload = () => {
    const firstTouch = safeReadJson(safeGetLocalStorage(STORAGE_FIRST_TOUCH));
    const lastTouch = safeReadJson(safeGetLocalStorage(STORAGE_LAST_TOUCH));
    const active = (lastTouch && Object.keys(lastTouch).length > 0) ? lastTouch : (firstTouch || {});

    const payload = {
      utm_source: clampText(active.utm_source || '', 160),
      utm_medium: clampText(active.utm_medium || '', 160),
      utm_campaign: clampText(active.utm_campaign || '', 160),
      utm_term: clampText(active.utm_term || '', 160),
      utm_content: clampText(active.utm_content || '', 160),
      gclid: clampText(active.gclid || '', 160),
      gbraid: clampText(active.gbraid || '', 160),
      wbraid: clampText(active.wbraid || '', 160),
      landing_page: clampText(active.landing_page || getCurrentUrlPath(), 500),
      referrer_url: clampText(active.referrer_url || document.referrer || '', 2048),
      first_touch: firstTouch || null,
      last_touch: lastTouch || null
    };

    return payload;
  };

  const sendTrackRequest = (payload) => {
    const body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
      if (sent) return;
    }

    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true
    }).catch(() => {
      // Avoid surfacing noisy analytics failures to users.
    });
  };

  const cleanProperties = (input) => {
    if (!input || typeof input !== 'object') return {};
    const result = {};
    Object.entries(input).slice(0, 40).forEach(([key, value]) => {
      const safeKey = clampText(key, 64);
      if (!safeKey) return;

      if (typeof value === 'string') {
        result[safeKey] = clampText(value, 800);
        return;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[safeKey] = value;
        return;
      }
      if (typeof value === 'boolean' || value === null) {
        result[safeKey] = value;
      }
    });
    return result;
  };

  const clientId = ensureClientId();
  const sessionId = ensureSessionId();
  updateAttributionStorage();

  const track = (eventName, properties = {}, options = {}) => {
    const safeEventName = clampText(String(eventName || ''), 80);
    if (!safeEventName) return;

    const attribution = getAttributionPayload();
    const safeProperties = cleanProperties({
      ...properties,
      path: getCurrentUrlPath()
    });

    sendTrackRequest({
      eventName: safeEventName,
      eventCategory: clampText(options.eventCategory || '', 80) || null,
      pagePath: runtimeWindow.location.pathname,
      pageUrl: runtimeWindow.location.href,
      referrerUrl: clampText(document.referrer, 2048) || null,
      sessionId,
      clientId,
      eventValue: Number.isFinite(options.eventValue) ? Number(options.eventValue) : null,
      properties: {
        ...safeProperties,
        attribution
      }
    });

    if (typeof runtimeWindow.gtag === 'function') {
      const gaProperties = {
        ...safeProperties,
        page_path: runtimeWindow.location.pathname,
        page_location: runtimeWindow.location.href
      };
      runtimeWindow.gtag('event', safeEventName, gaProperties);
    }
  };

  runtimeWindow.sbTrack = track;

  const ensureHiddenField = (form, name) => {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!(input instanceof HTMLInputElement)) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    return input;
  };

  const syncFormAttributionFields = (form) => {
    const attribution = getAttributionPayload();
    ensureHiddenField(form, 'analytics-attribution').value = JSON.stringify(attribution);
    ensureHiddenField(form, 'analytics-session-id').value = sessionId;
    ensureHiddenField(form, 'analytics-client-id').value = clientId;
    ensureHiddenField(form, 'analytics-landing-page').value = getCurrentUrlPath();
    ensureHiddenField(form, 'analytics-referrer-url').value = clampText(document.referrer, 2048);
  };

  const attachFormTracking = () => {
    const forms = Array.from(document.querySelectorAll('form[data-analytics-form]'));
    forms.forEach((form) => {
      if (!(form instanceof HTMLFormElement)) return;
      syncFormAttributionFields(form);
      form.addEventListener('submit', () => {
        syncFormAttributionFields(form);
        const formName = form.dataset.analyticsForm || form.getAttribute('name') || 'unknown-form';
        const eventName = form.dataset.analyticsEvent || 'form_submit';
        track(eventName, {
          form_name: clampText(formName, 120),
          form_action: clampText(form.getAttribute('action') || '', 500)
        }, {
          eventCategory: 'lead'
        });
      });
    });
  };

  const attachLinkTracking = () => {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[data-analytics-event]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const eventName = clampText(anchor.dataset.analyticsEvent || 'cta_click', 80);
      const label = clampText(anchor.dataset.analyticsLabel || anchor.textContent || '', 180);
      const href = clampText(anchor.href, 2048);

      track(eventName, {
        label,
        href,
        location: clampText(anchor.dataset.analyticsLocation || '', 120)
      }, {
        eventCategory: 'engagement'
      });
    }, { passive: true });
  };

  attachFormTracking();
  attachLinkTracking();

  track('page_view', {
    title: clampText(document.title, 300),
    path: runtimeWindow.location.pathname
  }, {
    eventCategory: 'navigation'
  });
})();
