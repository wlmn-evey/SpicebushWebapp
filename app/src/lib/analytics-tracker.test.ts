import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// public/js/analytics-tracker.js is a plain inline script, so the test runs its source in jsdom
// and reads what it posts to /api/analytics/track.
const trackerSource = readFileSync(
  resolve(__dirname, '../../public/js/analytics-tracker.js'),
  'utf8'
);

type Sent = { eventName: string; properties: Record<string, unknown> };

const sent: Sent[] = [];
// Each load adds a document click listener; remove them between tests so loads don't stack.
const listeners: Array<[string, EventListenerOrEventListenerObject]> = [];

const loadTracker = (tourLink: string) => {
  const win = window as unknown as Record<string, unknown>;
  delete win.__sbAnalyticsInitialized;
  win.sbAnalyticsConfig = { enabled: true, measurementId: '', tourLink };
  runInThisContext(trackerSource);
};

const click = (html: string) => {
  document.body.innerHTML = html;
  const anchor = document.querySelector('a') as HTMLAnchorElement;
  anchor.addEventListener('click', event => event.preventDefault());
  anchor.click();
  return sent.filter(entry => entry.eventName !== 'page_view');
};

describe('analytics-tracker link tracking (#167)', () => {
  beforeEach(() => {
    sent.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        sent.push(JSON.parse(init.body) as Sent);
        return new Response(null, { status: 204 });
      })
    );
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    const add = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      listeners.push([type, listener]);
      add(type, listener, options);
    });
  });

  afterEach(() => {
    listeners.splice(0).forEach(([type, listener]) => document.removeEventListener(type, listener));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps tagged links as they are', () => {
    loadTracker('https://calendly.com/spicebush/tour');
    const events = click(
      '<a href="https://calendly.com/spicebush/tour" data-analytics-event="tour_click" data-analytics-label="header-schedule-tour" data-analytics-location="header-desktop">Tour</a>'
    );

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('tour_click');
    expect(events[0].properties).toMatchObject({
      label: 'header-schedule-tour',
      location: 'header-desktop'
    });
    expect(events[0].properties.auto).toBeUndefined();
  });

  it('counts an untagged link to the booking page as a tour click', () => {
    loadTracker('https://calendly.com/spicebush/tour');
    const events = click(
      '<main><a href="https://calendly.com/spicebush/tour/">Apply &amp; Schedule Tour</a></main>'
    );

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('tour_click');
    expect(events[0].properties).toMatchObject({
      auto: true,
      location: 'main',
      label: 'Apply & Schedule Tour'
    });
  });

  it('counts untagged tuition calculator and phone links', () => {
    loadTracker('');
    expect(
      click('<footer><a href="/admissions/tuition-calculator">Tuition</a></footer>')[0]
    ).toMatchObject({
      eventName: 'tuition_calculator_click',
      properties: { auto: true, location: 'footer' }
    });

    sent.length = 0;
    expect(click('<a href="tel:4842020712">(484) 202-0712</a>')[0]).toMatchObject({
      eventName: 'phone_click',
      properties: { auto: true, location: 'page' }
    });
  });

  it('does not treat /admissions as a tour link when no booking page is configured', () => {
    loadTracker('');
    expect(click('<a href="/admissions">Admissions</a>')).toHaveLength(0);
  });

  it('ignores ordinary links', () => {
    loadTracker('https://calendly.com/spicebush/tour');
    expect(click('<a href="/about">About</a>')).toHaveLength(0);
  });
});
