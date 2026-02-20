import { describe, expect, it } from 'vitest';
import { evaluateCampMode, parseCampModeSettings } from './camp-mode';

describe('camp mode settings', () => {
  it('parses defaults when settings are missing', () => {
    const parsed = parseCampModeSettings({});

    expect(parsed.override).toBe('off');
    expect(parsed.startAt).toBe('');
    expect(parsed.endAt).toBe('');
    expect(parsed.timezone).toBe('America/New_York');
    expect(parsed.promotionsEnabled).toBe(false);
  });

  it('parses configured values from settings', () => {
    const parsed = parseCampModeSettings({
      camp_mode_override: 'auto',
      camp_mode_start_at: '2026-06-01T00:00:00-04:00',
      camp_mode_end_at: '2026-08-15T23:59:59-04:00',
      camp_mode_timezone: 'America/Chicago',
      camp_promotions_enabled: true
    });

    expect(parsed.override).toBe('auto');
    expect(parsed.timezone).toBe('America/Chicago');
    expect(parsed.promotionsEnabled).toBe(true);
  });

  it('accepts prep override as a valid mode', () => {
    const parsed = parseCampModeSettings({
      camp_mode_override: 'prep'
    });

    expect(parsed.override).toBe('prep');
  });
});

describe('camp mode evaluation', () => {
  it('forces active when override is on', () => {
    const result = evaluateCampMode(
      {
        override: 'on',
        startAt: '',
        endAt: '',
        timezone: 'America/New_York',
        promotionsEnabled: false
      },
      new Date('2026-01-10T00:00:00Z')
    );

    expect(result.active).toBe(true);
    expect(result.activeForAdmin).toBe(true);
    expect(result.prepMode).toBe(false);
    expect(result.reason).toBe('forced_on');
  });

  it('forces inactive when override is off', () => {
    const result = evaluateCampMode(
      {
        override: 'off',
        startAt: '2026-06-01T00:00:00Z',
        endAt: '2026-08-01T00:00:00Z',
        timezone: 'America/New_York',
        promotionsEnabled: false
      },
      new Date('2026-06-15T00:00:00Z')
    );

    expect(result.active).toBe(false);
    expect(result.activeForAdmin).toBe(false);
    expect(result.prepMode).toBe(false);
    expect(result.reason).toBe('forced_off');
  });

  it('keeps camp private in prep mode while allowing admin preview', () => {
    const result = evaluateCampMode(
      {
        override: 'prep',
        startAt: '',
        endAt: '',
        timezone: 'America/New_York',
        promotionsEnabled: false
      },
      new Date('2026-06-15T00:00:00Z')
    );

    expect(result.active).toBe(false);
    expect(result.activeForAdmin).toBe(true);
    expect(result.prepMode).toBe(true);
    expect(result.reason).toBe('forced_prep');
  });

  it('activates when current time is within the auto schedule window', () => {
    const result = evaluateCampMode(
      {
        override: 'auto',
        startAt: '2026-06-01T00:00:00Z',
        endAt: '2026-08-01T00:00:00Z',
        timezone: 'America/New_York',
        promotionsEnabled: false
      },
      new Date('2026-06-15T00:00:00Z')
    );

    expect(result.active).toBe(true);
    expect(result.activeForAdmin).toBe(true);
    expect(result.prepMode).toBe(false);
    expect(result.reason).toBe('within_window');
  });

  it('is inactive in auto mode when window is missing', () => {
    const result = evaluateCampMode(
      {
        override: 'auto',
        startAt: '',
        endAt: '',
        timezone: 'America/New_York',
        promotionsEnabled: false
      },
      new Date('2026-06-15T00:00:00Z')
    );

    expect(result.active).toBe(false);
    expect(result.activeForAdmin).toBe(false);
    expect(result.prepMode).toBe(false);
    expect(result.reason).toBe('window_missing');
  });
});
