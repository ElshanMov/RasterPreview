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
      // ✅ STAC API proxy - CORS problemini həll edir
      '/stac-api': {
        target: 'http://stac.mmdev.az',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/stac-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📤 Proxy Request:', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 Proxy Response:', proxyRes.statusCode, req.url);
          });
        }
      },
      // ✅ TiTiler proxy - CORS problemini həll edir
      '/titiler-api': {
  target: 'https://tiles.mmdev.az',
  changeOrigin: true,
  secure: false,
  rewrite: (path) => path.replace(/^\/titiler-api/, '/tiles')
}
    }
  }
})