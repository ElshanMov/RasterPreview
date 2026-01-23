import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  worker: {
    format: 'es'
  },
  server: {
    proxy: {
      // STAC API proxy - CORS problemini həll edir
      '/stac-api': {
        target: 'http://stac.mmdev.az',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/stac-api/, ''),
      }
    }
  }
})