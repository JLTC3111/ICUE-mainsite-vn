import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/structure/',
  assetsInclude: ['**/*.glb'],
  plugins: [react(), serveSiteFonts(path.resolve(__dirname, '..'))],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/styles': path.resolve(__dirname, '../shared/styles'),
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
    },
  },
  build: {
    outDir: '../structure',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5175,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/profilePhotos': { target: 'http://localhost:5173', changeOrigin: true },
      '/public': { target: 'http://localhost:5173', changeOrigin: true },
    },
  },
})
