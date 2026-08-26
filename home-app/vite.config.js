import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LEGACY_SHELL_SRC_PAGES = new Set([
  '/src/pages/notableAwards.html',
  '/src/pages/communityActivities.html',
])

const LEGACY_PAGE_REDIRECTS = {
  '/legacy/pages/News.html': '/news-archive',
  '/legacy/pages/notableAwards.html': '/notable-awards',
  '/legacy/pages/communityActivities.html': '/community-activities',
  '/legacy/pages/privacy.html': '/legal/privacy',
  '/legacy/pages/terms.html': '/legal/terms',
  '/legacy/pages/gdpr.html': '/legal/gdpr',
  '/legacy/pages/cookies.html': '/legal/cookies',
}

const RETIRED_LEGAL_ROUTES = {
  '/privacy': '/legal/privacy',
  '/terms': '/legal/terms',
  '/gdpr': '/legal/gdpr',
  '/cookies': '/legal/cookies',
}

export default defineConfig({
  base: '/',
  assetsInclude: ['**/*.glb'],
  plugins: [
    serveSiteFonts(path.resolve(__dirname, '..')),
    react(),
    {
      name: 'legacy-pages-spa',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url || '').split('?')[0]

          if (RETIRED_LEGAL_ROUTES[urlPath]) {
            res.statusCode = 302
            res.setHeader('Location', RETIRED_LEGAL_ROUTES[urlPath])
            res.end()
            return
          }

          if (LEGACY_SHELL_SRC_PAGES.has(urlPath)) {
            req.url = '/index.html'
            return next()
          }

          if (LEGACY_PAGE_REDIRECTS[urlPath]) {
            const wantsEmbed =
              req.headers['x-icue-legacy-embed'] === '1' ||
              req.headers['sec-fetch-dest'] === 'empty' ||
              req.headers['sec-fetch-mode'] === 'cors'

            if (!wantsEmbed) {
              res.statusCode = 302
              res.setHeader('Location', LEGACY_PAGE_REDIRECTS[urlPath])
              res.end()
              return
            }
          }

          next()
        })
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, '..'),
      '@icue/main-site-nav': path.resolve(__dirname, '../shared/main-site-nav'),
      '@icue/styles': path.resolve(__dirname, '../shared/styles'),
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
      '@icue/i18n': path.resolve(__dirname, '../shared/i18n'),
      '@icue/text': path.resolve(__dirname, '../shared/text'),
      '@icue/home-layout': path.resolve(__dirname, '../shared/home-layout'),
      '@icue/ui': path.resolve(__dirname, '../shared/ui'),
      '@icue/site-footer': path.resolve(__dirname, '../shared/site-footer'),
      '@icue/contact-sidebar': path.resolve(__dirname, '../shared/contact-sidebar'),
      '@icue/zalo': path.resolve(__dirname, '../shared/zalo'),
      '@icue/debug': path.resolve(__dirname, '../shared/debug'),
      'motion/react': path.resolve(__dirname, 'node_modules/motion/react'),
    },
  },
  build: {
    outDir: '../dist-home',
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
  },
})
