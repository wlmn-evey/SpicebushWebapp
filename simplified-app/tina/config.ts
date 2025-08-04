import { defineConfig } from 'tinacms';

// Simple, straightforward TinaCMS configuration
export default defineConfig({
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',
  
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },
  
  schema: {
    collections: [
      {
        name: 'blog',
        label: 'Blog Posts',
        path: 'src/content/blog',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: true,
          },
          {
            type: 'datetime',
            name: 'publishDate',
            label: 'Publish Date',
            required: true,
          },
          {
            type: 'string',
            name: 'author',
            label: 'Author',
            options: ['Spicebush Montessori', 'Guest Author'],
          },
          {
            type: 'image',
            name: 'image',
            label: 'Featured Image',
          },
          {
            type: 'boolean',
            name: 'draft',
            label: 'Draft',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Body',
            isBody: true,
          },
        ],
      },
      {
        name: 'teachers',
        label: 'Teachers',
        path: 'src/content/teachers',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'name',
            label: 'Name',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'role',
            label: 'Role',
            required: true,
          },
          {
            type: 'image',
            name: 'image',
            label: 'Photo',
            required: true,
          },
          {
            type: 'string',
            name: 'email',
            label: 'Email',
          },
          {
            type: 'string',
            name: 'credentials',
            label: 'Credentials',
            list: true,
          },
          {
            type: 'number',
            name: 'order',
            label: 'Display Order',
          },
          {
            type: 'boolean',
            name: 'active',
            label: 'Active',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Bio',
            isBody: true,
          },
        ],
      },
      {
        name: 'programs',
        label: 'Programs',
        path: 'src/content/programs',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Program Name',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'shortDescription',
            label: 'Short Description',
            required: true,
          },
          {
            type: 'string',
            name: 'ageRange',
            label: 'Age Range',
            required: true,
          },
          {
            type: 'string',
            name: 'schedule',
            label: 'Schedule',
            required: true,
          },
          {
            type: 'image',
            name: 'image',
            label: 'Featured Image',
          },
          {
            type: 'number',
            name: 'order',
            label: 'Display Order',
          },
          {
            type: 'boolean',
            name: 'active',
            label: 'Active',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Program Details',
            isBody: true,
          },
        ],
      },
    ],
  },
});