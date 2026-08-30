import { memo, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DeferredContactSidebar from '@icue/contact-sidebar/DeferredContactSidebar'
import Header from './Header'
import Footer from './Footer'
import MarketStrip from './MarketStrip'
import { NewsroomSearchProvider } from '../context/NewsroomSearchContext'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { usePerformanceProfile } from '../context/PerformanceProfileContext'
import { isNewsroomReaderRoute, syncNewsroomDocumentTheme } from '../lib/newsroomTheme'

function Layout() {
  const { pathname } = useLocation()
  const { isDark } = useNewsroomTheme()
  const { tier, reduceBlur } = usePerformanceProfile()
  const isReaderRoute = isNewsroomReaderRoute(pathname)
  const isAgentRoute = pathname.startsWith('/assist')
  const isThemedDark = (isReaderRoute || isAgentRoute) && isDark

  useLayoutEffect(() => {
    syncNewsroomDocumentTheme(isThemedDark)
    return () => syncNewsroomDocumentTheme(false)
  }, [isThemedDark])

  return (
    <div
      className={`icue-app${
        isReaderRoute ? ' icue-app--news-home' : ''
      }${isThemedDark ? ' icue-app--news-theme-dark' : ''}${
        isAgentRoute ? ' icue-app--agent' : ''
      }${isAgentRoute && !isDark ? ' icue-app--agent-light' : ''}${
        reduceBlur ? ' icue-app--perf-minimal' : tier === 'reduced' ? ' icue-app--perf-reduced' : ''
      }`}
    >
      {!isAgentRoute && <MarketStrip />}
      {/* The header types the live search query and the grid filters on it, so
          the two have to share one provider above both. */}
      <NewsroomSearchProvider>
        <Header />
        <main className="icue-main">
          <Outlet />
        </main>
      </NewsroomSearchProvider>
      {!isAgentRoute && <Footer />}
      {!isAgentRoute && <DeferredContactSidebar contentKey={pathname} />}
    </div>
  )
}

export default memo(Layout)
