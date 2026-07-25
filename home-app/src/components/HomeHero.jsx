import { useRef } from 'react'
import { useRainText } from '../hooks/useRainText'
import { useHomeBackgroundVideoEnabled } from '../hooks/useHomeBackgroundVideoEnabled'
import RainbowButton from './magicui/RainbowButton'
import HeroVideoTitle from './HeroVideoTitle'
import WarpBackground from './magicui/WarpBackground'
import LanyardShowcase from './LanyardShowcase'
import ErrorBoundary from './ErrorBoundary'

export default function HomeHero({ hero, beamRef }) {
  const subtitleRef = useRef(null)
  const bgVideoEnabled = useHomeBackgroundVideoEnabled()
  useRainText(subtitleRef, hero.subtitle)

  return (
    <section className="home-hero" aria-label="Home hero" ref={beamRef}>
      <div className="home-hero__media" aria-hidden="true">
        {!bgVideoEnabled ? <WarpBackground className="home-hero__warp" /> : null}
        <div className="home-hero__overlay" />
      </div>

      <ErrorBoundary fallback={null}>
        <LanyardShowcase />
      </ErrorBoundary>

      <div className="home-hero__content">
        <div className="home-banner">
          <RainbowButton href={hero.bannerHref}>{hero.bannerLabel}</RainbowButton>
        </div>
        <HeroVideoTitle text={hero.title} />
        <p className="home-hero__subtitle" id="rainText" ref={subtitleRef}>
          {hero.subtitle}
        </p>

        <div className="home-hero__actions">
          {hero.actions.map((action) => (
            <a
              key={action.label}
              className={`home-btn home-btn--${action.variant}`}
              href={action.href}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
