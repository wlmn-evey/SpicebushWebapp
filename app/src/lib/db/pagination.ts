export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export const toSafeInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export const normalizePage = (value: unknown): number => {
  const parsed = toSafeInteger(value, DEFAULT_PAGE);
  return parsed > 0 ? parsed : DEFAULT_PAGE;
};

export const normalizePageSize = (value: unknown, maxPageSize = MAX_PAGE_SIZE): number => {
  const parsed = toSafeInteger(value, DEFAULT_PAGE_SIZE);
  if (parsed < 1) return DEFAULT_PAGE_SIZE;
  if (parsed > maxPageSize) return maxPageSize;
  return parsed;
};

export const normalizeCount = (value: unknown): number => {
  const parsed = toSafeInteger(value, 0);
  return parsed >= 0 ? parsed : 0;
};
