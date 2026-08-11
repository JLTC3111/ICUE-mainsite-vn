import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/contact/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/main-site-nav': path.resolve(__dirname, '../shared/main-site-nav'),
      '@icue/motion-primitives': path.resolve(__dirname, '../shared/motion-primitives'),
      '@icue/site-footer': path.resolve(__dirname, '../shared/site-footer'),
      '@icue/site-meta': path.resolve(__dirname, '../shared/site-meta'),
      '@icue/site-routes': path.resolve(__dirname, '../shared/site-routes'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/ui': path.resolve(__dirname, '../shared/ui'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      /* The pill header is the main site's real one and lives in home-app, not
         in shared/. Aliasing it is what makes this page's chrome the same
         component the route shells inject rather than a lookalike. */
      '@icue/pill-header': path.resolve(__dirname, '../home-app/src/components/PillSiteHeader.jsx'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
    },
  },
  build: {
    outDir: '../contact',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5177,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
