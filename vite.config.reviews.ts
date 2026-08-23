import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'reviews-root',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index-reviews.html';
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_IS_REVIEWS_SITE': '"true"',
  },
  build: {
    outDir: 'dist-reviews',
    rollupOptions: {
      input: path.resolve(__dirname, 'index-reviews.html'),
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage'],
        },
      },
    },
  },
})
