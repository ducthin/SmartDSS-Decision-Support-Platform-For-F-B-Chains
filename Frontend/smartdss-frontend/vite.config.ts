import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'charts-vendor';
          }

          if (id.includes('/exceljs/')) {
            return 'excel-vendor';
          }

          if (id.includes('/sockjs-client/') || id.includes('/@stomp/')) {
            return 'ws-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
})
