import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from 'vite'

const CONTENT_TYPES = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * Serve the site-wide type kit at /fonts during `vite dev`.
 *
 * In production every app is published under the same origin as the repo root,
 * so the absolute `/fonts/...` URLs in shared/fonts/fonts.css resolve straight
 * to the committed kit. A dev server has no such root — it serves only its own
 * app's `public/`, which would 404 all 75 faces and silently fall back to
 * system fonts.
 *
 * Rather than copy ~12 MB of woff2 into seven `public/fonts` directories, this
 * middleware maps /fonts/* onto the one canonical directory at the repo root.
 */
export function serveSiteFonts(siteRoot) {
  const fontsDir = path.resolve(siteRoot, 'fonts')

  return {
    // No `apply` guard: this plugin has work to do in both modes — serving the
    // kit in dev (configureServer only runs there anyway) and quieting the
    // resolve notices during build.
    name: 'icue-serve-site-fonts',

    /*
     * At build time Vite cannot resolve the absolute `/fonts/*.woff2` URLs in
     * fonts.css, because the kit lives at the repo root rather than in this
     * app's publicDir. It leaves them untouched — which is exactly what we
     * want — but warns once per face. That is 75 lines per app and ~500 for a
     * full site build, enough to bury a warning that actually matters. Drop
     * just that message and let everything else through.
     */
    config(config, { command }) {
      if (command !== 'build') return
      const base = config.customLogger ?? null
      return {
        customLogger: makeFontQuietLogger(base),
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (!url.startsWith('/fonts/')) return next()

        // Resolve inside fontsDir only — never let `..` escape the kit.
        const target = path.resolve(fontsDir, '.' + url.slice('/fonts'.length))
        if (target !== fontsDir && !target.startsWith(fontsDir + path.sep)) {
          return next()
        }
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return next()

        const type = CONTENT_TYPES[path.extname(target)]
        if (type) res.setHeader('Content-Type', type)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(target).pipe(res)
      })
    },
  }
}

const NOISY =
  /\/fonts\/[^\s]+\.woff2 referenced in .* didn't resolve at build time/

/**
 * Wrap a Vite logger so the /fonts resolve notices are dropped.
 *
 * Built on Vite's own `createLogger` rather than a hand-rolled object: the
 * logger interface is wider than it looks (warnOnce, hasErrorLogged, clearScreen,
 * and a `hasWarned` flag the CLI reads) and every method must return undefined.
 */
function makeFontQuietLogger(base) {
  const logger = base ?? createLogger()
  const warn = logger.warn.bind(logger)
  const warnOnce = logger.warnOnce.bind(logger)

  return {
    ...logger,
    warn(msg, opts) {
      if (NOISY.test(String(msg))) return
      warn(msg, opts)
    },
    warnOnce(msg, opts) {
      if (NOISY.test(String(msg))) return
      warnOnce(msg, opts)
    },
  }
}

export default serveSiteFonts
