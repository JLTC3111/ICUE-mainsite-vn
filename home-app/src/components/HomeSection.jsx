import HomeCard from './HomeCard'
import TextAnimate from './magicui/TextAnimate'

export default function HomeSection({
  id,
  alt,
  title,
  description,
  linkLabel,
  linkHref,
  cards,
  beamRef,
  cardBeamRefs = [],
  enableCardGlow = false,
}) {
  const sectionClass = ['home-section', alt ? 'home-section--alt' : ''].filter(Boolean).join(' ')

  return (
    <section className={sectionClass} id={id}>
      <div className="home-section__bg" aria-hidden="true" />
      <div className="home-section__inner">
        <div className="home-section__header" ref={beamRef}>
          <TextAnimate
            as="h2"
            className="home-section__header-title"
            animation="blurInUp"
            by="word"
            once
            duration={0.9}
          >
            {title}
          </TextAnimate>
          <TextAnimate
            as="p"
            className="home-section__header-description"
            animation="blurInUp"
            by="word"
            once
            delay={0.12}
            duration={1.1}
          >
            {description}
          </TextAnimate>
          <a className="home-section__link" href={linkHref}>
            {linkLabel}
          </a>
        </div>
        <div className="home-grid">
          {cards.map((card, cardIndex) => (
            <HomeCard
              key={`${id}-${card.title}`}
              {...card}
              beamRef={cardBeamRefs[cardIndex]}
              enableGlow={enableCardGlow}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
