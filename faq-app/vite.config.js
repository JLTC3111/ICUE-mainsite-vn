import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/faqs/',
  plugins: [react(), serveSiteFonts(path.resolve(__dirname, '..'))],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/chatbot': path.resolve(__dirname, '../shared/chatbot'),
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/faq-content': path.resolve(__dirname, '../shared/faq-content'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/main-site-nav': path.resolve(__dirname, '../shared/main-site-nav'),
      '@icue/site-footer': path.resolve(__dirname, '../shared/site-footer'),
      '@icue/site-meta': path.resolve(__dirname, '../shared/site-meta'),
      '@icue/site-routes': path.resolve(__dirname, '../shared/site-routes'),
      '@icue/styles': path.resolve(__dirname, '../shared/styles'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      // Required transitively: site-footer imports @icue/ui/CircularText.
      // Dropping this alias breaks the build.
      '@icue/ui': path.resolve(__dirname, '../shared/ui'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      // The pill header is not shared — it lives in home-app and is aliased in
      // by every standalone app that renders the site nav.
      '@icue/pill-header': path.resolve(
        __dirname,
        '../home-app/src/components/PillSiteHeader.jsx',
      ),
      // shared/ components import these by bare name; without the self-alias
      // they resolve to a second copy and the context is silently empty.
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
      'motion/react': path.resolve(__dirname, 'node_modules/motion/react'),
    },
  },
  build: {
    outDir: '../faqs',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5179,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
