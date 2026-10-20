import StarBorder from '../reactbits/StarBorder'
import AwardIcon from './AwardIcon'
import AwardsReveal from './AwardsReveal'

export default function AwardCard({ award, copy, index, theme }) {
  return (
    <AwardsReveal className="awards-grid-item" index={index}>
      <StarBorder
        as="div"
        className="award-star-border"
        theme={theme}
        radius={0}
        duration={5}
        thickness={1}
        backgroundColor="var(--awards-card)"
        textColor="var(--awards-fg)"
        borderColor="var(--awards-border-soft)"
      >
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
      </StarBorder>
    </AwardsReveal>
  )
}
