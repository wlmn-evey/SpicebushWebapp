// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { config as loadDotenv } from 'dotenv';

// Server secrets are read from `process.env` only. Astro 7 inlines any private variable a module
// references through `import.meta.env` into the bundle (even behind an `import.meta.env.DEV`
// check), so local `.env` files are loaded into `process.env` here instead. Real environment
// variables win (no override), and bundlers never inline `process.env`, so nothing from
// `.env.local` can end up in `app/dist` or the SSR function.
loadDotenv({ path: ['.env.local', '.env'], quiet: true });

/** Drop a trailing slash from any path except the root. */
const stripTrailingSlash = pathname =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

// Pages that exist but must not be advertised in the sitemap: they redirect (302),
// are post-submit/utility screens, or render noindex.
const SITEMAP_EXCLUDED_PATHS = new Set([
  '/admissions/schedule-tour', // 302 to the tour destination
  '/camp', // 302 while camp mode is off
  '/enrollment', // 302 to /contact
  '/enrollment/thank-you',
  '/contact-success',
  '/donate/thank-you',
  '/coming-soon',
  '/camp-coming-soon',
  '/resources/parent-resources', // noindex
  '/resources/events' // placeholder, noindex
]);

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://spicebushmontessori.org',
  // Tailwind CSS 3 runs through PostCSS (postcss.config.mjs + the @tailwind
  // directives in src/styles/global.css). @astrojs/tailwind does not support Astro 6+.
  integrations: [
    sitemap({
      // Exclude routes that are owned by the dynamic blog sitemap, are redirect-only,
      // or are admin/auth surfaces that should not be advertised to crawlers (R3-F8/R4-F4).
      filter: page => {
        const pathname = stripTrailingSlash(new URL(page).pathname);
        if (pathname === '/blog' || pathname.startsWith('/blog/')) return false;
        if (pathname === '/resources/blog' || pathname.startsWith('/resources/blog/')) return false;
        if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
        if (pathname.startsWith('/auth/')) return false;
        if (SITEMAP_EXCLUDED_PATHS.has(pathname)) return false;
        return true;
      },
      // Canonical URLs carry no trailing slash (seo-config.ts); make the sitemap agree so
      // crawlers see one URL per page. Routing still answers both forms (trailingSlash: 'ignore').
      serialize: item => {
        const url = new URL(item.url);
        url.pathname = stripTrailingSlash(url.pathname);
        return { ...item, url: url.href };
      }
    }),
    react()
  ],
  output: 'server',
  // Astro 7 changed the default to 'jsx', which can drop whitespace between inline
  // elements. Keep the pre-7 behavior.
  compressHTML: true,
  adapter: netlify(),
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          // Manual chunk strategy for better code splitting
          manualChunks: id => {
            // Vendor chunk for React framework
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'react-vendor';
            }

            // Separate chunk for icon libraries
            if (id.includes('lucide-astro') || id.includes('lucide')) {
              return 'icons-vendor';
            }

            // Content processing libraries
            if (
              id.includes('marked') ||
              id.includes('dompurify') ||
              id.includes('isomorphic-dompurify')
            ) {
              return 'content-vendor';
            }

            // Keep other node_modules in a general vendor chunk
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      },
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000
    }
  }
});
