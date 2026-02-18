type PhotoLookupEntry = {
  slug: string;
  optimizedFilename?: string | null;
  sourceUrl?: string | null;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const stripQueryAndHash = (value: string): string => {
  const withoutHash = value.split('#')[0] ?? value;
  return withoutHash.split('?')[0] ?? withoutHash;
};

const normalizePathLike = (value: string): string => {
  const trimmed = normalizeString(value);
  if (!trimmed) return '';

  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed);
    candidate = parsed.pathname;
  } catch {
    candidate = trimmed;
  }

  const withoutQuery = stripQueryAndHash(candidate);
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
};

const basenameFromPath = (value: string): string => {
  const normalized = normalizePathLike(value);
  if (!normalized) return '';
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
};

const removeExtension = (filename: string): string => filename.replace(/\.[a-z0-9]{2,5}$/i, '');

const removeResponsiveSuffix = (filenameWithoutExtension: string): string =>
  filenameWithoutExtension.replace(/-(?:\d+w|\d+x\d+)$/i, '');

export const toPhotoLookupEntry = (
  slug: string,
  data: Record<string, unknown>
): PhotoLookupEntry => ({
  slug,
  optimizedFilename: normalizeString(data.optimizedFilename),
  sourceUrl: normalizeString(data.sourceUrl || data.url)
});

export const buildPhotoSlugResolver = (
  entries: PhotoLookupEntry[]
): ((photoValue: string | null | undefined) => string | null) => {
  const bySlug = new Map<string, string>();
  const bySourcePath = new Map<string, string>();
  const byOptimizedFilename = new Map<string, string>();

  for (const entry of entries) {
    const slug = normalizeString(entry.slug).toLowerCase();
    if (!slug) continue;

    bySlug.set(slug, entry.slug);

    const sourcePath = normalizePathLike(entry.sourceUrl ?? '').toLowerCase();
    if (sourcePath) {
      bySourcePath.set(sourcePath, entry.slug);
    }

    const optimizedFilename = normalizeString(entry.optimizedFilename).toLowerCase();
    if (optimizedFilename) {
      byOptimizedFilename.set(optimizedFilename, entry.slug);
    }
  }

  return (photoValue: string | null | undefined): string | null => {
    const rawValue = normalizeString(photoValue);
    if (!rawValue) return null;

    const rawSlugCandidate = rawValue.toLowerCase();
    if (bySlug.has(rawSlugCandidate)) {
      return bySlug.get(rawSlugCandidate) ?? null;
    }

    const normalizedPath = normalizePathLike(rawValue).toLowerCase();
    if (normalizedPath && bySourcePath.has(normalizedPath)) {
      return bySourcePath.get(normalizedPath) ?? null;
    }

    const filename = basenameFromPath(rawValue).toLowerCase();
    if (!filename) return null;

    if (byOptimizedFilename.has(filename)) {
      return byOptimizedFilename.get(filename) ?? null;
    }

    const withoutExt = removeExtension(filename);
    if (bySlug.has(withoutExt)) {
      return bySlug.get(withoutExt) ?? null;
    }

    const withoutVariant = removeResponsiveSuffix(withoutExt);
    if (bySlug.has(withoutVariant)) {
      return bySlug.get(withoutVariant) ?? null;
    }

    return null;
  };
};
