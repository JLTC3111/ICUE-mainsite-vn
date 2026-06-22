import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchYahooQuotes } from './src/lib/marketQuotesFetch.js'
import { fetchVnMarketQuotes } from './src/lib/vnMarketQuotesFetch.js'

/** Dev-only proxy so market quotes work without browser CORS blocks. */
function marketApiPlugin() {
  return {
    name: 'icue-market-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] || ''
        if (path === '/newsroom/api/market-quotes' || path === '/api/market-quotes') {
          try {
            const data = await fetchYahooQuotes()
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=120')
            res.end(JSON.stringify(data))
          } catch {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'unavailable' }))
          }
          return
        }
        if (path === '/newsroom/api/market-quotes-vn' || path === '/api/market-quotes-vn') {
          try {
            const data = await fetchVnMarketQuotes()
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=60')
            res.end(JSON.stringify(data))
          } catch {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'unavailable' }))
          }
          return
        }
        return next()
      })
    },
  }
}

// Performance-oriented build: aggressive code-splitting so the heavy editor
// (TipTap/ProseMirror) and Supabase client never block the public news grid.
export default defineConfig({
  // Distinct from legacy #/News — served at icue.vn/newsroom/
  base: '/newsroom/',
  plugins: [react(), marketApiPlugin()],
  build: {
    // Production serves the repo ROOT statically, so the app must live at
    // /newsroom (not /public/newsroom) to match its base + the banner link.
    outDir: '../newsroom',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
