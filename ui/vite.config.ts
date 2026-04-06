import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon-150x150.png', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Notes',
        short_name: 'Notes',
        description: 'Note-taking app with rich text editing',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/realms\//, /^\/resources\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: [
      'prosemirror-state',
      'prosemirror-model',
      'prosemirror-view',
    ],
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/realms': {
        target: 'http://localhost:8080',
      },
      '/resources': {
        target: 'http://localhost:8080',
      },
    },
  },
  build: {
    outDir: 'build',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          react: ['react', 'react-dom'],

          // UI framework
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],

          // Drag and drop (only loaded when needed)
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],

          // Date pickers
          datepicker: ['@mui/x-date-pickers', 'dayjs'],

          // State management
          redux: ['@reduxjs/toolkit', 'react-redux'],

          // Routing
          router: ['react-router-dom'],

          // Utilities
          utils: ['axios'],

          // i18n
          i18n: [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
            'i18next-http-backend',
          ],

        },
      },
    },
  },
});
