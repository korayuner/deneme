import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/directus': {
        target: process.env.DIRECTUS_URL || 'http://directus:8055',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/directus/, ''),
      },
      '/api/paperless': {
        target: process.env.PAPERLESS_URL || 'http://paperless-ngx:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/paperless/, ''),
      },
      '/api/n8n': {
        target: process.env.N8N_URL || 'http://n8n:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
      '/api/pdf': {
        target: process.env.PDF_SERVICE_URL || 'http://pdf-service:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pdf/, ''),
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
})
