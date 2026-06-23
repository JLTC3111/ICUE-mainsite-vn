import { fetchYahooQuotes } from './src/lib/marketQuotesFetch.js'
import { fetchVnMarketQuotes } from './src/lib/vnMarketQuotesFetch.js'

const MARKET_PATHS = new Set([
  '/newsroom/api/market-quotes',
  '/api/market-quotes',
  '/newsroom/api/market-quotes-vn',
  '/api/market-quotes-vn',
])

/** Dev proxy for market quote APIs (avoids browser CORS + SPA fallback hijacking). */
export function marketApiPlugin() {
  return {
    name: 'icue-market-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [path, query = ''] = (req.url || '').split('?')
        const isMarketPath = MARKET_PATHS.has(path)
          || path === '/newsroom/api/market-quotes'
          || path === '/api/market-quotes'
        if (!isMarketPath) return next()

        const params = new URLSearchParams(query)
        const isVn = path.endsWith('market-quotes-vn') || params.get('scope') === 'vn'
        try {
          const data = isVn ? await fetchVnMarketQuotes() : await fetchYahooQuotes()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', isVn ? 'public, max-age=60' : 'public, max-age=120')
          res.end(JSON.stringify(data))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'unavailable' }))
        }
      })
    },
  }
}
