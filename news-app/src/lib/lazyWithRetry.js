import { lazy } from 'react'

const RELOAD_KEY = 'icue-newsroom-chunk-reload'

function chunkFromError(error) {
  const text = String(error?.message || error || '')
  const match = text.match(/https?:\/\/[^\s'"]+\.js/)
  return match?.[0] ?? null
}

/** Lazy route loader — reloads once when a hashed chunk 404s after deploy/rebuild. */
export function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      return await importFn()
    } catch (error) {
      const chunkUrl = chunkFromError(error)
      const isChunkLoadFailure =
        chunkUrl?.includes('/assets/')
        || String(error?.message || '').includes('Failed to fetch dynamically imported module')

      if (isChunkLoadFailure && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise(() => {})
      }

      sessionStorage.removeItem(RELOAD_KEY)
      throw error
    }
  })
}
