import { useTranslation } from 'react-i18next'
import useAboutTheme from '../components/aboutUs/useAboutTheme'
import AwardsHero from '../components/awards/AwardsHero'
import AwardCard from '../components/awards/AwardCard'
import CertificationCard from '../components/awards/CertificationCard'
import AwardsTimeline from '../components/awards/AwardsTimeline'
import { NOTABLE_AWARDS, AWARDS_CERTIFICATIONS } from '../data/notableAwardsContent'
import './NotableAwardsPage.css'

function AwardsSection({ id, copy, className = '', children }) {
  return (
    <section className={`section ${className}`} aria-labelledby={`${id}-heading`}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" id={`${id}-heading`}>{copy.title}</h2>
          <p className="section-subtitle">{copy.description}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

export default function NotableAwardsPage() {
  const { t } = useTranslation()
  const theme = useAboutTheme()
  const copy = t('awards', { returnObjects: true })

  return (
    <div className={`notable-awards-page notable-awards-page--${theme}`} lang={copy.language}>
      <AwardsHero copy={copy.hero} />
      <AwardsSection id="recent-awards" copy={copy.sections.recent}>
        <ul className="awards-grid" role="list">
          {NOTABLE_AWARDS.map((award, index) => (
            <AwardCard key={award.id} award={award} copy={copy.items[award.id]} index={index} />
          ))}
        </ul>
      </AwardsSection>
      <AwardsSection id="certifications" copy={copy.sections.certifications} className="certifications-section">
        <ul className="certs-grid" role="list">
          {AWARDS_CERTIFICATIONS.map((certificate, index) => (
            <CertificationCard
              key={certificate.id}
              certificate={certificate}
              copy={copy.certifications[certificate.id]}
              statuses={copy.statuses}
              index={index}
            />
          ))}
        </ul>
      </AwardsSection>
      <AwardsSection id="recognition-timeline" copy={copy.sections.timeline} className="timeline-section">
        <AwardsTimeline copy={copy.timeline} />
      </AwardsSection>
    </div>
  )
}
