export type PlacementSuggestion = {
  desktopFocalX: number;
  desktopFocalY: number;
  mobileCropX: number;
  mobileCropY: number;
  mobileCropWidth: number;
  mobileCropHeight: number;
  tabletCropX: number;
  tabletCropY: number;
  tabletCropWidth: number;
  tabletCropHeight: number;
};

export type SmartAdjustRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  overlapRatio?: number;
  text?: string;
};

export type SmartAdjustContext = {
  pagePath: string;
  viewport: {
    width: number;
    height: number;
  };
  image: {
    naturalWidth: number;
    naturalHeight: number;
    renderedWidth: number;
    renderedHeight: number;
    className: string;
  };
  sectionSummary: string;
  overlapRegions: SmartAdjustRegion[];
  imageDetailHint?: {
    x: number;
    y: number;
    confidence: number;
  };
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const roundTenth = (value: number): number => Math.round(value * 10) / 10;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeCropRect = (
  xInput: unknown,
  yInput: unknown,
  widthInput: unknown,
  heightInput: unknown,
  defaults: Rect
): Rect => {
  const width = clamp(toNumber(widthInput, defaults.width), 10, 100);
  const height = clamp(toNumber(heightInput, defaults.height), 10, 100);
  const x = clamp(toNumber(xInput, defaults.x), 0, 100 - width);
  const y = clamp(toNumber(yInput, defaults.y), 0, 100 - height);

  return {
    x: roundTenth(x),
    y: roundTenth(y),
    width: roundTenth(width),
    height: roundTenth(height)
  };
};

export const normalizePlacementSuggestion = (
  rawInput: unknown,
  fallback: PlacementSuggestion
): PlacementSuggestion => {
  const raw = asRecord(rawInput);

  const desktopFocalX = roundTenth(clamp(toNumber(raw.desktopFocalX, fallback.desktopFocalX), 0, 100));
  const desktopFocalY = roundTenth(clamp(toNumber(raw.desktopFocalY, fallback.desktopFocalY), 0, 100));

  const mobileRect = normalizeCropRect(
    raw.mobileCropX,
    raw.mobileCropY,
    raw.mobileCropWidth,
    raw.mobileCropHeight,
    {
      x: fallback.mobileCropX,
      y: fallback.mobileCropY,
      width: fallback.mobileCropWidth,
      height: fallback.mobileCropHeight
    }
  );

  const tabletRect = normalizeCropRect(
    raw.tabletCropX,
    raw.tabletCropY,
    raw.tabletCropWidth,
    raw.tabletCropHeight,
    {
      x: fallback.tabletCropX,
      y: fallback.tabletCropY,
      width: fallback.tabletCropWidth,
      height: fallback.tabletCropHeight
    }
  );

  return {
    desktopFocalX,
    desktopFocalY,
    mobileCropX: mobileRect.x,
    mobileCropY: mobileRect.y,
    mobileCropWidth: mobileRect.width,
    mobileCropHeight: mobileRect.height,
    tabletCropX: tabletRect.x,
    tabletCropY: tabletRect.y,
    tabletCropWidth: tabletRect.width,
    tabletCropHeight: tabletRect.height
  };
};

const normalizeRegion = (input: unknown): SmartAdjustRegion | null => {
  const value = asRecord(input);
  const width = clamp(toNumber(value.width, 0), 0, 100);
  const height = clamp(toNumber(value.height, 0), 0, 100);
  if (width < 0.5 || height < 0.5) return null;

  const x = clamp(toNumber(value.x, 0), 0, 100 - width);
  const y = clamp(toNumber(value.y, 0), 0, 100 - height);
  const overlapRatio = toOptionalNumber(value.overlapRatio);

  return {
    x: roundTenth(x),
    y: roundTenth(y),
    width: roundTenth(width),
    height: roundTenth(height),
    overlapRatio: overlapRatio === null ? undefined : roundTenth(clamp(overlapRatio, 0, 100)),
    text: asString(value.text).slice(0, 160)
  };
};

export const sanitizeSmartAdjustContext = (input: unknown): SmartAdjustContext => {
  const value = asRecord(input);
  const viewport = asRecord(value.viewport);
  const image = asRecord(value.image);
  const imageDetailHintValue = asRecord(value.imageDetailHint);

  const overlapRegionsRaw = Array.isArray(value.overlapRegions) ? value.overlapRegions : [];
  const overlapRegions = overlapRegionsRaw
    .map((region) => normalizeRegion(region))
    .filter((region): region is SmartAdjustRegion => Boolean(region))
    .slice(0, 20);

  const imageDetailHint = (() => {
    const x = toOptionalNumber(imageDetailHintValue.x);
    const y = toOptionalNumber(imageDetailHintValue.y);
    const confidence = toOptionalNumber(imageDetailHintValue.confidence);
    if (x === null || y === null) return undefined;
    return {
      x: roundTenth(clamp(x, 0, 100)),
      y: roundTenth(clamp(y, 0, 100)),
      confidence: roundTenth(clamp(confidence ?? 0.5, 0, 1))
    };
  })();

  return {
    pagePath: asString(value.pagePath, '/').slice(0, 180),
    viewport: {
      width: Math.max(0, Math.round(toNumber(viewport.width, 0))),
      height: Math.max(0, Math.round(toNumber(viewport.height, 0)))
    },
    image: {
      naturalWidth: Math.max(0, Math.round(toNumber(image.naturalWidth, 0))),
      naturalHeight: Math.max(0, Math.round(toNumber(image.naturalHeight, 0))),
      renderedWidth: Math.max(0, Math.round(toNumber(image.renderedWidth, 0))),
      renderedHeight: Math.max(0, Math.round(toNumber(image.renderedHeight, 0))),
      className: asString(image.className).slice(0, 200)
    },
    sectionSummary: asString(value.sectionSummary).replace(/\s+/g, ' ').slice(0, 700),
    overlapRegions,
    imageDetailHint
  };
};

const pointInRect = (point: { x: number; y: number }, rect: Rect): boolean =>
  point.x >= rect.x
  && point.x <= rect.x + rect.width
  && point.y >= rect.y
  && point.y <= rect.y + rect.height;

const pointToRectDistance = (point: { x: number; y: number }, rect: Rect): number => {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  const dx = point.x < rect.x ? rect.x - point.x : point.x > right ? point.x - right : 0;
  const dy = point.y < rect.y ? rect.y - point.y : point.y > bottom ? point.y - bottom : 0;

  return Math.hypot(dx, dy);
};

const overlapArea = (a: Rect, b: Rect): number => {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) return 0;
  return width * height;
};

const regionWeight = (region: SmartAdjustRegion): number => {
  const areaWeight = (region.width * region.height) / 4000;
  const overlapWeight = typeof region.overlapRatio === 'number' ? region.overlapRatio / 35 : 0;
  return clamp(Math.max(areaWeight, overlapWeight), 0.1, 3.5);
};

const optimizeFocus = (
  baseFocus: { x: number; y: number },
  overlapRegions: SmartAdjustRegion[]
): { x: number; y: number } => {
  if (overlapRegions.length === 0) {
    return { ...baseFocus };
  }

  const candidates: Array<{ x: number; y: number }> = [{ x: baseFocus.x, y: baseFocus.y }];

  const step = 4;
  for (let x = 0; x <= 100; x += step) {
    for (let y = 0; y <= 100; y += step) {
      candidates.push({ x, y });
    }
  }

  let best = { ...baseFocus };
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const overlapPenalty = overlapRegions.reduce((sum, region) => {
      const weight = regionWeight(region);
      if (pointInRect(candidate, region)) {
        return sum + (2.6 * weight);
      }

      const distance = pointToRectDistance(candidate, region);
      if (distance >= 10) return sum;
      const edgePenalty = ((10 - distance) / 10) * 0.5 * weight;
      return sum + edgePenalty;
    }, 0);

    const baseDistancePenalty = Math.hypot(candidate.x - baseFocus.x, candidate.y - baseFocus.y) / 100;
    const centerBiasPenalty = Math.hypot(candidate.x - 50, candidate.y - 50) / 250;
    const score = overlapPenalty + (0.42 * baseDistancePenalty) + (0.08 * centerBiasPenalty);

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return {
    x: roundTenth(clamp(best.x, 0, 100)),
    y: roundTenth(clamp(best.y, 0, 100))
  };
};

const optimizeCrop = (
  cropSize: { width: number; height: number },
  focus: { x: number; y: number },
  baseCrop: { x: number; y: number },
  overlapRegions: SmartAdjustRegion[]
): Rect => {
  const width = clamp(cropSize.width, 10, 100);
  const height = clamp(cropSize.height, 10, 100);
  const maxX = Math.max(0, 100 - width);
  const maxY = Math.max(0, 100 - height);

  const centeredCandidate = {
    x: clamp(focus.x - (width / 2), 0, maxX),
    y: clamp(focus.y - (height / 2), 0, maxY)
  };

  const candidates: Array<{ x: number; y: number }> = [
    centeredCandidate,
    {
      x: clamp(baseCrop.x, 0, maxX),
      y: clamp(baseCrop.y, 0, maxY)
    }
  ];

  if (overlapRegions.length > 0) {
    const step = width > 80 || height > 80 ? 5 : 4;

    for (let x = 0; x <= maxX + 0.0001; x += step) {
      for (let y = 0; y <= maxY + 0.0001; y += step) {
        candidates.push({
          x: clamp(x, 0, maxX),
          y: clamp(y, 0, maxY)
        });
      }
    }
  }

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  const cropArea = Math.max(width * height, 1);

  for (const candidate of candidates) {
    const rect: Rect = {
      x: candidate.x,
      y: candidate.y,
      width,
      height
    };

    const overlapPenalty = overlapRegions.reduce((sum, region) => {
      const weight = regionWeight(region);
      const area = overlapArea(rect, region);
      if (area <= 0) return sum;
      return sum + ((area / cropArea) * weight * 3.6);
    }, 0);

    const center = {
      x: rect.x + (rect.width / 2),
      y: rect.y + (rect.height / 2)
    };

    const focusDistancePenalty = Math.hypot(center.x - focus.x, center.y - focus.y) / 100;
    const baseDistancePenalty = Math.hypot(rect.x - baseCrop.x, rect.y - baseCrop.y) / 100;
    const score = overlapPenalty + (0.62 * focusDistancePenalty) + (0.12 * baseDistancePenalty);

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return {
    x: roundTenth(clamp(best.x, 0, maxX)),
    y: roundTenth(clamp(best.y, 0, maxY)),
    width: roundTenth(width),
    height: roundTenth(height)
  };
};

export const createHeuristicSmartAdjustSuggestion = (
  baseSuggestion: PlacementSuggestion,
  context: SmartAdjustContext
): PlacementSuggestion => {
  const normalizedBase = normalizePlacementSuggestion(baseSuggestion, baseSuggestion);
  const naturalRatio = context.image.naturalHeight > 0
    ? context.image.naturalWidth / context.image.naturalHeight
    : 1;
  const renderedRatio = context.image.renderedHeight > 0
    ? context.image.renderedWidth / context.image.renderedHeight
    : 1;
  const portraitLandscapeBiasY = (() => {
    if (naturalRatio >= 0.95 || renderedRatio <= 1.2) {
      return null;
    }

    // Portrait source shown in a landscape frame often needs a lower vertical focal point.
    const portraitSeverity = clamp((1 - naturalRatio) / 0.45, 0, 1);
    const landscapeSeverity = clamp((renderedRatio - 1.2) / 0.8, 0, 1);
    const downwardShift = 8 + (10 * portraitSeverity * landscapeSeverity);
    return clamp(60 + downwardShift, 60, 78);
  })();

  const detailHint = context.imageDetailHint;
  const blendedFocus = detailHint
    ? (() => {
      const blend = clamp(0.25 + (detailHint.confidence * 0.5), 0.2, 0.8);
      return {
        x: (normalizedBase.desktopFocalX * (1 - blend)) + (detailHint.x * blend),
        y: (normalizedBase.desktopFocalY * (1 - blend)) + (detailHint.y * blend)
      };
    })()
    : {
      x: normalizedBase.desktopFocalX,
      y: normalizedBase.desktopFocalY
    };
  if (portraitLandscapeBiasY !== null && context.overlapRegions.length === 0) {
    blendedFocus.y = Math.max(blendedFocus.y, portraitLandscapeBiasY);
  }

  const optimizedFocus = optimizeFocus(
    {
      x: blendedFocus.x,
      y: blendedFocus.y
    },
    context.overlapRegions
  );

  const mobileCrop = optimizeCrop(
    {
      width: normalizedBase.mobileCropWidth,
      height: normalizedBase.mobileCropHeight
    },
    optimizedFocus,
    {
      x: normalizedBase.mobileCropX,
      y: normalizedBase.mobileCropY
    },
    context.overlapRegions
  );

  const tabletCrop = optimizeCrop(
    {
      width: normalizedBase.tabletCropWidth,
      height: normalizedBase.tabletCropHeight
    },
    optimizedFocus,
    {
      x: normalizedBase.tabletCropX,
      y: normalizedBase.tabletCropY
    },
    context.overlapRegions
  );

  return normalizePlacementSuggestion(
    {
      desktopFocalX: optimizedFocus.x,
      desktopFocalY: optimizedFocus.y,
      mobileCropX: mobileCrop.x,
      mobileCropY: mobileCrop.y,
      mobileCropWidth: mobileCrop.width,
      mobileCropHeight: mobileCrop.height,
      tabletCropX: tabletCrop.x,
      tabletCropY: tabletCrop.y,
      tabletCropWidth: tabletCrop.width,
      tabletCropHeight: tabletCrop.height
    },
    normalizedBase
  );
};
