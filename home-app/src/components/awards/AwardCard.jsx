import AwardIcon from './AwardIcon'
import AwardsReveal from './AwardsReveal'

export default function AwardCard({ award, copy, index }) {
  return (
    <AwardsReveal className="awards-grid-item" index={index}>
      <article className="award-card" aria-labelledby={`award-${award.id}`}>
        <time className="award-year" dateTime={award.year}>{award.year}</time>
        <div className="award-icon"><AwardIcon name={award.icon} /></div>
        <h3 className="award-title" id={`award-${award.id}`}>{copy.title}</h3>
        <p className="award-organization">{copy.organization}</p>
        <p className="award-description">{copy.description}</p>
        <dl className="award-project">
          <dt className="award-project-label">{copy.projectLabel}</dt>
          <dd className="award-project-name">{copy.projectName}</dd>
        </dl>
      </article>
    </AwardsReveal>
  )
}
