import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import HomeLayoutGuard from '@icue/home-layout/HomeLayoutGuard'
import Footer from '@icue/site-footer/Footer'
import ContactSidebar from '@icue/contact-sidebar'
import { PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from './components/PillSiteHeader'
import RouteHead from './components/RouteHead'
import SiteLanguageMenu from './components/SiteLanguageMenu'
import HomePage from './pages/HomePage'
import AboutUsPage from './pages/AboutUsPage'
import LegacyHtmlPage from './pages/LegacyHtmlPage'
import { pageFromPathname, ROUTE_PATHS } from './lib/routes'
import { debugLog } from './lib/debugLog'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NavSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = pageFromPathname(pathname) || 'Home'
    window.__mainSiteNav?.setPage?.(page)
  }, [pathname])

  return null
}

function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language

  useEffect(() => {
    // #region agent log
    debugLog('App.jsx:mount', 'App mounted', { pathname: window.location.pathname }, 'B')
    // #endregion
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // The nav and footer are injected chrome shared with the other ICUE apps —
  // they take their copy as a prop. Without these both fall back to their
  // Vietnamese defaults, which would strand a reader who picked Korean in a
  // Vietnamese menu.
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

  return (
    <>
      <ScrollToTop />
      <RouteHead />
      <NavSync />
      <MainSiteNav
        variant="standalone"
        usePillNav
        drawerLinks={STANDALONE_DRAWER_LINKS}
        homeHref={ROUTE_PATHS.home}
        contactHref={ROUTE_PATHS.aboutUs}
        onNavigate={navigate}
        PillHeaderComponent={PillSiteHeader}
        pillOverflowItems={PEOPLE_SUBMENU.items}
        LanguageControl={SiteLanguageMenu}
        locale={lang}
        labels={navLabels}
      />
      <HomeLayoutGuard />
      <main id="content">
        <Routes>
          <Route path={ROUTE_PATHS.home} element={<HomePage />} />
          {/* No /contact route: like /our-work, it is a separate app now, and
              a client-side route here would shadow it on in-app navigation.
              ROUTE_PATHS.contact stays — the drawer and footer still link to
              it, as a real navigation. */}
          <Route path={ROUTE_PATHS.aboutUs} element={<AboutUsPage />} />
          {/* The pre-conversion About page, kept reachable for side-by-side
              comparison. Retire this route with LEGACY_PREVIEW_PATHS. */}
          <Route path="/about-us-legacy" element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.pastProjects} element={<LegacyHtmlPage />} />
          {/* No /faqs or /recruitment route: like /contact and /our-work, each
              is a separate app now (faq-app, recruitment-app), and a
              client-side route here would shadow it on in-app navigation.
              ROUTE_PATHS keeps both — the drawer and footer still link to
              them, as a real navigation. */}
          <Route path={ROUTE_PATHS.newsArchive} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.notableAwards} element={<LegacyHtmlPage />} />
          {/* No /community-activities route: it is its own app now
              (community-app), like /faqs and /recruitment above. */}
          <Route path="*" element={<Navigate to={ROUTE_PATHS.home} replace />} />
        </Routes>
      </main>
      <Footer linkMode="standalone" labels={footerLabels} locale={lang} />
      <ContactSidebar contentKey={pathname} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
