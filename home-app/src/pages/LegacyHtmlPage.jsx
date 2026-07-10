import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cleanupLegacyPage, initLegacyPage } from '../legacy/pageInit'
import {
  loadModelViewer,
  pageUsesModelViewer,
  upgradeModelViewers,
} from '../legacy/modelViewer'
import { LEGACY_PAGE_FILES, pageFromPathname, prepareLegacyHtml } from '../lib/routes'

export default function LegacyHtmlPage() {
  const { pathname } = useLocation()
  const pageName = pageFromPathname(pathname)
  const [html, setHtml] = useState('')
  const [error, setError] = useState(null)
  const legacyRootRef = useRef(null)
  const pageNameRef = useRef(pageName)

  useEffect(() => {
    pageNameRef.current = pageName
  }, [pageName])

  useEffect(() => {
    if (!pageName) return undefined

    const file = LEGACY_PAGE_FILES[pageName]
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setError(null)
      setHtml('')

      try {
        const response = await fetch(`/legacy/pages/${file}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Failed to load ${file}`)
        const raw = await response.text()
        if (cancelled) return

        if (pageUsesModelViewer(pageName)) {
          await loadModelViewer()
        }

        // Only set HTML here — page init runs after paint so querySelectors work.
        setHtml(prepareLegacyHtml(raw))
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return
        setError(err.message || 'Failed to load page')
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
      cleanupLegacyPage(pageName)
    }
  }, [pageName])

  useLayoutEffect(() => {
    if (!html || !pageUsesModelViewer(pageName)) return
    upgradeModelViewers(legacyRootRef.current)
  }, [html, pageName])

  // Init after HTML is committed to the DOM (fixes empty querySelector race).
  useLayoutEffect(() => {
    if (!html || !pageName) return undefined

    let cancelled = false
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return
      window.dispatchEvent(
        new CustomEvent('icue:legacy-page-ready', { detail: { pageName } }),
      )
      void initLegacyPage(pageName).catch((err) => {
        if (!cancelled && pageNameRef.current === pageName) {
          console.error('Legacy page init failed:', err)
        }
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
    }
  }, [html, pageName])

  if (!pageName) {
    return <p>Page not found.</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <div
      ref={legacyRootRef}
      className="legacy-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
