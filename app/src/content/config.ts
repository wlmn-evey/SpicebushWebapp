import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().default('Spicebush Team'),
    categories: z.array(z.string()).default(['News']),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    excerpt: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

const staffCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string(),
    email: z.string().email().optional(),
    credentials: z.array(z.string()).default([]),
    languages: z.array(z.string()).default(['English']),
    startYear: z.number(),
    order: z.number().default(99)
  })
});

const tuitionCollection = defineCollection({
  type: 'content',
  schema: z.object({
    type: z.enum(['program', 'rate']),
    // Program fields
    name: z.string().optional(),
    program_type: z.enum(['Full Day', 'Half Day', 'Extended Care']).optional(),
    days_per_week: z.number().min(1).max(7).default(5).optional(),
    daily_hours: z.number().min(1).max(12).default(6.5).optional(),
    description: z.string().optional(),
    // Rate fields
    rate_label: z.string().optional(),
    program_id: z.string().optional(),
    tuition_price: z.number().optional(),
    extended_care_price: z.number().default(0).optional(),
    extended_care_available: z.boolean().default(false).optional(),
    is_constant_rate: z.boolean().default(false).optional(),
    school_year: z.string().default('2025-2026').optional(),
    income_threshold_type: z.enum(['Greater Than or Equal To', 'Less Than']).default('Greater Than or Equal To').optional(),
    income_threshold_family_2: z.number().optional(),
    income_threshold_family_3: z.number().optional(),
    income_threshold_family_4: z.number().optional(),
    income_threshold_family_5: z.number().optional(),
    income_threshold_family_6: z.number().optional(),
    income_threshold_family_7: z.number().optional(),
    income_threshold_family_8_plus: z.number().optional(),
    display_order: z.number().default(0),
    active: z.boolean().default(true)
  })
});

const settingsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    key: z.string(),
    value: z.string(),
    description: z.string().optional(),
    type: z.enum(['string', 'number', 'boolean', 'json']).default('string')
  })
});

const hoursCollection = defineCollection({
  type: 'content',
  schema: z.object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    open_time: z.string(),
    close_time: z.string(),
    is_closed: z.boolean().default(false),
    note: z.string().optional(),
    order: z.number()
  })
});

const testimonialsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    author: z.string(),
    name: z.string().optional(),
    authorTitle: z.string().optional(),
    relationship: z.string().optional(),
    authorPhoto: z.string().optional(),
    rating: z.number().min(1).max(5).default(5),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
    show_on_homepage: z.boolean().default(true),
    show_on_coming_soon: z.boolean().default(false),
    display_order: z.number().int().min(1).default(999),
    date: z.date().or(z.string()),
    category: z.enum(['general', 'teachers', 'programs', 'admissions', 'values']).default('general'),
    childAge: z.string().optional(),
    yearsAtSpicebush: z.number().optional()
  })
});

const schoolInfoCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Contact Information
    phone: z.string(),
    email: z.string().email(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string()
    }),
    
    // School Details
    agesServed: z.string(),
    schoolYear: z.string(),
    extendedCareUntil: z.string().optional(),
    
    // Social Media
    socialMedia: z.object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      twitter: z.string().url().optional()
    }).optional(),
    
    // Other Info
    founded: z.number().optional(),
    ein: z.string().optional(),
    accreditation: z.array(z.string()).optional()
  })
});

const photosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // File information
    originalFilename: z.string(),
    optimizedFilename: z.string(),
    category: z.enum(['homepage', 'about', 'programs', 'admissions', 'gallery', 'teachers', 'blog', 'art', 'classroom', 'events', 'group', 'individual', 'materials', 'outdoor', 'practical']),
    
    // Dimensions and format
    originalWidth: z.number(),
    originalHeight: z.number(),
    aspectRatio: z.string(),
    format: z.enum(['webp', 'jpg', 'png']).default('webp'),
    
    // Focal points (0-100 scale)
    primaryFocalX: z.number().min(0).max(100),
    primaryFocalY: z.number().min(0).max(100),
    primaryFocalWeight: z.number().min(1).max(10).default(10),
    primaryFocalDescription: z.string(),
    
    // Secondary focal point (optional)
    secondaryFocalX: z.number().min(0).max(100).optional(),
    secondaryFocalY: z.number().min(0).max(100).optional(),
    secondaryFocalWeight: z.number().min(1).max(10).default(5).optional(),
    secondaryFocalDescription: z.string().optional(),
    
    // Crop zones for responsive display
    mobileCropX: z.number().min(0).max(100).default(0),
    mobileCropY: z.number().min(0).max(100).default(0),
    mobileCropWidth: z.number().min(10).max(100).default(100),
    mobileCropHeight: z.number().min(10).max(100).default(100),
    
    tabletCropX: z.number().min(0).max(100).default(0),
    tabletCropY: z.number().min(0).max(100).default(0),
    tabletCropWidth: z.number().min(10).max(100).default(100),
    tabletCropHeight: z.number().min(10).max(100).default(100),
    
    // SEO and accessibility
    altText: z.string(),
    seoKeywords: z.array(z.string()),
    contextualDescription: z.string(),
    
    // Usage and classification
    usedOn: z.array(z.string()).default([]),
    primaryUse: z.string(),
    
    // Analysis metadata
    hasHumanFaces: z.boolean().default(false),
    hasChildren: z.boolean().default(false),
    hasMonressoriMaterials: z.boolean().default(false),
    dominantColors: z.array(z.string()).default([]),
    lighting: z.enum(['natural', 'indoor', 'mixed']).default('natural'),
    activity: z.string(),
    setting: z.enum(['classroom', 'outdoor', 'mixed', 'portrait', 'art area', 'outdoor classroom', 'montessori classroom', 'school event', 'outdoor playground', 'outdoor space', 'school gathering']).default('classroom'),
    
    // Performance flags
    compressed: z.boolean().default(true),
    hasWebP: z.boolean().default(true),
    hasSrcSet: z.boolean().default(true),
    lazyLoad: z.boolean().default(true),
    priority: z.boolean().default(false) // For above-the-fold images
  })
});

const comingSoonCollection = defineCollection({
  type: 'content',
  schema: z.object({
    enabled: z.boolean().default(false),
    launchDate: z.coerce.date(),
    headline: z.string(),
    message: z.string(),
    showContact: z.boolean().default(false),
    showSocial: z.boolean().default(false),
    backgroundImage: z.string().optional()
  })
});

export const collections = {
  blog: blogCollection,
  staff: staffCollection,
  tuition: tuitionCollection,
  settings: settingsCollection,
  hours: hoursCollection,
  testimonials: testimonialsCollection,
  photos: photosCollection,
  'school-info': schoolInfoCollection,
  'coming-soon': comingSoonCollection
};
