import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import { PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from '@icue/pill-header'
import Footer from '@icue/site-footer/Footer'
import { useDocumentMeta } from '@icue/site-meta/useDocumentMeta'
import { Chatbot } from '@icue/chatbot'
import PageLanguageMenu from '../components/PageLanguageMenu'
import ProgrammeSection from '../components/ProgrammeSection'
import Lightbox from '../components/Lightbox'
import { getProgrammes } from '../data/programmes'
import { useMainSite } from '../hooks/useMainSite'
import '../styles/community.css'

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
  const [openId, setOpenId] = useState(null)

  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })

  const programmes = useMemo(() => getProgrammes(lang), [lang])

  /* One flat list behind the lightbox, so ← and → walk the whole page rather
     than stopping at the end of a programme. */
  const photos = useMemo(
    () =>
      programmes.flatMap((programme) =>
        programme.meta.photos.map((id) => ({ id, caption: programme.captions[id] })),
      ),
    [programmes],
  )

  const openIndex = openId === null ? null : photos.findIndex((p) => p.id === openId)
  const step = useCallback(
    (delta) => {
      setOpenId((current) => {
        const at = photos.findIndex((p) => p.id === current)
        if (at < 0) return current
        return photos[(at + delta + photos.length) % photos.length].id
      })
    },
    [photos],
  )
  const close = useCallback(() => setOpenId(null), [])

  // The places and the one year the photographs actually evidence — not a
  // stats grid, because two programmes do not make a statistic.
  const places = useMemo(() => {
    const regions = [...new Set(programmes.map((p) => p.meta.region).filter(Boolean))]
    const years = [...new Set(programmes.map((p) => p.meta.date?.slice(0, 4)).filter(Boolean))]
    return [...regions, ...years].join(' · ')
  }, [programmes])

  const navLabels = useMemo(() => t('nav', { returnObjects: true }), [t, lang])

  const footerLabels = useMemo(
    () => ({
      company: t('footer.company'),
      otherPages: t('footer.otherPages'),
      awards: t('footer.awards'),
      community: t('footer.community'),
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
      <a className="cm-skip" href="#programmes">
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

      <main className="cm-page">
        <header className="cm-masthead">
          <div className="cm-container">
            <p className="cm-masthead__kicker">{t('header.kicker')}</p>
            <h1 className="cm-masthead__title">{t('header.title')}</h1>
            <p className="cm-masthead__intro">{t('header.intro')}</p>
            {places && <p className="cm-masthead__places">{places}</p>}
          </div>
        </header>

        <div className="cm-container" id="programmes" aria-label={t('a11y.programmeList')}>
          {programmes.map((programme, index) => (
            <ProgrammeSection
              key={programme.id}
              programme={programme}
              index={index}
              onOpenPhoto={setOpenId}
            />
          ))}
          <p className="cm-credit">{t('credit')}</p>
        </div>
      </main>

      <Lightbox
        photos={photos}
        index={openIndex === -1 ? null : openIndex}
        labels={t('a11y', { returnObjects: true })}
        onClose={close}
        onStep={step}
      />

      <Footer linkMode="standalone" labels={footerLabels} locale={lang} />

      <Chatbot locale={lang} labels={chatLabels} links={chatLinks} />

      {sidebarReady && (
        <Suspense fallback={null}>
          <ContactSidebar contentKey="community-activities" />
        </Suspense>
      )}
    </>
  )
}
