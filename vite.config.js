import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tensorflow')) return 'tensorflow'
          if (id.includes('@imgly')) return 'background-removal'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
})
