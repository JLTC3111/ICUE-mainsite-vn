import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/legal/',
  plugins: [react(), serveSiteFonts(path.resolve(__dirname, '..'))],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/styles': path.resolve(__dirname, '../shared/styles'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/site-routes': path.resolve(__dirname, '../shared/site-routes'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/main-site-nav': path.resolve(__dirname, '../shared/main-site-nav'),
      '@icue/site-footer': path.resolve(__dirname, '../shared/site-footer'),
      '@icue/ui': path.resolve(__dirname, '../shared/ui'),
      '@icue/pill-header': path.resolve(
        __dirname,
        '../home-app/src/components/PillSiteHeader.jsx',
      ),
      'motion/react': path.resolve(__dirname, 'node_modules/motion/react'),
    },
  },
  build: {
    outDir: '../legal',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
  },
  server: {
    port: 5178,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
