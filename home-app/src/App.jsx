import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MainSiteNav from '@icue/main-site-nav/MainSiteNav'
import HomeLayoutGuard from '@icue/home-layout/HomeLayoutGuard'
import { STANDALONE_DRAWER_LINKS } from '@icue/main-site-nav/navLinks'
import HomePage from './pages/HomePage'
import LegacyHtmlPage from './pages/LegacyHtmlPage'
import { pageFromPathname, ROUTE_PATHS } from './lib/routes'

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <NavSync />
      <MainSiteNav
        variant="standalone"
        drawerLinks={STANDALONE_DRAWER_LINKS}
        homeHref={ROUTE_PATHS.home}
        contactHref={ROUTE_PATHS.aboutUs}
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
          <Route path="*" element={<Navigate to={ROUTE_PATHS.home} replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
