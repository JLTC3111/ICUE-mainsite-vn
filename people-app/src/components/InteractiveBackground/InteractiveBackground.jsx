import { useEffect, useState } from 'react'
import Galaxy from './Galaxy/Galaxy'
import { ICUE_GALAXY_PRESET } from './galaxyPreset'
import './InteractiveBackground.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function InteractiveBackground({ enabled }) {
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible')
  const reducedMotion = prefersReducedMotion()
  const showGalaxy = enabled && !reducedMotion

  useEffect(() => {
    const onVisibility = () => {
      setTabVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div
      className={`interactive-bg ${enabled ? 'interactive-bg--on' : 'interactive-bg--off'}`}
      aria-hidden="true"
    >
      {enabled && <div className="interactive-bg__base" />}
      {showGalaxy && (
        <div className="interactive-bg__canvas">
          <Galaxy
            {...ICUE_GALAXY_PRESET}
            active={tabVisible}
            disableAnimation={reducedMotion}
          />
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
