import { createRef, useMemo, useRef } from 'react'
import { HERO, HOME_SECTIONS } from '../data/homeContent'
import HomeHero from '../components/HomeHero'
import HomeSection from '../components/HomeSection'
import HomeBeamNetwork from '../components/HomeBeamNetwork'
import ErrorBoundary from '../components/ErrorBoundary'
import { useHomeBackgroundVideo } from '../hooks/useHomeBackgroundVideo'
import { useHomeScrollReveal } from '../hooks/useScrollReveal'
import { useHeavyVisualEffects } from '../hooks/useHeavyVisualEffects'

export default function HomePage() {
  useHomeBackgroundVideo()
  useHomeScrollReveal()
  const enableVisualEffects = useHeavyVisualEffects()

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
      {HOME_SECTIONS.map((section, sectionIndex) => (
        <HomeSection
          key={section.id}
          {...section}
          beamRef={sectionRefs[sectionIndex]}
          cardBeamRefs={cardRefs[sectionIndex]}
          enableCardGlow={enableVisualEffects}
        />
      ))}
      <ErrorBoundary fallback={null}>
        <HomeBeamNetwork
          enabled={enableVisualEffects}
          containerRef={containerRef}
          heroRef={heroRef}
          sectionRefs={sectionRefs}
          cardRefs={cardRefs}
        />
      </ErrorBoundary>
    </div>
  )
}
