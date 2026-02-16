import { db, type ContentEntry } from '@lib/db';
import { logError } from '@lib/error-logger';
import { query, queryFirst } from '@lib/db/client';

export const TESTIMONIAL_CATEGORY_OPTIONS = [
  'general',
  'teachers',
  'programs',
  'admissions',
  'values'
] as const;

export type TestimonialCategory = (typeof TESTIMONIAL_CATEGORY_OPTIONS)[number];
export type TestimonialPlacement = 'homepage' | 'coming-soon';

interface TestimonialSeedItem {
  slug: string;
  title: string;
  body: string;
  author: string;
  authorTitle: string;
  relationship: string;
  rating: number;
  featured: boolean;
  active: boolean;
  showOnHomepage: boolean;
  showOnComingSoon: boolean;
  displayOrder: number;
  category: string;
  categories?: string[];
  date: string;
  childAge?: string;
  yearsAtSpicebush?: number;
}

export interface ManagedTestimonial {
  id: string;
  slug: string;
  title: string;
  body: string;
  author: string;
  authorTitle: string;
  relationship: string;
  authorPhoto?: string;
  authorPhotoSlug?: string;
  rating: number;
  featured: boolean;
  active: boolean;
  showOnHomepage: boolean;
  showOnComingSoon: boolean;
  displayOrder: number;
  category: string;
  categories: string[];
  childAge?: string;
  yearsAtSpicebush?: number;
  dateLabel?: string;
  dateValue?: Date;
}

export interface TestimonialDisplayRule {
  enabled: boolean;
  minRating: number;
  maxItems: number;
  requireFeatured: boolean;
  allowedCategories: string[];
}

export interface TestimonialDisplayRules {
  homepage: TestimonialDisplayRule;
  'coming-soon': TestimonialDisplayRule;
}

export const TESTIMONIAL_DISPLAY_SETTING_KEYS = {
  homepage: {
    enabled: 'testimonials_home_enabled',
    minRating: 'testimonials_home_min_rating',
    maxItems: 'testimonials_home_max_items',
    requireFeatured: 'testimonials_home_require_featured',
    allowedCategories: 'testimonials_home_allowed_categories'
  },
  'coming-soon': {
    enabled: 'testimonials_coming_soon_enabled',
    minRating: 'testimonials_coming_soon_min_rating',
    maxItems: 'testimonials_coming_soon_max_items',
    requireFeatured: 'testimonials_coming_soon_require_featured',
    allowedCategories: 'testimonials_coming_soon_allowed_categories'
  }
} as const;

export const DEFAULT_TESTIMONIAL_DISPLAY_RULES: TestimonialDisplayRules = {
  homepage: {
    enabled: true,
    minRating: 4,
    maxItems: 3,
    requireFeatured: false,
    allowedCategories: []
  },
  'coming-soon': {
    enabled: false,
    minRating: 4,
    maxItems: 3,
    requireFeatured: true,
    allowedCategories: []
  }
};

const DEFAULT_TESTIMONIALS: readonly TestimonialSeedItem[] = [
  {
    slug: 'bonnie-h-parent',
    title: 'Bonnie H.',
    body: "What I love most about Spicebush is how they embrace each child's uniqueness. The teachers create such a nurturing environment where children feel safe to explore and make mistakes. Our son has flourished here, developing not just academically but emotionally and socially. The focus on peace and community really shows in how the children interact with each other.",
    author: 'Bonnie H.',
    authorTitle: 'Parent',
    relationship: 'Parent',
    rating: 5,
    featured: true,
    active: true,
    showOnHomepage: true,
    showOnComingSoon: true,
    displayOrder: 1,
    category: 'values',
    date: '2024-02-20',
    childAge: '5 years old',
    yearsAtSpicebush: 1
  },
  {
    slug: 'madeleine-s-parent',
    title: 'Madeleine S.',
    body: "Kirsti and Leah are amazing teachers who truly understand each child as an individual. They've helped my daughter gain confidence and develop a genuine love for learning. The mixed-age environment has been perfect for her social development, and we've seen incredible growth in her independence and problem-solving skills.",
    author: 'Madeleine S.',
    authorTitle: 'Parent',
    relationship: 'Parent',
    rating: 5,
    featured: true,
    active: true,
    showOnHomepage: true,
    showOnComingSoon: true,
    displayOrder: 2,
    category: 'teachers',
    date: '2024-01-15',
    childAge: '4 years old',
    yearsAtSpicebush: 2
  },
  {
    slug: 'manisha-a-parent',
    title: 'Manisha A.',
    body: "The Montessori approach at Spicebush has been transformative for our daughter. She's become so independent and curious about everything around her. The teachers, especially Kira, have such patience and skill in guiding children toward their interests. The hands-on learning materials and the outdoor time have made such a difference in her development. We couldn't be happier with our choice.",
    author: 'Manisha A.',
    authorTitle: 'Parent',
    relationship: 'Parent',
    rating: 5,
    featured: true,
    active: true,
    showOnHomepage: true,
    showOnComingSoon: true,
    displayOrder: 3,
    category: 'programs',
    date: '2024-03-10',
    childAge: '3 years old',
    yearsAtSpicebush: 1
  }
];

const stringFrom = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

const boolFrom = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const numberFrom = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const integerFrom = (value: unknown, fallback: number): number => {
  const numeric = numberFrom(value, fallback);
  return Math.trunc(numeric);
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const normalizeCategory = (value: unknown, fallback = 'general'): string => {
  const normalized = stringFrom(value, fallback)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : fallback;
};

const parseDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
};

const parseCategoryList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCategory(item, ''))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => normalizeCategory(item, ''))
            .filter((item) => item.length > 0);
        }
      } catch {
        // Fall through to CSV parsing.
      }
    }

    return trimmed
      .split(/[\n,]/)
      .map((item) => normalizeCategory(item, ''))
      .filter((item) => item.length > 0);
  }

  return [];
};

const uniqueList = (items: string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      unique.push(item);
    }
  }

  return unique;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const getNormalizedCategories = (
  categoriesValue: unknown,
  categoryValue: unknown,
  fallback = 'general'
): string[] => {
  const combined = uniqueList([
    ...parseCategoryList(categoriesValue),
    ...parseCategoryList(categoryValue)
  ]);

  if (combined.length > 0) {
    return combined;
  }

  return [normalizeCategory(fallback)];
};

const toContentDataFromSeed = (seed: TestimonialSeedItem): Record<string, unknown> => ({
  categories: getNormalizedCategories(seed.categories, seed.category),
  title: seed.title,
  body: seed.body,
  author: seed.author,
  authorTitle: seed.authorTitle,
  relationship: seed.relationship,
  rating: seed.rating,
  featured: seed.featured,
  active: seed.active,
  show_on_homepage: seed.showOnHomepage,
  show_on_coming_soon: seed.showOnComingSoon,
  display_order: seed.displayOrder,
  category: getNormalizedCategories(seed.categories, seed.category)[0] ?? normalizeCategory(seed.category),
  date: seed.date,
  childAge: seed.childAge ?? '',
  yearsAtSpicebush: seed.yearsAtSpicebush ?? null
});

const toManagedFromSeed = (seed: TestimonialSeedItem): ManagedTestimonial => {
  const dateValue = parseDate(seed.date);
  const categories = getNormalizedCategories(seed.categories, seed.category);

  return {
    id: seed.slug,
    slug: seed.slug,
    title: seed.title,
    body: seed.body,
    author: seed.author,
    authorTitle: seed.authorTitle,
    relationship: seed.relationship,
    authorPhoto: undefined,
    authorPhotoSlug: undefined,
    rating: clamp(Math.round(seed.rating), 1, 5),
    featured: seed.featured,
    active: seed.active,
    showOnHomepage: seed.showOnHomepage,
    showOnComingSoon: seed.showOnComingSoon,
    displayOrder: seed.displayOrder,
    category: categories[0] ?? normalizeCategory(seed.category),
    categories,
    childAge: seed.childAge,
    yearsAtSpicebush: seed.yearsAtSpicebush,
    dateLabel: stringFrom(seed.date, ''),
    dateValue
  };
};

export const normalizeTestimonialEntry = (entry: ContentEntry<Record<string, unknown>>): ManagedTestimonial | null => {
  const data = asRecord(entry.data);

  const author = stringFrom(data.author, stringFrom(data.name, ''));
  const body = stringFrom(entry.body, stringFrom(data.body, stringFrom(data.quote, '')));
  if (!author || !body) {
    return null;
  }

  const featured = boolFrom(data.featured, false);
  const dateValue = parseDate(data.date);
  const categories = getNormalizedCategories(data.categories, data.category);
  const category = categories[0] ?? 'general';

  const rating = clamp(Math.round(numberFrom(data.rating, 5)), 1, 5);

  const authorTitle = stringFrom(data.authorTitle, stringFrom(data.relationship, 'Parent'));
  const relationship = stringFrom(data.relationship, authorTitle);
  const authorPhoto = stringFrom(data.authorPhoto, '');
  const authorPhotoSlug = stringFrom(data.authorPhotoSlug, '');
  const active = boolFrom(data.active, true);
  const showOnHomepage = boolFrom(data.show_on_homepage, true);
  const showOnComingSoon = boolFrom(data.show_on_coming_soon, featured);
  const displayOrder = clamp(integerFrom(data.display_order, 999), 1, 9999);

  const childAge = stringFrom(data.childAge, '');
  const yearsAtSpicebushValue = integerFrom(data.yearsAtSpicebush, Number.NaN);

  return {
    id: entry.id,
    slug: entry.slug,
    title: stringFrom(data.title, author),
    body,
    author,
    authorTitle,
    relationship,
    authorPhoto: authorPhoto || undefined,
    authorPhotoSlug: authorPhotoSlug || undefined,
    rating,
    featured,
    active,
    showOnHomepage,
    showOnComingSoon,
    displayOrder,
    category,
    categories,
    childAge: childAge || undefined,
    yearsAtSpicebush: Number.isFinite(yearsAtSpicebushValue) ? yearsAtSpicebushValue : undefined,
    dateLabel: stringFrom(data.date, ''),
    dateValue
  };
};

export const sortTestimonials = (items: ManagedTestimonial[]): ManagedTestimonial[] =>
  [...items].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.dateValue && b.dateValue) return b.dateValue.getTime() - a.dateValue.getTime();
    if (a.dateValue) return -1;
    if (b.dateValue) return 1;
    return a.author.localeCompare(b.author);
  });

const parsePlacementRulesFromSettings = (
  settings: Record<string, unknown>,
  placement: TestimonialPlacement
): TestimonialDisplayRule => {
  const defaults = DEFAULT_TESTIMONIAL_DISPLAY_RULES[placement];
  const keys = TESTIMONIAL_DISPLAY_SETTING_KEYS[placement];

  return {
    enabled: boolFrom(settings[keys.enabled], defaults.enabled),
    minRating: clamp(integerFrom(settings[keys.minRating], defaults.minRating), 1, 5),
    maxItems: clamp(integerFrom(settings[keys.maxItems], defaults.maxItems), 1, 24),
    requireFeatured: boolFrom(settings[keys.requireFeatured], defaults.requireFeatured),
    allowedCategories: uniqueList(parseCategoryList(settings[keys.allowedCategories]))
  };
};

export const getTestimonialDisplayRules = async (
  settingsOverride?: Record<string, unknown>
): Promise<TestimonialDisplayRules> => {
  const settings = settingsOverride ?? ((await db.content.getAllSettings()) as Record<string, unknown>);

  return {
    homepage: parsePlacementRulesFromSettings(settings, 'homepage'),
    'coming-soon': parsePlacementRulesFromSettings(settings, 'coming-soon')
  };
};

export const filterTestimonialsForPlacement = (
  items: ManagedTestimonial[],
  rules: TestimonialDisplayRules,
  placement: TestimonialPlacement
): ManagedTestimonial[] => {
  const rule = rules[placement];
  if (!rule.enabled) return [];

  const filtered = items.filter((item) => {
    if (!item.active) return false;
    if (item.rating < rule.minRating) return false;

    const isPlacementEnabled = placement === 'homepage' ? item.showOnHomepage : item.showOnComingSoon;
    if (!isPlacementEnabled) return false;

    if (rule.requireFeatured && !item.featured) return false;

    if (
      rule.allowedCategories.length > 0
      && !item.categories.some((category) => rule.allowedCategories.includes(category))
    ) {
      return false;
    }

    return true;
  });

  return sortTestimonials(filtered).slice(0, rule.maxItems);
};

const seedPromiseMap = new Map<string, Promise<void>>();

const seedTestimonialsCollectionIfEmpty = async (): Promise<void> => {
  const row = await queryFirst<{ count: string | number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM content
      WHERE type = 'testimonials'
    `
  );

  const count = Number.parseInt(String(row?.count ?? '0'), 10);
  if (count > 0) return;

  const nowIso = new Date().toISOString();

  for (const seed of DEFAULT_TESTIMONIALS) {
    await query(
      `
        INSERT INTO content (type, slug, title, data, status, author_email, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
        ON CONFLICT (type, slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          data = EXCLUDED.data,
          status = EXCLUDED.status,
          author_email = EXCLUDED.author_email,
          updated_at = EXCLUDED.updated_at
      `,
      [
        'testimonials',
        seed.slug,
        seed.title,
        JSON.stringify(toContentDataFromSeed(seed)),
        'published',
        null,
        nowIso
      ]
    );
  }

  db.cache.invalidateCollection('testimonials');
};

const ensureSeeded = async (collectionName: string, handler: () => Promise<void>) => {
  const inFlight = seedPromiseMap.get(collectionName);
  if (inFlight) {
    await inFlight;
    return;
  }

  const promise = (async () => {
    try {
      await handler();
    } catch (error) {
      logError('testimonials.content', error, { action: 'ensureSeeded', collectionName });
    }
  })();

  seedPromiseMap.set(collectionName, promise);
  await promise;
  seedPromiseMap.delete(collectionName);
};

export const ensureTestimonialsSeeded = async (): Promise<void> => {
  await ensureSeeded('testimonials', seedTestimonialsCollectionIfEmpty);
};

export const getManagedTestimonials = async (): Promise<ManagedTestimonial[]> => {
  await ensureTestimonialsSeeded();

  try {
    const entries = (await db.content.getCollection('testimonials')) as ContentEntry<Record<string, unknown>>[];
    const normalized = sortTestimonials(
      entries
        .map(normalizeTestimonialEntry)
        .filter((item): item is ManagedTestimonial => item !== null)
    );

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (error) {
    logError('testimonials.content', error, { action: 'getManagedTestimonials' });
  }

  return sortTestimonials(DEFAULT_TESTIMONIALS.map(toManagedFromSeed));
};

export const getTestimonialsForPlacement = async (
  placement: TestimonialPlacement,
  settingsOverride?: Record<string, unknown>
): Promise<ManagedTestimonial[]> => {
  const [items, rules] = await Promise.all([
    getManagedTestimonials(),
    getTestimonialDisplayRules(settingsOverride)
  ]);

  return filterTestimonialsForPlacement(items, rules, placement);
};

export const categoriesToSettingValue = (categories: string[]): string =>
  uniqueList(categories.map((category) => normalizeCategory(category, '')))
    .filter((category) => category.length > 0)
    .join(', ');

export const settingValueToCategories = (value: unknown): string[] => uniqueList(parseCategoryList(value));
