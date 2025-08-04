// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// Simple, clean configuration
export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    mdx(),
    tailwind(),
  ],
  // TinaCMS will handle the content editing
  // Keep build output simple and static
  output: 'static',
});