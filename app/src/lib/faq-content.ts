import { logError } from '@lib/error-logger';
import { db, type ContentEntry } from '@lib/db';
import { query, queryFirst } from '@lib/db/client';

export type FaqListStyle = 'none' | 'unordered' | 'ordered';

interface FaqSeedItem {
  slug: string;
  title: string;
  question: string;
  answer: string;
  sectionTitle: string;
  sectionOrder: number;
  itemOrder: number;
  listStyle: FaqListStyle;
  bullets: string[];
  note: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface FaqItem {
  slug: string;
  title: string;
  question: string;
  answer: string;
  sectionTitle: string;
  sectionOrder: number;
  itemOrder: number;
  listStyle: FaqListStyle;
  bullets: string[];
  note: string;
  ctaLabel: string;
  ctaUrl: string;
  status: string;
}

export interface FaqSection {
  key: string;
  title: string;
  order: number;
  items: FaqItem[];
}

const toSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const stringFrom = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

const numberFrom = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const listStyleFrom = (value: unknown): FaqListStyle => {
  const normalized = stringFrom(value).toLowerCase();
  if (normalized === 'ordered' || normalized === 'unordered') return normalized;
  return 'none';
};

const stringArrayFrom = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toFaqItemFromSeed = (seed: FaqSeedItem): FaqItem => ({
  slug: seed.slug,
  title: seed.title,
  question: seed.question,
  answer: seed.answer,
  sectionTitle: seed.sectionTitle,
  sectionOrder: seed.sectionOrder,
  itemOrder: seed.itemOrder,
  listStyle: seed.listStyle,
  bullets: [...seed.bullets],
  note: seed.note,
  ctaLabel: seed.ctaLabel ?? '',
  ctaUrl: seed.ctaUrl ?? '',
  status: 'published'
});

const toFaqDataPayload = (seed: FaqSeedItem): Record<string, unknown> => ({
  title: seed.title,
  question: seed.question,
  answer: seed.answer,
  section_title: seed.sectionTitle,
  section_order: seed.sectionOrder,
  item_order: seed.itemOrder,
  list_style: seed.listStyle,
  bullets: seed.bullets,
  note: seed.note,
  cta_label: seed.ctaLabel ?? '',
  cta_url: seed.ctaUrl ?? ''
});

export const DEFAULT_FAQ_ITEMS: readonly FaqSeedItem[] = [
  {
    slug: 'faq-enrollment-and-admissions-01',
    title: 'What ages do you serve?',
    question: 'What ages do you serve?',
    answer:
      'We serve children ages 3-6 years old in our Preschool and Kindergarten program. Children must be 3 years old by September 1st to enroll. We maintain a mixed-age classroom following the Montessori approach, which allows younger children to learn from older peers and older children to develop leadership skills.',
    sectionTitle: 'Enrollment & Admissions',
    sectionOrder: 1,
    itemOrder: 1,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-enrollment-and-admissions-02',
    title: 'Do children need to be potty trained?',
    question: 'Do children need to be potty trained?',
    answer:
      "We welcome children at various stages of toilet learning. While we encourage independence, we understand that each child develops at their own pace. Our teachers work with families to support toilet learning in a respectful, pressure-free way. Please discuss your child's specific needs during your tour.",
    sectionTitle: 'Enrollment & Admissions',
    sectionOrder: 1,
    itemOrder: 2,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-enrollment-and-admissions-03',
    title: 'When can we apply for enrollment?',
    question: 'When can we apply for enrollment?',
    answer:
      'We accept applications year-round for our waitlist. Open enrollment for the following school year typically begins in January, with tours starting in November. We encourage families to schedule a tour first to ensure our program is a good fit. Priority is given to siblings of current students and families who demonstrate alignment with our values.',
    sectionTitle: 'Enrollment & Admissions',
    sectionOrder: 1,
    itemOrder: 3,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-enrollment-and-admissions-04',
    title: 'What is your enrollment process?',
    question: 'What is your enrollment process?',
    answer: 'Our enrollment process has three simple steps:',
    sectionTitle: 'Enrollment & Admissions',
    sectionOrder: 1,
    itemOrder: 4,
    listStyle: 'ordered',
    bullets: [
      'Schedule a Tour: Visit our school to see our environment and meet our teachers',
      'Submit Application: Complete our online application with a $50 non-refundable fee',
      "Enrollment Decision: We'll contact you within 2 weeks regarding acceptance"
    ],
    note: "Once accepted, a deposit equal to one month's tuition secures your child's spot."
  },
  {
    slug: 'faq-tuition-and-financial-aid-01',
    title: 'How much is tuition?',
    question: 'How much is tuition?',
    answer:
      "We use a sliding scale tuition model based on family income, ranging from $185 to $1,850 per month for our full-day program. Use our Tuition Calculator to estimate your family's tuition based on your income and family size. We believe every family should have access to quality Montessori education.",
    sectionTitle: 'Tuition & Financial Aid',
    sectionOrder: 2,
    itemOrder: 1,
    listStyle: 'none',
    bullets: [],
    note: '',
    ctaLabel: 'Tuition Calculator',
    ctaUrl: '/admissions/tuition-calculator'
  },
  {
    slug: 'faq-tuition-and-financial-aid-02',
    title: 'Do you offer financial aid beyond the sliding scale?',
    question: 'Do you offer financial aid beyond the sliding scale?',
    answer:
      'Our sliding scale tuition is our primary form of financial aid, making our program accessible to families across income levels. In cases of exceptional financial hardship, we may have limited additional aid available. We also accept state childcare subsidies and can provide documentation for dependent care FSA accounts.',
    sectionTitle: 'Tuition & Financial Aid',
    sectionOrder: 2,
    itemOrder: 2,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-tuition-and-financial-aid-03',
    title: 'What is included in tuition?',
    question: 'What is included in tuition?',
    answer: 'Tuition includes:',
    sectionTitle: 'Tuition & Financial Aid',
    sectionOrder: 2,
    itemOrder: 3,
    listStyle: 'unordered',
    bullets: [
      'All educational materials and supplies',
      'Morning and afternoon snacks (organic when possible)',
      'Enrichment activities (art, music, gardening)',
      'On-campus enrichment experiences and special visitors',
      'Parent education workshops'
    ],
    note: 'Families provide lunch and any special dietary items. Extended care (4:00-5:30 PM) is available for an additional fee.'
  },
  {
    slug: 'faq-daily-life-and-schedule-01',
    title: 'What are your school hours?',
    question: 'What are your school hours?',
    answer:
      'Our regular school day runs from 8:00 AM to 4:00 PM, Monday through Friday. We offer extended care until 5:30 PM for families who need it. Drop-off begins at 7:45 AM, and we ask that all children arrive by 8:30 AM to fully participate in the morning work cycle.',
    sectionTitle: 'Daily Life & Schedule',
    sectionOrder: 3,
    itemOrder: 1,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-daily-life-and-schedule-02',
    title: 'What does a typical day look like?',
    question: 'What does a typical day look like?',
    answer: 'A typical day includes:',
    sectionTitle: 'Daily Life & Schedule',
    sectionOrder: 3,
    itemOrder: 2,
    listStyle: 'unordered',
    bullets: [
      '8:00-8:30 AM: Arrival and morning greeting',
      '8:30-11:30 AM: Morning work cycle (uninterrupted Montessori work time)',
      '11:30 AM-12:00 PM: Lunch',
      '12:00-1:00 PM: Outdoor play',
      '1:00-3:00 PM: Afternoon work cycle or rest for younger children',
      '3:00-3:30 PM: Snack and story time',
      '3:30-4:00 PM: Outdoor play and dismissal'
    ],
    note: ''
  },
  {
    slug: 'faq-daily-life-and-schedule-03',
    title: 'Do children nap at school?',
    question: 'Do children nap at school?',
    answer:
      "We provide a rest time for children who need it, typically our younger students. Children who don't nap engage in quiet activities like looking at books, drawing, or working with quiet materials. We work with each family to honor their child's individual rest needs while maintaining a peaceful environment for all.",
    sectionTitle: 'Daily Life & Schedule',
    sectionOrder: 3,
    itemOrder: 3,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-daily-life-and-schedule-04',
    title: 'What do children eat at school?',
    question: 'What do children eat at school?',
    answer:
      "We provide healthy morning and afternoon snacks, often including fresh fruits, vegetables, and whole grains. Many snacks are prepared by the children as part of our practical life curriculum. Families pack lunch for their children. We're a nut-free school and accommodate various dietary restrictions. Water is available throughout the day.",
    sectionTitle: 'Daily Life & Schedule',
    sectionOrder: 3,
    itemOrder: 4,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-educational-approach-01',
    title: 'What makes Montessori different?',
    question: 'What makes Montessori different?',
    answer:
      'Montessori education is child-centered and based on scientific observations of how children learn. Key differences include:',
    sectionTitle: 'Educational Approach',
    sectionOrder: 4,
    itemOrder: 1,
    listStyle: 'unordered',
    bullets: [
      'Multi-age classrooms (3-6 years together)',
      'Self-directed learning with teacher guidance',
      'Hands-on materials that make abstract concepts concrete',
      'Uninterrupted work cycles (3 hours)',
      'Focus on intrinsic motivation rather than external rewards',
      'Emphasis on independence and practical life skills'
    ],
    note: ''
  },
  {
    slug: 'faq-educational-approach-02',
    title: 'How do you support different learning styles?',
    question: 'How do you support different learning styles?',
    answer:
      'Montessori education naturally accommodates different learning styles through its multi-sensory approach. Children can see, touch, and manipulate materials, supporting visual, kinesthetic, and auditory learners. Our teachers observe each child to understand their unique needs and interests, adapting presentations and offering materials that match their learning style. We celebrate neurodiversity and work with families to support children with various learning differences.',
    sectionTitle: 'Educational Approach',
    sectionOrder: 4,
    itemOrder: 2,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-educational-approach-03',
    title: 'Do children learn academics like reading and math?',
    question: 'Do children learn academics like reading and math?',
    answer:
      'Yes! Montessori children often learn to read and work with mathematical concepts earlier than in traditional settings because the materials make these concepts tangible and engaging. However, we follow each child\'s readiness and interest. Some children may be reading at 4, while others begin at 6 - both timelines are perfectly normal. Our materials cover language, mathematics, sensorial exploration, practical life, and cultural studies (science, geography, art, music).',
    sectionTitle: 'Educational Approach',
    sectionOrder: 4,
    itemOrder: 3,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-educational-approach-04',
    title: 'How do you assess progress without grades?',
    question: 'How do you assess progress without grades?',
    answer:
      "We use careful observation and detailed record-keeping to track each child's progress. Teachers maintain portfolios showing growth across all areas of development. We share progress through regular parent conferences, narrative reports, and examples of your child's work. This approach provides a much richer picture of your child's development than traditional grades, focusing on growth and mastery rather than comparison to others.",
    sectionTitle: 'Educational Approach',
    sectionOrder: 4,
    itemOrder: 4,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-inclusion-and-support-01',
    title: 'Do you accept children with special needs?',
    question: 'Do you accept children with special needs?',
    answer:
      "We welcome all children and believe deeply in inclusive education. Montessori's individualized approach naturally supports children with various learning differences, including ADHD, autism, sensory processing differences, and other needs. We work closely with families and support specialists to ensure each child thrives. Please discuss your child's specific needs during your tour so we can plan together.",
    sectionTitle: 'Inclusion & Support',
    sectionOrder: 5,
    itemOrder: 1,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-inclusion-and-support-02',
    title: 'Can therapists come to school?',
    question: 'Can therapists come to school?',
    answer:
      "Yes, we welcome support specialists including speech therapists, occupational therapists, and behavioral specialists to work with children at school. We can provide space for services and collaborate with your child's support team. This allows children to receive needed services without missing school time and helps us implement strategies consistently throughout the day.",
    sectionTitle: 'Inclusion & Support',
    sectionOrder: 5,
    itemOrder: 2,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-inclusion-and-support-03',
    title: 'How do you handle behavioral challenges?',
    question: 'How do you handle behavioral challenges?',
    answer:
      "We view challenging behaviors as communication about unmet needs. Our approach focuses on understanding the child, adjusting the environment, teaching skills, and building connection. We use positive discipline techniques, never punishment or shame. Our prepared environment and individualized approach often prevent behavioral challenges. When they arise, we work collaboratively with families to support the child's growth.",
    sectionTitle: 'Inclusion & Support',
    sectionOrder: 5,
    itemOrder: 3,
    listStyle: 'none',
    bullets: [],
    note: ''
  },
  {
    slug: 'faq-parent-and-family-involvement-01',
    title: 'How can parents be involved?',
    question: 'How can parents be involved?',
    answer: 'We encourage family involvement in many ways:',
    sectionTitle: 'Parent & Family Involvement',
    sectionOrder: 6,
    itemOrder: 1,
    listStyle: 'unordered',
    bullets: [
      'Classroom observations (after your child is settled)',
      'Parent education evenings on Montessori principles',
      'Volunteering for special events and classroom support',
      'Sharing your culture, skills, or profession with the class',
      'Participating in workdays to maintain our environment',
      'Joining committees (fundraising, events, diversity & inclusion)'
    ],
    note: ''
  },
  {
    slug: 'faq-parent-and-family-involvement-02',
    title: 'How do you communicate with families?',
    question: 'How do you communicate with families?',
    answer: 'We maintain open communication through:',
    sectionTitle: 'Parent & Family Involvement',
    sectionOrder: 6,
    itemOrder: 2,
    listStyle: 'unordered',
    bullets: [
      'Daily brief check-ins at drop-off and pick-up',
      'Weekly classroom updates with photos and progress notes',
      'Parent-teacher conferences twice yearly',
      "Digital portfolio updates showing your child's work",
      'Parent education evenings and community events',
      'Open-door policy for questions or concerns'
    ],
    note: ''
  }
];

export const normalizeFaqEntry = (entry: ContentEntry<Record<string, unknown>>): FaqItem => {
  const data = asRecord(entry.data);
  const question = stringFrom(data.question, stringFrom(data.title, entry.slug));
  const answer = stringFrom(data.answer, '');
  const sectionTitle = stringFrom(data.section_title, 'General FAQs');
  const ctaUrl = stringFrom(data.cta_url, '');

  return {
    slug: entry.slug,
    title: stringFrom(data.title, question),
    question,
    answer,
    sectionTitle,
    sectionOrder: numberFrom(data.section_order, 99),
    itemOrder: numberFrom(data.item_order, 999),
    listStyle: listStyleFrom(data.list_style),
    bullets: stringArrayFrom(data.bullets),
    note: stringFrom(data.note, ''),
    ctaLabel: stringFrom(data.cta_label, ctaUrl ? 'Learn more' : ''),
    ctaUrl,
    status: stringFrom(data.status, 'published')
  };
};

export const sortFaqItems = (items: FaqItem[]): FaqItem[] =>
  [...items].sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
    if (a.sectionTitle !== b.sectionTitle) return a.sectionTitle.localeCompare(b.sectionTitle);
    if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
    return a.question.localeCompare(b.question);
  });

export const groupFaqItems = (items: FaqItem[]): FaqSection[] => {
  const grouped = new Map<string, FaqSection>();

  for (const item of sortFaqItems(items)) {
    const key = toSlug(item.sectionTitle) || 'general-faqs';
    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(key, {
        key,
        title: item.sectionTitle,
        order: item.sectionOrder,
        items: [item]
      });
    }
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
};

let seedPromise: Promise<void> | null = null;

const seedFaqCollectionIfEmpty = async (): Promise<void> => {
  const row = await queryFirst<{ count: string | number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM content
      WHERE type = 'faq'
    `
  );

  const existingCount = Number.parseInt(String(row?.count ?? '0'), 10);
  if (existingCount > 0) return;

  const nowIso = new Date().toISOString();

  for (const seed of DEFAULT_FAQ_ITEMS) {
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
        'faq',
        seed.slug,
        seed.title,
        JSON.stringify(toFaqDataPayload(seed)),
        'published',
        null,
        nowIso
      ]
    );
  }

  db.cache.invalidateCollection('faq');
};

export const ensureFaqSeeded = async (): Promise<void> => {
  if (seedPromise) {
    await seedPromise;
    return;
  }

  seedPromise = (async () => {
    try {
      await seedFaqCollectionIfEmpty();
    } catch (error) {
      logError('faq.content', error, { action: 'ensureFaqSeeded' });
    }
  })();

  await seedPromise;
  seedPromise = null;
};

export const getManagedFaqItems = async (): Promise<FaqItem[]> => {
  await ensureFaqSeeded();

  try {
    const entries = (await db.content.getCollection('faq')) as ContentEntry<Record<string, unknown>>[];
    const normalized = sortFaqItems(entries.map(normalizeFaqEntry));

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (error) {
    logError('faq.content', error, { action: 'getManagedFaqItems' });
  }

  return sortFaqItems(DEFAULT_FAQ_ITEMS.map(toFaqItemFromSeed));
};

export const getManagedFaqSections = async (): Promise<FaqSection[]> => {
  const items = await getManagedFaqItems();
  return groupFaqItems(items);
};
