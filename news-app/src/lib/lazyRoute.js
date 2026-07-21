import { lazy } from 'react'

const DEBUG_ENDPOINT =
  'http://127.0.0.1:7334/ingest/252f3540-649c-4676-b61f-d6baa3996828'

function debugLog(location, message, data, hypothesisId) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'f09bf0',
    },
    body: JSON.stringify({
      sessionId: 'f09bf0',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

function entryScriptSrc() {
  const script = document.querySelector('script[type="module"][src]')
  return script?.getAttribute('src') ?? null
}

function chunkFromError(error) {
  const text = String(error?.message || error || '')
  const match = text.match(/https?:\/\/[^\s'"]+\.js/)
  return match?.[0] ?? null
}

/** Lazy route loader with debug instrumentation for chunk-load failures. */
export function lazyRoute(name, importFn) {
  return lazy(async () => {
    debugLog('lazyRoute.js:import-start', 'lazy import start', {
      name,
      baseUrl: import.meta.env.BASE_URL,
      entryScript: entryScriptSrc(),
      href: window.location.href,
    }, 'B')

    try {
      const mod = await importFn()
      debugLog('lazyRoute.js:import-ok', 'lazy import success', { name }, 'B')
      return mod
    } catch (error) {
      const chunkUrl = chunkFromError(error)
      debugLog('lazyRoute.js:import-fail', 'lazy import failed', {
        name,
        baseUrl: import.meta.env.BASE_URL,
        entryScript: entryScriptSrc(),
        href: window.location.href,
        chunkUrl,
        errorMessage: String(error?.message || error),
      }, chunkUrl?.includes('ArticleDetail') ? 'A' : 'C')

      throw error
    }
  })
}

export function logBootstrapContext() {
  debugLog('lazyRoute.js:bootstrap', 'newsroom bootstrap', {
    baseUrl: import.meta.env.BASE_URL,
    entryScript: entryScriptSrc(),
    href: window.location.href,
    referrer: document.referrer || null,
  }, 'D')
}
