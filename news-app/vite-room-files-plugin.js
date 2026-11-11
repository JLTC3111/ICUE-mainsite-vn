import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { resolveServerEnv } from './src/lib/serverEnv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PATHS = new Set([
  '/.netlify/functions/room-chat-files',
  '/newsroom/.netlify/functions/room-chat-files',
])
const SKIP_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection'])

function applyFunctionEnv(fileEnv) {
  const env = resolveServerEnv({ ...fileEnv, ...process.env })
  for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }
}

/** Dev-only route for the room upload function. Vite's /newsroom base otherwise 404s it. */
export function roomFilesDevPlugin() {
  let fileEnv = {}
  let roomFiles

  return {
    name: 'icue-room-files-dev',
    config(_config, { mode }) {
      fileEnv = loadEnv(mode, __dirname, '')
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0]
        if (!PATHS.has(urlPath)) return next()
        const chunks = []
        req.on('data', chunk => chunks.push(Buffer.from(chunk)))
        req.on('end', async () => {
          try {
            applyFunctionEnv(fileEnv)
            roomFiles ??= (await import('../netlify/functions/room-chat-files.mjs')).default
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (value == null || ['host', 'connection', 'content-length', 'transfer-encoding'].includes(key)) continue
              for (const item of Array.isArray(value) ? value : [value]) headers.append(key, item)
            }
            const body = Buffer.concat(chunks)
            const request = new Request(`http://127.0.0.1${req.url}`, {
              method: req.method,
              headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
            })
            const response = await roomFiles(request)
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              if (!SKIP_RESPONSE_HEADERS.has(key)) res.setHeader(key, value)
            })
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch {
            if (res.headersSent || res.writableEnded) return
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(JSON.stringify({ error: 'File service unavailable.' }))
          }
        })
      })
    },
  }
}
