import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMainSite } from '../hooks/useMainSite'
import './Footer.css'

function Footer() {
  const { t } = useTranslation()
  const { hashLink, newsroomHref } = useMainSite()
  const year = new Date().getFullYear()

  return (
    <footer className="icue-footer">
      <div className="icue-footer__container">
        <div className="icue-footer__col">
          <h4>{t('footer.company')}</h4>
          <a href={hashLink('notableAwards')}>{t('footer.awards')}</a>
          <a href={hashLink('communityActivities')}>{t('footer.community')}</a>
          <a href={newsroomHref}>{t('footer.news')}</a>
          <a href={hashLink('News')}>{t('nav.archive')}</a>
        </div>
        <div className="icue-footer__col">
          <h4>{t('footer.otherPages')}</h4>
          <a href={hashLink('FAQs')}>{t('footer.faqs')}</a>
          <a href={hashLink('recruitment')}>{t('footer.recruitment')}</a>
          <a href={hashLink('donations')}>{t('footer.donations')}</a>
        </div>
        <div className="icue-footer__brand">
          <span className="icue-footer__logo">ICUE</span>
          <p className="icue-footer__institute">{t('instituteName')}</p>
          <p className="icue-footer__rights">© {year} {t('footer.rights')}</p>
        </div>
      </div>

      <div className="icue-footer__bottom icue-container">
        <div className="icue-footer__legal">
          <a href={hashLink('privacy')}>{t('footer.privacy')}</a><span>|</span>
          <a href={hashLink('terms')}>{t('footer.terms')}</a><span>|</span>
          <a href={hashLink('gdpr')}>{t('footer.gdpr')}</a><span>|</span>
          <a href={hashLink('cookies')}>{t('footer.cookies')}</a>
        </div>
        <a href={hashLink('Contact')} className="icue-footer__partner">{t('footer.partner')}</a>
      </div>
    </footer>
  )
}

export default memo(Footer)
