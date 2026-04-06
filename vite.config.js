import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  server: {
    /**
     * Proxy API calls to the local Express server (server/index.js).
     * Run `npm run api` or `npm run dev:full` so /api requests are handled.
     */
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})

