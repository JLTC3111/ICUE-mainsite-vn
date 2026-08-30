import { lazy, Suspense, useEffect, useState } from 'react'
import { ICUE_GALAXY_PRESET } from './galaxyPreset'
import './InteractiveBackground.css'

const Galaxy = lazy(() => import('./Galaxy/Galaxy'))

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function InteractiveBackground({ enabled }) {
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible')
  const [galaxyReady, setGalaxyReady] = useState(false)
  const reducedMotion = prefersReducedMotion()
  const showGalaxy = enabled && !reducedMotion

  useEffect(() => {
    const onVisibility = () => {
      setTabVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!showGalaxy || galaxyReady) return undefined

    const reveal = () => setGalaxyReady(true)
    const handle = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(reveal, { timeout: 1200 })
      : window.setTimeout(reveal, 200)

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }
  }, [galaxyReady, showGalaxy])

  return (
    <div
      className={`interactive-bg ${enabled ? 'interactive-bg--on' : 'interactive-bg--off'}`}
      aria-hidden="true"
    >
      {enabled && <div className="interactive-bg__base" />}
      {showGalaxy && galaxyReady && (
        <div className="interactive-bg__canvas">
          <Suspense fallback={null}>
            <Galaxy
              {...ICUE_GALAXY_PRESET}
              active={tabVisible}
              disableAnimation={reducedMotion}
            />
          </Suspense>
        </div>
      )}
      {enabled ? (
        <div className="interactive-bg__overlay" />
      ) : (
        <div className="interactive-bg__fallback" />
      )}
    </div>
  )
}
