import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import CircularText from './CircularText/CircularText'
import './Footer.css'

const MAIN = '/'
const CIRCULAR_TEXT = '@ICUE*©COPY*RIGHTS*'

function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="icue-footer">
      <div className="icue-footer__container">
        <div className="icue-footer__col">
          <h4>{t('footer.company')}</h4>
          <a href={`${MAIN}#/notableAwards`}>{t('footer.awards')}</a>
          <a href={`${MAIN}#/communityActivities`}>{t('footer.community')}</a>
          <a href="/newsroom/">{t('footer.news')}</a>
          <a href={`${MAIN}#/News`}>{t('nav.archive')}</a>
        </div>
        <div className="icue-footer__col">
          <h4>{t('footer.otherPages')}</h4>
          <a href={`${MAIN}#/FAQs`}>{t('footer.faqs')}</a>
          <a href={`${MAIN}#/recruitment`}>{t('footer.recruitment')}</a>
          <a href={`${MAIN}#/donations`}>{t('footer.donations')}</a>
        </div>
        <div className="icue-footer__brand">
          <span className="icue-footer__logo">ICUE</span>
          <p className="icue-footer__institute">{t('instituteName')}</p>
          <p className="icue-footer__rights">© {year} {t('footer.rights')}</p>
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
      </div>

      <div className="icue-footer__bottom icue-container">
        <div className="icue-footer__legal">
          <a href={`${MAIN}#/privacy`}>{t('footer.privacy')}</a><span>|</span>
          <a href={`${MAIN}#/terms`}>{t('footer.terms')}</a><span>|</span>
          <a href={`${MAIN}#/gdpr`}>{t('footer.gdpr')}</a><span>|</span>
          <a href={`${MAIN}#/cookies`}>{t('footer.cookies')}</a>
        </div>
        <a href={`${MAIN}#/Contact`} className="icue-footer__partner">{t('footer.partner')}</a>
      </div>
    </footer>
  )
}

export default memo(Footer)
