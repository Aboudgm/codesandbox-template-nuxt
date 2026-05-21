import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'markdown': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          'query': ['@tanstack/react-query', 'zustand', 'axios'],
        },
      },
    },
  },
})
