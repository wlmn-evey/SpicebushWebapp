import { describe, expect, it } from 'vitest';
import {
  createHeuristicSmartAdjustSuggestion,
  normalizePlacementSuggestion,
  sanitizeSmartAdjustContext,
  type PlacementSuggestion
} from './smart-adjust';

const basePlacement: PlacementSuggestion = {
  desktopFocalX: 50,
  desktopFocalY: 50,
  mobileCropX: 20,
  mobileCropY: 10,
  mobileCropWidth: 60,
  mobileCropHeight: 70,
  tabletCropX: 12,
  tabletCropY: 10,
  tabletCropWidth: 76,
  tabletCropHeight: 78
};

describe('smart-adjust utils', () => {
  it('normalizes placement values and enforces crop boundaries', () => {
    const normalized = normalizePlacementSuggestion(
      {
        desktopFocalX: 200,
        desktopFocalY: -20,
        mobileCropX: 90,
        mobileCropY: -5,
        mobileCropWidth: 120,
        mobileCropHeight: 6,
        tabletCropX: -4,
        tabletCropY: 99,
        tabletCropWidth: 35,
        tabletCropHeight: 40
      },
      basePlacement
    );

    expect(normalized.desktopFocalX).toBe(100);
    expect(normalized.desktopFocalY).toBe(0);

    expect(normalized.mobileCropWidth).toBe(100);
    expect(normalized.mobileCropHeight).toBe(10);
    expect(normalized.mobileCropX).toBe(0);
    expect(normalized.mobileCropY).toBe(0);

    expect(normalized.tabletCropX).toBe(0);
    expect(normalized.tabletCropY).toBe(60);
    expect(normalized.tabletCropWidth).toBe(35);
    expect(normalized.tabletCropHeight).toBe(40);
  });

  it('sanitizes context and removes invalid overlap regions', () => {
    const context = sanitizeSmartAdjustContext({
      pagePath: '/coming-soon',
      viewport: { width: '1024', height: 768 },
      image: { naturalWidth: 1200, naturalHeight: '800', className: 'hero-image' },
      sectionSummary: '  Important section summary  ',
      overlapRegions: [
        { x: 10, y: 20, width: 30, height: 25, overlapRatio: 12.34, text: 'Heading' },
        { x: 5, y: 5, width: 0.2, height: 5 },
        'invalid'
      ]
    });

    expect(context.pagePath).toBe('/coming-soon');
    expect(context.viewport).toEqual({ width: 1024, height: 768 });
    expect(context.image.naturalWidth).toBe(1200);
    expect(context.image.naturalHeight).toBe(800);
    expect(context.overlapRegions).toHaveLength(1);
    expect(context.overlapRegions[0]).toMatchObject({
      x: 10,
      y: 20,
      width: 30,
      height: 25,
      overlapRatio: 12.3,
      text: 'Heading'
    });
  });

  it('moves focus away from strong overlap regions when using heuristic mode', () => {
    const context = sanitizeSmartAdjustContext({
      pagePath: '/coming-soon',
      overlapRegions: [
        {
          x: 35,
          y: 35,
          width: 30,
          height: 30,
          overlapRatio: 45,
          text: 'Main headline'
        }
      ]
    });

    const suggestion = createHeuristicSmartAdjustSuggestion(basePlacement, context);

    const focusInsideOverlay = suggestion.desktopFocalX >= 35
      && suggestion.desktopFocalX <= 65
      && suggestion.desktopFocalY >= 35
      && suggestion.desktopFocalY <= 65;

    expect(focusInsideOverlay).toBe(false);

    expect(suggestion.mobileCropWidth).toBeGreaterThanOrEqual(10);
    expect(suggestion.mobileCropHeight).toBeGreaterThanOrEqual(10);
    expect(suggestion.mobileCropX).toBeGreaterThanOrEqual(0);
    expect(suggestion.mobileCropY).toBeGreaterThanOrEqual(0);

    expect(suggestion.tabletCropX).toBeGreaterThanOrEqual(0);
    expect(suggestion.tabletCropY).toBeGreaterThanOrEqual(0);
    expect(suggestion.tabletCropX + suggestion.tabletCropWidth).toBeLessThanOrEqual(100);
    expect(suggestion.tabletCropY + suggestion.tabletCropHeight).toBeLessThanOrEqual(100);
  });

  it('uses image detail hint to avoid blank-space focal points when no overlap exists', () => {
    const context = sanitizeSmartAdjustContext({
      pagePath: '/programs',
      imageDetailHint: {
        x: 28,
        y: 74,
        confidence: 0.9
      },
      overlapRegions: []
    });

    const suggestion = createHeuristicSmartAdjustSuggestion(basePlacement, context);

    expect(suggestion.desktopFocalX).toBeLessThan(45);
    expect(suggestion.desktopFocalY).toBeGreaterThan(60);
  });
});
