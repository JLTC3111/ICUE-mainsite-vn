import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serveSiteFonts } from '../shared/vite/serveSiteFonts.js'
import { bootRecovery } from '../shared/vite/bootRecovery.js'
import { NOTABLE_AWARDS_REDIRECTS } from '../shared/site-routes/notableAwardsRedirects.js'
import { resolvePastProjectRedirect } from '../shared/site-routes/pastProjectsRedirects.js'
import { resolveNewsArchiveRedirect } from '../shared/site-routes/newsArchiveRedirects.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LEGACY_PAGE_REDIRECTS = {
  '/src/pages/Home.html': '/',
  '/src/pages/Home_OLD.html': '/',
  '/src/pages/aboutUs.html': '/about-us',
  '/legacy/pages/aboutUs.html': '/about-us',
  '/legacy-embed/pages/aboutUs.html': '/about-us',
  '/about-us-legacy': '/about-us',
  '/src/pages/Contact.html': '/contact',
  '/legacy/pages/Contact.html': '/contact',
  '/legacy-embed/pages/Contact.html': '/contact',
  '/src/pages/ourWork.html': '/our-work',
  '/legacy/pages/ourWork.html': '/our-work',
  '/legacy-embed/pages/ourWork.html': '/our-work',
  '/legacy/pages/News.html': '/news-archive',
  '/src/pages/communityActivities.html': '/community-activities',
  '/legacy/pages/communityActivities.html': '/community-activities',
  '/legacy-embed/pages/communityActivities.html': '/community-activities',
  '/src/pages/FAQs.html': '/faqs',
  '/legacy/pages/FAQs.html': '/faqs',
  '/legacy-embed/pages/FAQs.html': '/faqs',
  '/src/pages/recruitment.html': '/recruitment',
  '/legacy/pages/recruitment.html': '/recruitment',
  '/legacy-embed/pages/recruitment.html': '/recruitment',
  '/legacy/pages/privacy.html': '/legal/privacy',
  '/legacy/pages/terms.html': '/legal/terms',
  '/legacy/pages/gdpr.html': '/legal/gdpr',
  '/legacy/pages/cookies.html': '/legal/cookies',
  '/legacy-embed/pages/privacy.html': '/legal/privacy',
  '/legacy-embed/pages/terms.html': '/legal/terms',
  '/legacy-embed/pages/gdpr.html': '/legal/gdpr',
  '/legacy-embed/pages/cookies.html': '/legal/cookies',
  '/src/pages/privacy.html': '/legal/privacy',
  '/src/pages/terms.html': '/legal/terms',
  '/src/pages/gdpr.html': '/legal/gdpr',
  '/src/pages/cookies.html': '/legal/cookies',
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
    bootRecovery(),
    serveSiteFonts(path.resolve(__dirname, '..')),
    react(),
    {
      name: 'legacy-pages-spa',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url || '').split('?')[0]

          // Match production `_redirects`: /public/* is the repo public/ tree,
          // which Vite serves from this app's publicDir at the URL root.
          if (urlPath.startsWith('/public/') && urlPath.length > 8) {
            req.url = req.url.replace(/^\/public/, '') || '/'
          }

          if (NOTABLE_AWARDS_REDIRECTS[urlPath]) {
            res.statusCode = 302
            res.setHeader('Location', NOTABLE_AWARDS_REDIRECTS[urlPath] + req.url.slice(urlPath.length))
            res.end()
            return
          }

          const pastProjectsRedirect = resolvePastProjectRedirect(
            urlPath,
            req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '',
          )
          if (pastProjectsRedirect && pastProjectsRedirect !== urlPath) {
            res.statusCode = 302
            res.setHeader('Location', pastProjectsRedirect)
            res.end()
            return
          }

          const newsArchiveRedirect = resolveNewsArchiveRedirect(
            urlPath,
            req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '',
          )
          if (newsArchiveRedirect && newsArchiveRedirect !== urlPath) {
            res.statusCode = 302
            res.setHeader('Location', newsArchiveRedirect)
            res.end()
            return
          }

          if (RETIRED_LEGAL_ROUTES[urlPath]) {
            res.statusCode = 302
            res.setHeader('Location', RETIRED_LEGAL_ROUTES[urlPath])
            res.end()
            return
          }

          if (LEGACY_PAGE_REDIRECTS[urlPath]) {
            res.statusCode = 302
            res.setHeader('Location', LEGACY_PAGE_REDIRECTS[urlPath])
            res.end()
            return
          }

          next()
        })
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'lucide-react'],
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
      '@icue/site-meta': path.resolve(__dirname, '../shared/site-meta'),
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
    rollupOptions: {
      output: {
        // Vite 6 is still Rollup. news-app is on Vite 8 and uses
        // advancedChunks for the same split; that key is ignored here.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return 'react'
          if (/[/\\]react-router/.test(id)) return 'router'
          if (/[/\\](i18next|react-i18next)[/\\]/.test(id)) return 'i18n'
          if (/[/\\](motion|motion-dom|motion-utils|framer-motion)[/\\]/.test(id)) return 'motion'
          if (/[/\\]swiper[/\\]/.test(id)) return 'swiper'
          if (/[/\\]gsap[/\\]/.test(id)) return 'gsap'
          if (/[/\\]@google[/\\]model-viewer[/\\]/.test(id)) return 'model-viewer'
          if (/[/\\]ogl[/\\]/.test(id)) return 'ogl'
          if (/[/\\]lucide-react[/\\]/.test(id)) return 'lucide'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5175,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
