import { createRef, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { buildHero, buildHomeSections, CARD_COUNTS, SECTION_COUNT } from '../data/homeContent'
import HomeHero from '../components/HomeHero'
import HomeSection from '../components/HomeSection'
import HomeBeamNetwork from '../components/HomeBeamNetwork'
import ErrorBoundary from '../components/ErrorBoundary'
import { useHomeBackgroundVideo } from '../hooks/useHomeBackgroundVideo'
import { useVisualEffectsTier } from '../hooks/useHeavyVisualEffects'
import { useHomeBeamsEnabled } from '../hooks/useHomeBeamsEnabled.js'
import { useHomeTheme } from '../hooks/useHomeTheme.js'
import '../styles/home-theme.css'
import { debugLog } from '../lib/debugLog'

export default function HomePage() {
  useHomeTheme({ applyToDocument: true })
  useHomeBackgroundVideo()
  const effectsTier = useVisualEffectsTier()
  const [beamsEnabled] = useHomeBeamsEnabled()
  const effectsEnabled = beamsEnabled && effectsTier !== 'none'
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  useEffect(() => {
    // #region agent log
    debugLog('HomePage.jsx:mount', 'HomePage mounted', { effectsTier }, 'C')
    // #endregion
  }, [effectsTier])

  const containerRef = useRef(null)
  const heroRef = useRef(null)

  const hero = useMemo(() => buildHero(t, lang), [t, lang])
  const sections = useMemo(() => buildHomeSections(t, lang), [t, lang])

  // Refs are keyed off the layout, not the copy, so switching language does not
  // hand the beam network a fresh set of nodes to re-measure.
  const sectionRefs = useMemo(
    () => Array.from({ length: SECTION_COUNT }, () => createRef()),
    [],
  )

  const cardRefs = useMemo(
    () => CARD_COUNTS.map((count) => Array.from({ length: count }, () => createRef())),
    [],
  )

  return (
    <div className="home-page" ref={containerRef}>
      <HomeHero hero={hero} beamRef={heroRef} effectsEnabled={effectsEnabled} />
      {effectsEnabled && (
        <ErrorBoundary fallback={null}>
          <HomeBeamNetwork
            tier={effectsTier}
            containerRef={containerRef}
            heroRef={heroRef}
            sectionRefs={sectionRefs}
            cardRefs={cardRefs}
          />
        </ErrorBoundary>
      )}
      {sections.map((section, sectionIndex) => (
        <HomeSection
          key={section.id}
          {...section}
          beamRef={sectionRefs[sectionIndex]}
          cardBeamRefs={cardRefs[sectionIndex]}
          enableCardGlow={effectsTier === 'full'}
        />
      ))}
    </div>
  )
}
