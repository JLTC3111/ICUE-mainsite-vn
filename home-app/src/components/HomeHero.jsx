import { useRef } from 'react'
import { useRainText } from '../hooks/useRainText'

export default function HomeHero({ hero }) {
  const subtitleRef = useRef(null)
  useRainText(subtitleRef, hero.subtitle)

  return (
    <section className="home-hero" aria-label="Home hero">
      <div className="home-hero__media" aria-hidden="true">
        <div className="home-hero__overlay" />
      </div>

      <div className="home-hero__content">
        <div className="home-banner">
          <a href={hero.bannerHref}>{hero.bannerLabel}</a>
        </div>
        <h1 className="home-hero__title">{hero.title}</h1>
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
