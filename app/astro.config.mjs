// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    tailwind(),
    sitemap(),
    react()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      // Make specific DB_READONLY vars available during build
      'process.env.DB_READONLY_HOST': JSON.stringify(process.env.DB_READONLY_HOST),
      'process.env.DB_READONLY_PORT': JSON.stringify(process.env.DB_READONLY_PORT),
      'process.env.DB_READONLY_DATABASE': JSON.stringify(process.env.DB_READONLY_DATABASE),
      'process.env.DB_READONLY_USER': JSON.stringify(process.env.DB_READONLY_USER),
      'process.env.DB_READONLY_PASSWORD': JSON.stringify(process.env.DB_READONLY_PASSWORD)
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
        output: {
          // Manual chunk strategy for better code splitting
          manualChunks: (id) => {
            // Vendor chunk for React framework
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            
            // Separate chunk for Stripe payment libraries
            if (id.includes('@stripe/stripe-js') || 
                id.includes('@stripe/react-stripe-js')) {
              return 'stripe-vendor';
            }
            
            // Separate chunk for Supabase client
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase-vendor';
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