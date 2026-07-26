import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import HomeLayoutGuard from '@icue/home-layout/HomeLayoutGuard'
import Footer from '@icue/site-footer/Footer'
import ContactSidebar from '@icue/contact-sidebar'
import { PEOPLE_SUBMENU, STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import PillSiteHeader from './components/PillSiteHeader'
import HomePage from './pages/HomePage'
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

  useEffect(() => {
    // #region agent log
    debugLog('App.jsx:mount', 'App mounted', { pathname: window.location.pathname }, 'B')
    // #endregion
  }, [])

  return (
    <>
      <ScrollToTop />
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
      />
      <HomeLayoutGuard />
      <main id="content">
        <Routes>
          <Route path={ROUTE_PATHS.home} element={<HomePage />} />
          <Route path={ROUTE_PATHS.contact} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.aboutUs} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.ourWork} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.pastProjects} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.recruitment} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.newsArchive} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.notableAwards} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.communityActivities} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.faqs} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.privacy} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.terms} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.gdpr} element={<LegacyHtmlPage />} />
          <Route path={ROUTE_PATHS.cookies} element={<LegacyHtmlPage />} />
          <Route path="*" element={<Navigate to={ROUTE_PATHS.home} replace />} />
        </Routes>
      </main>
      <Footer linkMode="standalone" />
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
