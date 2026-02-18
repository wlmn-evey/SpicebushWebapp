type PhotoFramingDefaultsInput = {
  category?: string | null;
  width?: number | null;
  height?: number | null;
  slug?: string | null;
};

export type PhotoFramingDefaults = {
  primaryFocalX: number;
  primaryFocalY: number;
  primaryFocalDescription: string;
  mobileCropX: number;
  mobileCropY: number;
  mobileCropWidth: number;
  mobileCropHeight: number;
  tabletCropX: number;
  tabletCropY: number;
  tabletCropWidth: number;
  tabletCropHeight: number;
};

const roundToTenth = (value: number): number => Math.round(value * 10) / 10;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizedNumber = (value: number | null | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
};

const normalizeCropBox = (crop: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const width = clamp(crop.width, 10, 100);
  const height = clamp(crop.height, 10, 100);
  const x = clamp(crop.x, 0, 100 - width);
  const y = clamp(crop.y, 0, 100 - height);

  return {
    x: roundToTenth(x),
    y: roundToTenth(y),
    width: roundToTenth(width),
    height: roundToTenth(height)
  };
};

export const getPhotoFramingDefaults = ({
  category,
  width,
  height,
  slug
}: PhotoFramingDefaultsInput): PhotoFramingDefaults => {
  const normalizedCategory = String(category ?? '').trim().toLowerCase();
  const normalizedSlug = String(slug ?? '').trim().toLowerCase();

  const safeWidth = normalizedNumber(width, 1200);
  const safeHeight = normalizedNumber(height, 800);
  const ratio = safeWidth / safeHeight;
  const isPortrait = ratio < 0.9;
  const isLandscape = ratio > 1.2;
  const isLogo = normalizedSlug.includes('logo') || normalizedSlug.includes('brand-identity');

  if (isLogo) {
    return {
      primaryFocalX: 50,
      primaryFocalY: 50,
      primaryFocalDescription: 'Centered brand mark',
      mobileCropX: 0,
      mobileCropY: 0,
      mobileCropWidth: 100,
      mobileCropHeight: 100,
      tabletCropX: 0,
      tabletCropY: 0,
      tabletCropWidth: 100,
      tabletCropHeight: 100
    };
  }

  if (normalizedCategory === 'teachers') {
    const mobileCrop = normalizeCropBox({
      x: 18,
      y: 6,
      width: 64,
      height: 74
    });
    const tabletCrop = normalizeCropBox({
      x: 10,
      y: 5,
      width: 80,
      height: 82
    });

    return {
      primaryFocalX: 50,
      primaryFocalY: 34,
      primaryFocalDescription: 'Face and upper body centered',
      mobileCropX: mobileCrop.x,
      mobileCropY: mobileCrop.y,
      mobileCropWidth: mobileCrop.width,
      mobileCropHeight: mobileCrop.height,
      tabletCropX: tabletCrop.x,
      tabletCropY: tabletCrop.y,
      tabletCropWidth: tabletCrop.width,
      tabletCropHeight: tabletCrop.height
    };
  }

  if (isPortrait) {
    const mobileCrop = normalizeCropBox({
      x: 16,
      y: 10,
      width: 68,
      height: 74
    });
    const tabletCrop = normalizeCropBox({
      x: 10,
      y: 8,
      width: 80,
      height: 82
    });

    return {
      primaryFocalX: 50,
      primaryFocalY: 38,
      primaryFocalDescription: 'Upper-center subject focus',
      mobileCropX: mobileCrop.x,
      mobileCropY: mobileCrop.y,
      mobileCropWidth: mobileCrop.width,
      mobileCropHeight: mobileCrop.height,
      tabletCropX: tabletCrop.x,
      tabletCropY: tabletCrop.y,
      tabletCropWidth: tabletCrop.width,
      tabletCropHeight: tabletCrop.height
    };
  }

  if (isLandscape) {
    const mobileCrop = normalizeCropBox({
      x: 20,
      y: 14,
      width: 60,
      height: 70
    });
    const tabletCrop = normalizeCropBox({
      x: 12,
      y: 10,
      width: 76,
      height: 78
    });

    return {
      primaryFocalX: 50,
      primaryFocalY: 42,
      primaryFocalDescription: 'Center-weighted subject area',
      mobileCropX: mobileCrop.x,
      mobileCropY: mobileCrop.y,
      mobileCropWidth: mobileCrop.width,
      mobileCropHeight: mobileCrop.height,
      tabletCropX: tabletCrop.x,
      tabletCropY: tabletCrop.y,
      tabletCropWidth: tabletCrop.width,
      tabletCropHeight: tabletCrop.height
    };
  }

  const mobileCrop = normalizeCropBox({
    x: 16,
    y: 12,
    width: 68,
    height: 72
  });
  const tabletCrop = normalizeCropBox({
    x: 10,
    y: 8,
    width: 80,
    height: 82
  });

  return {
    primaryFocalX: 50,
    primaryFocalY: 40,
    primaryFocalDescription: 'Primary subject centered',
    mobileCropX: mobileCrop.x,
    mobileCropY: mobileCrop.y,
    mobileCropWidth: mobileCrop.width,
    mobileCropHeight: mobileCrop.height,
    tabletCropX: tabletCrop.x,
    tabletCropY: tabletCrop.y,
    tabletCropWidth: tabletCrop.width,
    tabletCropHeight: tabletCrop.height
  };
};
