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
        const path = req.url?.split('?')[0] || ''
        if (!MARKET_PATHS.has(path)) return next()

        const isVn = path.endsWith('market-quotes-vn')
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
