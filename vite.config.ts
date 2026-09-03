import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true,
    host: true,
    proxy: {
      '/api/dropbox': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/oauth/dropbox': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
