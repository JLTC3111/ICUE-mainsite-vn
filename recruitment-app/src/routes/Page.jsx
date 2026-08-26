import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import { PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from '@icue/pill-header'
import Footer from '@icue/site-footer/Footer'
import { useDocumentMeta } from '@icue/site-meta/useDocumentMeta'
import { Chatbot } from '@icue/chatbot'
import PageLanguageMenu from '../components/PageLanguageMenu'
import JobSearch from '../components/JobSearch'
import JobCard from '../components/JobCard'
import Gallery from '../components/Gallery'
import BenefitGrid from '../components/BenefitGrid'
import { getJobs } from '../data/jobs'
import { useMainSite } from '../hooks/useMainSite'
import '../styles/recruitment.css'

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

const contains = (field, needle) => String(field).toLowerCase().includes(needle)

/** Fields shown on the collapsed card. */
function matchesSummary(job, needle) {
  return [job.title, job.department, job.location].some((field) => contains(field, needle))
}

/** Fields hidden behind the disclosure. */
function matchesBody(job, needle) {
  return [job.description, ...job.tags].some((field) => contains(field, needle))
}

/** Case-insensitive substring across title, department, location, description and tags. */
function matches(job, term) {
  if (!term) return true
  const needle = term.toLowerCase()
  return matchesSummary(job, needle) || matchesBody(job, needle)
}

export default function Page() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const { base, pageLink } = useMainSite()
  const sidebarReady = useIdle()
  const [query, setQuery] = useState('')
  const resultsRef = useRef(null)

  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })

  const jobs = useMemo(() => getJobs(lang), [lang])
  const term = query.trim()
  const visible = useMemo(() => jobs.filter((job) => matches(job, term)), [jobs, term])

  // Bring the results into view once the reader has actually typed something —
  // the legacy version scrolled on every submit, including an empty one.
  useEffect(() => {
    if (!term) return
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [term])

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

  const contactHref = pageLink('Contact')

  return (
    <>
      <a className="rc-skip" href="#open-positions">
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

      <main className="rc-page">
        <section className="rc-search">
          <div className="rc-container">
            <h1 className="rc-search__title">{t('search.title')}</h1>
            <p className="rc-search__subtitle">{t('search.subtitle')}</p>
            <JobSearch value={query} onChange={setQuery} />
          </div>
        </section>

        <Gallery />

        <section className="rc-jobs" id="open-positions" ref={resultsRef}>
          <div className="rc-container">
            <h2 className="rc-section__title">{t('jobs.title')}</h2>
            <p className="rc-section__subtitle">{t('jobs.subtitle')}</p>

            {/* Announced rather than merely drawn: a reader using a screen
                reader gets no signal from the list silently shrinking. */}
            <p className="rc-jobs__status" role="status" aria-live="polite">
              {term
                ? visible.length === 0
                  ? t('results.none', { query: term })
                  : t('results.count', { count: visible.length, query: term })
                : t('results.cleared')}
            </p>

            {jobs.length === 0 ? (
              <p className="rc-jobs__empty">{t('jobs.empty')}</p>
            ) : (
              <div className="rc-jobs__grid">
                {visible.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    term={term}
                    applyHref={contactHref}
                    forceExpanded={Boolean(term) && matchesBody(job, term.toLowerCase())}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <BenefitGrid />
      </main>

      <Footer linkMode="standalone" labels={footerLabels} locale={lang} />

      <Chatbot locale={lang} labels={chatLabels} links={chatLinks} />

      {sidebarReady && (
        <Suspense fallback={null}>
          <ContactSidebar contentKey="recruitment" />
        </Suspense>
      )}
    </>
  )
}
