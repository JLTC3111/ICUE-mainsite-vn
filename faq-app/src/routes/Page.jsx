import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import { PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from '@icue/pill-header'
import Footer from '@icue/site-footer/Footer'
import { useDocumentMeta } from '@icue/site-meta/useDocumentMeta'
import { getFaqCategories } from '@icue/faq-content'
import { Chatbot } from '@icue/chatbot'
import PageLanguageMenu from '../components/PageLanguageMenu'
import FaqAccordion from '../components/FaqAccordion'
import { useMainSite } from '../hooks/useMainSite'
import '../styles/faq.css'

/*
 * The floating contact rail samples the page background on a loop and is the
 * heaviest thing on the route. Deferred to idle so it cannot compete with the
 * first paint, exactly as contact-app does it.
 */
const ContactSidebar = lazy(() => import('@icue/contact-sidebar'))

function useIdle() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window.requestIdleCallback !== 'function') {
      const timer = window.setTimeout(() => setReady(true), 200)
      return () => window.clearTimeout(timer)
    }
    const handle = window.requestIdleCallback(() => setReady(true), { timeout: 2000 })
    return () => window.cancelIdleCallback(handle)
  }, [])
  return ready
}

export default function Page() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const { base, pageLink } = useMainSite()
  const sidebarReady = useIdle()

  // The static <head> ships Vietnamese; retitle when the reader picks another.
  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })

  const categories = useMemo(() => getFaqCategories(lang), [lang])

  // The nav and footer are injected chrome shared with the other ICUE apps —
  // they take their copy as a prop. Without these both fall back to their
  // Vietnamese defaults, which would strand a reader who picked Korean.
  const navLabels = useMemo(() => t('nav', { returnObjects: true }), [t, lang])

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

  const chatLabels = useMemo(() => t('chat', { returnObjects: true }), [t, lang])
  const chatLinks = useMemo(
    () => ({ faqs: pageLink('FAQs'), contact: pageLink('Contact') }),
    [pageLink],
  )

  return (
    <>
      <a className="fq-skip" href="#faq-categories">
        {t('skipToContent')}
      </a>

      <MainSiteNav
        variant="standalone"
        usePillNav
        drawerLinks={STANDALONE_DRAWER_LINKS}
        homeHref={base}
        PillHeaderComponent={PillSiteHeader}
        pillOverflowItems={PEOPLE_SUBMENU.items}
        LanguageControl={PageLanguageMenu}
        locale={lang}
        labels={navLabels}
      />

      <main className="fq-page">
        <div className="fq-container">
          <header className="fq-header">
            <h1>{t('header.title')}</h1>
            <p className="fq-header__subtitle">{t('header.subtitle')}</p>
          </header>

          <section className="fq-main" id="faq-categories">
            <FaqAccordion categories={categories} />
          </section>

          <aside className="fq-stuck">
            <h2 className="fq-stuck__heading">{t('stillStuck.heading')}</h2>
            <p className="fq-stuck__body">{t('stillStuck.body')}</p>
            <a className="fq-stuck__cta" href={pageLink('Contact')}>
              {t('stillStuck.cta')}
            </a>
          </aside>
        </div>
      </main>

      <Footer linkMode="standalone" labels={footerLabels} locale={lang} />

      <Chatbot locale={lang} labels={chatLabels} links={chatLinks} />

      {sidebarReady && (
        <Suspense fallback={null}>
          <ContactSidebar contentKey="faqs" />
        </Suspense>
      )}
    </>
  )
}
