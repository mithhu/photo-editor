import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy-style-models': {
        target: 'https://reiinakano.github.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-style-models/, ''),
      },
      '/proxy-tfjs-models': {
        target: 'https://storage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-tfjs-models/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow')) return 'tensorflow'
          if (id.includes('@imgly')) return 'background-removal'
          if (id.includes('upscaler')) return 'upscaler'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
})
