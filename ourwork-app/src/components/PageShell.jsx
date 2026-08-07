import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ContactSidebar from '@icue/contact-sidebar'
import Footer from '@icue/site-footer/Footer'
import Header from './Header'
import './PageShell.css'

export default function PageShell({ children }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  // Site-wide footer markup, this page's six-language copy. Without `labels`
  // the shared component falls back to its Vietnamese defaults.
  const footerLabels = useMemo(
    () => ({
      company: t('footer.company'),
      otherPages: t('footer.otherPages'),
      awards: t('footer.awards'),
      news: t('footer.news'),
      archive: t('footer.archive'),
      faqs: t('footer.faqs'),
      recruitment: t('footer.recruitment'),
      privacy: t('footer.privacy'),
      terms: t('footer.terms'),
      gdpr: t('footer.gdpr'),
      cookies: t('footer.cookies'),
      partner: t('footer.partner'),
      rights: t('footer.rights'),
      instituteName: t('instituteName'),
    }),
    [t, lang],
  )

  return (
    <div className="ow-shell">
      <a className="ow-skip-link" href="#content">
        {t('skipToContent')}
      </a>
      <Header />
      <main id="content" className="ow-shell__main">
        {children}
      </main>
      <Footer linkMode="standalone" labels={footerLabels} />
      <ContactSidebar contentKey="our-work" />
    </div>
  )
}
