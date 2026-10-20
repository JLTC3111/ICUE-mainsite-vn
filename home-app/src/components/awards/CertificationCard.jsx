import StarBorder from '../reactbits/StarBorder'
import AwardsReveal from './AwardsReveal'

export default function CertificationCard({ certificate, copy, statuses, index, theme }) {
  const renewing = certificate.status === 'renewing'

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
        <article className="cert-card" aria-labelledby={`certificate-${certificate.id}`}>
          <div className="cert-logo">
            <img
              src={certificate.logo}
              alt={copy.logoAlt}
              width={certificate.width}
              height={certificate.height}
              loading="lazy"
              decoding="async"
            />
          </div>
          <h3 className="cert-name" id={`certificate-${certificate.id}`}>{copy.name}</h3>
          <p className="cert-organization">{copy.organization}</p>
          <p className={`cert-status${renewing ? ' expiring' : ''}`}>
            <span aria-hidden="true">{renewing ? '⚠' : '✓'}</span>{' '}
            {statuses[certificate.status]}
          </p>
        </article>
      </StarBorder>
    </AwardsReveal>
  )
}
