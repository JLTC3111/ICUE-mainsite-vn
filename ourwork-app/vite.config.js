import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/our-work/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/motion-primitives': path.resolve(__dirname, '../shared/motion-primitives'),
      '@icue/site-footer': path.resolve(__dirname, '../shared/site-footer'),
      '@icue/site-routes': path.resolve(__dirname, '../shared/site-routes'),
      '@icue/ui': path.resolve(__dirname, '../shared/ui'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
    },
  },
  build: {
    outDir: '../our-work',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5176,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
