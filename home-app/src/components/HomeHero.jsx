import { useRef } from 'react'
import { useRainText } from '../hooks/useRainText'
import { useHomeBackgroundVideoEnabled } from '../hooks/useHomeBackgroundVideoEnabled'
import RainbowButton from './magicui/RainbowButton'
import HeroVideoTitle from './HeroVideoTitle'
import WarpBackground from './magicui/WarpBackground'

export default function HomeHero({ hero, beamRef, effectsEnabled = false }) {
  const subtitleRef = useRef(null)
  const bgVideoEnabled = useHomeBackgroundVideoEnabled()
  useRainText(subtitleRef, hero.subtitle)

  return (
    <section className="home-hero" aria-label={hero.ariaLabel} ref={beamRef}>
      <div className="home-hero__media" aria-hidden="true">
        {!bgVideoEnabled ? (
          <WarpBackground
            className="home-hero__warp"
            beamsPerSide={2}
            beamSize={3}
            beamDuration={7}
            beamOpacity={0.28}
            animateBeams={effectsEnabled}
            gridColor="var(--home-warp-grid, rgba(10, 26, 58, 0.035))"
            background="var(--home-warp-background, linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%))"
          />
        ) : null}
        {bgVideoEnabled && <div className="home-hero__overlay" />}
      </div>

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
