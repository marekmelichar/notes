import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: [
      '@blocknote/core',
      '@blocknote/react',
      '@blocknote/mantine',
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
