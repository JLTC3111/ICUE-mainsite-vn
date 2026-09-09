import { AWARDS_STATS } from '../../data/notableAwardsContent'

export default function AwardsHero({ copy }) {
  return (
    <section className="hero-section" aria-labelledby="awards-heading">
      <div className="hero-content">
        <h1 id="awards-heading">{copy.title}</h1>
        <p>{copy.description}</p>
        <dl className="hero-stats">
          {AWARDS_STATS.map(stat => (
            <div className="hero-stat" key={stat.id}>
              <dt className="hero-stat-label">{copy.stats[stat.id]}</dt>
              <dd className="hero-stat-number">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
