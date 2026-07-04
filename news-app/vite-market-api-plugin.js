import { fetchYahooQuotes } from './src/lib/marketQuotesFetch.js'
import { fetchVnMarketQuotes } from './src/lib/vnMarketQuotesFetch.js'

const MARKET_PATHS = new Set([
  '/newsroom/api/market-quotes',
  '/api/market-quotes',
  '/newsroom/api/market-quotes-vn',
  '/api/market-quotes-vn',
])

const AUTH_FORGOT_PATHS = new Set([
  '/newsroom/api/auth-forgot-password',
  '/api/auth-forgot-password',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function handleForgotPassword(body, env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('config_missing')

  const email = String(body.email || '').trim().toLowerCase()
  const redirectTo = String(body.redirectTo || 'https://icue.vn/newsroom/login')
  if (!EMAIL_RE.test(email)) {
    const err = new Error('invalid email')
    err.code = 'email_address_invalid'
    throw err
  }

  const res = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  })

  const text = await res.text()
  let parsed = {}
  try { parsed = text ? JSON.parse(text) : {} } catch { parsed = { msg: text } }

  if (!res.ok) {
    const err = new Error(parsed.msg || parsed.error_description || parsed.error || 'reset failed')
    err.code = parsed.error_code || parsed.code || `http_${res.status}`
    err.status = res.status
    throw err
  }
}

/** Dev proxy for market quote + auth APIs. */
export function marketApiPlugin() {
  return {
    name: 'icue-market-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [path, query = ''] = (req.url || '').split('?')

        if (AUTH_FORGOT_PATHS.has(path)) {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'method not allowed' }))
            return
          }
          let raw = ''
          req.on('data', (chunk) => { raw += chunk })
          req.on('end', async () => {
            try {
              const body = JSON.parse(raw || '{}')
              const env = process.env
              await handleForgotPassword(body, env)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (err) {
              res.statusCode = err.status || (err.message === 'invalid email' ? 422 : 502)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message, code: err.code || 'reset_failed' }))
            }
          })
          return
        }

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
