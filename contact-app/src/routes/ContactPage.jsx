import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import { STANDALONE_DRAWER_LINKS, PEOPLE_SUBMENU } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from '@icue/pill-header'
import Footer from '@icue/site-footer/Footer'
import { useDocumentMeta } from '@icue/site-meta/useDocumentMeta'
import MetaBar from '../components/MetaBar'
import PageLanguageMenu from '../components/PageLanguageMenu'
import ContactForm from '../components/ContactForm'
import ContactRail from '../components/ContactRail'
import OfficeMap from '../components/OfficeMap'
import { useMainSite } from '../hooks/useMainSite'
import { useReveal } from '../hooks/useReveal'
import '../styles/contact.css'

const ContactSidebar = lazy(() => import('@icue/contact-sidebar'))

function DeferredContactSidebar() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reveal = () => setReady(true)
    const idleId = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(reveal, { timeout: 1200 })
      : window.setTimeout(reveal, 0)

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
    }
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <ContactSidebar contentKey="contact" />
    </Suspense>
  )
}

export default function ContactPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const { base } = useMainSite()
  const rootRef = useRef(null)

  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })
  useReveal(rootRef, [lang])

  // Site-wide footer markup, this page's copy. Without `labels` the shared
  // component falls back to its Vietnamese defaults, which would strand an
  // English reader in a Vietnamese footer.
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

  // Same idea for the nav: the drawer, the pill and every aria string in the
  // injected shell come from this page's copy rather than the shared
  // Vietnamese defaults.
  const navLabels = useMemo(() => t('nav', { returnObjects: true }), [t, lang])

  return (
    <div className="ct-page" ref={rootRef}>
      <a className="ct-skip-link" href="#write">
        {t('skipToContent')}
      </a>

      {/* The site's own nav, not a copy of it — same component the route shells
          render, in its standalone (path-routed) variant. No `onNavigate`: this
          app owns one URL, so every link has to be a real navigation. The flag
          is the only substitution: this page has six languages of its own, so
          the disc opens a menu instead of crossing to en.icue.vn. */}
      <MainSiteNav
        variant="standalone"
        usePillNav
        PillHeaderComponent={PillSiteHeader}
        LanguageControl={PageLanguageMenu}
        drawerLinks={STANDALONE_DRAWER_LINKS}
        pillOverflowItems={PEOPLE_SUBMENU.items}
        homeHref={base}
        locale={lang}
        labels={navLabels}
      />

      <main className="ct-main" id="content">
        <MetaBar />

        <div className="ct-grid">
          <div className="ct-grid__col">
            <div className="ct-hero ct-reveal">
              <p className="ct-eyebrow">{t('hero.eyebrow')}</p>
              <h1 className="ct-hero__title">{t('hero.title')}</h1>
              <p className="ct-hero__lead">{t('hero.lead')}</p>
            </div>

            <div className="ct-grid__form ct-reveal">
              <ContactForm />
            </div>
          </div>

          <ContactRail />
        </div>

        <OfficeMap />
      </main>

      <Footer linkMode="standalone" labels={footerLabels} locale={lang} />
      <DeferredContactSidebar />
    </div>
  )
}
