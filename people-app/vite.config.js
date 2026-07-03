import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/people/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
    },
  },
  build: {
    outDir: '../people',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/profilePhotos': { target: 'http://localhost:5173', changeOrigin: true },
      '/public': { target: 'http://localhost:5173', changeOrigin: true },
    },
  },
})
