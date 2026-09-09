import { AWARDS_TIMELINE } from '../../data/notableAwardsContent'
import AwardIcon from './AwardIcon'
import AwardsReveal from './AwardsReveal'

export default function AwardsTimeline({ copy }) {
  return (
    <ol className="timeline" role="list">
      {AWARDS_TIMELINE.map((entry, index) => {
        const content = copy[entry.id]
        return (
          <AwardsReveal className="timeline-item" key={entry.id} index={index} horizontal>
            <time className="timeline-year" dateTime={entry.id}>{entry.id}</time>
            <article className="timeline-content" aria-labelledby={`milestone-${entry.id}`}>
              <h3 className="timeline-title" id={`milestone-${entry.id}`}>
                <span className="timeline-icon"><AwardIcon name={entry.icon} /></span>
                {content.title}
              </h3>
              <p className="timeline-award">{content.award}</p>
              <p className="timeline-description">{content.description}</p>
              <ul className="timeline-highlights" role="list">
                {content.highlights.map(highlight => (
                  <li className="highlight-item" key={highlight}>{highlight}</li>
                ))}
              </ul>
              <dl className="timeline-stats">
                {entry.stats.map((value, statIndex) => (
                  <div className="timeline-stat" key={statIndex}>
                    <dt className="timeline-stat-label">{content.stats[statIndex]}</dt>
                    <dd className="timeline-stat-number">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </AwardsReveal>
        )
      })}
    </ol>
  )
}
