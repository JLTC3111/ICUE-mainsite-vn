import { memo } from 'react'
import CircularText from '@icue/ui/CircularText/CircularText'
import { FOOTER_LABELS } from './footerContent'
import { getFooterLinks } from './footerLinks'
import './Footer.css'

const CIRCULAR_TEXT = '@ICUE*©COPY*RIGHTS*'

/**
 * `labels` lets a localized app (the six-language Our Work page) reuse this
 * markup with its own copy. Omit it and you get the Vietnamese defaults the
 * home app has always used.
 */
function Footer({ linkMode = 'hash', labels: labelOverrides, locale }) {
  const labels = labelOverrides ? { ...FOOTER_LABELS, ...labelOverrides } : FOOTER_LABELS
  const links = getFooterLinks(linkMode, locale)
  const year = new Date().getFullYear()

  return (
    <footer className="icue-footer">
      <div className="icue-footer__container">
        <div className="icue-footer__col">
          <h4>{labels.company}</h4>
          <a href={links.notableAwards}>{labels.awards}</a>
          <a href={links.news}>{labels.news}</a>
          <a href={links.archive}>{labels.archive}</a>
        </div>
        <div className="icue-footer__col">
          <h4>{labels.otherPages}</h4>
          <a href={links.faqs}>{labels.faqs}</a>
          <a href={links.recruitment}>{labels.recruitment}</a>
        </div>
        <div className="icue-footer__brand">
          <div className="icue-footer__logo-wrap">
            <span className="icue-footer__logo">ICUE</span>
            <CircularText
              text={CIRCULAR_TEXT}
              className="icue-footer__circular-text"
              spinDuration={24}
              onHover="pause"
              lightColor="#ffffff"
              darkColor="#ffffff"
              tintColor="#ffffff"
              brightness={1.22}
              contrast={0.5}
            />
          </div>
          <p className="icue-footer__institute">{labels.instituteName}</p>
          <p className="icue-footer__rights">© {year} {labels.rights}</p>
        </div>
      </div>

      <div className="icue-footer__bottom icue-container">
        <div className="icue-footer__legal">
          <a href={links.privacy}>{labels.privacy}</a><span>|</span>
          <a href={links.terms}>{labels.terms}</a><span>|</span>
          <a href={links.gdpr}>{labels.gdpr}</a><span>|</span>
          <a href={links.cookies}>{labels.cookies}</a>
        </div>
        <a href={links.contact} className="icue-footer__partner">{labels.partner}</a>
      </div>
    </footer>
  )
}

export default memo(Footer)
