// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://spicebushmontessori.org',
  integrations: [
    tailwind(),
    sitemap(),
    react()
  ],
  output: 'server',
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
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        external: ['resend', '@sendgrid/mail', 'postmark'],
        output: {
          // Manual chunk strategy for better code splitting
          manualChunks: (id) => {
            // Vendor chunk for React framework
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            
            // Separate chunk for icon libraries
            if (id.includes('lucide-astro') || 
                id.includes('lucide')) {
              return 'icons-vendor';
            }
            
            // Content processing libraries
            if (id.includes('marked') || 
                id.includes('dompurify') || 
                id.includes('isomorphic-dompurify')) {
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
