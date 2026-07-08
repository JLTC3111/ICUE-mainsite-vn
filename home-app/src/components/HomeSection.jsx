import HomeCard from './HomeCard'

export default function HomeSection({ id, alt, title, description, linkLabel, linkHref, cards }) {
  const sectionClass = ['home-section', alt ? 'home-section--alt' : ''].filter(Boolean).join(' ')

  return (
    <section className={sectionClass} id={id}>
      <div className="home-section__header">
        <h2>{title}</h2>
        <p>{description}</p>
        <a className="home-section__link" href={linkHref}>
          {linkLabel}
        </a>
      </div>
      <div className="home-grid">
        {cards.map((card) => (
          <HomeCard key={`${id}-${card.title}`} {...card} />
        ))}
      </div>
    </section>
  )
}
