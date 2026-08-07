import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import CircularText from './CircularText/CircularText'
import { getFooterLinks } from '../../../shared/site-footer/footerLinks.js'
import { useMainSite } from '../hooks/useMainSite'
import './Footer.css'

const CIRCULAR_TEXT = '@ICUE*©COPY*RIGHTS*'

function Footer() {
  const { t } = useTranslation()
  const links = getFooterLinks('standalone')
  const { archiveLink } = useMainSite()
  const year = new Date().getFullYear()

  return (
    <footer className="icue-footer">
      <div className="icue-footer__container">
        <div className="icue-footer__col">
          <h4>{t('footer.company')}</h4>
          <a href={links.notableAwards}>{t('footer.awards')}</a>
          <a href={links.news}>{t('footer.news')}</a>
          <a href={archiveLink()}>{t('nav.archive')}</a>
        </div>
        <div className="icue-footer__col">
          <h4>{t('footer.otherPages')}</h4>
          <a href={links.faqs}>{t('footer.faqs')}</a>
          <a href={links.recruitment}>{t('footer.recruitment')}</a>
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
          <p className="icue-footer__institute">{t('instituteName')}</p>
          <p className="icue-footer__rights">© {year} {t('footer.rights')}</p>
        </div>
      </div>

      <div className="icue-footer__bottom icue-container">
        <div className="icue-footer__legal">
          <a href={links.privacy}>{t('footer.privacy')}</a><span>|</span>
          <a href={links.terms}>{t('footer.terms')}</a><span>|</span>
          <a href={links.gdpr}>{t('footer.gdpr')}</a><span>|</span>
          <a href={links.cookies}>{t('footer.cookies')}</a>
        </div>
        <a href={links.contact} className="icue-footer__partner">{t('footer.partner')}</a>
      </div>
    </footer>
  )
}

export default memo(Footer)
