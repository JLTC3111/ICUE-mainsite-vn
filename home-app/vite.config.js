import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LEGACY_SHELL_SRC_PAGES = new Set([
  '/src/pages/notableAwards.html',
  '/src/pages/communityActivities.html',
  '/src/pages/FAQs.html',
  '/src/pages/privacy.html',
  '/src/pages/terms.html',
  '/src/pages/gdpr.html',
  '/src/pages/cookies.html',
])

const LEGACY_PAGE_REDIRECTS = {
  '/legacy/pages/News.html': '/news-archive',
  '/legacy/pages/notableAwards.html': '/notable-awards',
  '/legacy/pages/communityActivities.html': '/community-activities',
  '/legacy/pages/FAQs.html': '/faqs',
  '/legacy/pages/privacy.html': '/privacy',
  '/legacy/pages/terms.html': '/terms',
  '/legacy/pages/gdpr.html': '/gdpr',
  '/legacy/pages/cookies.html': '/cookies',
}

export default defineConfig({
  base: '/',
  assetsInclude: ['**/*.glb'],
  plugins: [
    react(),
    {
      name: 'legacy-pages-spa',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url || '').split('?')[0]

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
      '@icue/drawer-menu': path.resolve(__dirname, '../shared/drawer-menu'),
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
