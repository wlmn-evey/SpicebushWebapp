import { defineCollection, z } from 'astro:content';

// Blog collection - simple and straightforward
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().default('Spicebush Montessori'),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Teachers collection - what we actually need
const teachers = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    image: z.string(),
    email: z.string().email().optional(),
    credentials: z.array(z.string()).default([]),
    order: z.number().default(999), // For sorting
    active: z.boolean().default(true),
  }),
});

// Programs collection - clear and simple
const programs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    shortDescription: z.string(),
    ageRange: z.string(), // e.g., "3-6 years"
    schedule: z.string(), // e.g., "Monday-Friday, 8:30am-3:30pm"
    image: z.string().optional(),
    order: z.number().default(999),
    active: z.boolean().default(true),
  }),
});

export const collections = { blog, teachers, programs };