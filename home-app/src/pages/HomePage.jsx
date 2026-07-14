import { createRef, useEffect, useMemo, useRef } from 'react'
import { HERO, HOME_SECTIONS } from '../data/homeContent'
import HomeHero from '../components/HomeHero'
import HomeSection from '../components/HomeSection'
import HomeBeamNetwork from '../components/HomeBeamNetwork'
import ErrorBoundary from '../components/ErrorBoundary'
import { useHomeBackgroundVideo } from '../hooks/useHomeBackgroundVideo'
import { useVisualEffectsTier } from '../hooks/useHeavyVisualEffects'
import { debugLog } from '../lib/debugLog'

export default function HomePage() {
  useHomeBackgroundVideo()
  const effectsTier = useVisualEffectsTier()

  useEffect(() => {
    // #region agent log
    debugLog('HomePage.jsx:mount', 'HomePage mounted', { effectsTier }, 'C')
    // #endregion
  }, [effectsTier])

  const containerRef = useRef(null)
  const heroRef = useRef(null)

  const sectionRefs = useMemo(
    () => HOME_SECTIONS.map(() => createRef()),
    [],
  )

  const cardRefs = useMemo(
    () => HOME_SECTIONS.map((section) => section.cards.map(() => createRef())),
    [],
  )

  return (
    <div className="home-page" ref={containerRef}>
      <HomeHero hero={HERO} beamRef={heroRef} />
      <ErrorBoundary fallback={null}>
        <HomeBeamNetwork
          tier={effectsTier}
          containerRef={containerRef}
          heroRef={heroRef}
          sectionRefs={sectionRefs}
          cardRefs={cardRefs}
        />
      </ErrorBoundary>
      {HOME_SECTIONS.map((section, sectionIndex) => (
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
