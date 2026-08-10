import { memo, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ContactSidebar from '@icue/contact-sidebar'
import Header from './Header'
import Footer from './Footer'
import MarketStrip from './MarketStrip'
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
      <Header />
      {!isAgentRoute && <MarketStrip />}
      <main className="icue-main">
        <Outlet />
      </main>
      {!isAgentRoute && <Footer />}
      {!isAgentRoute && <ContactSidebar contentKey={pathname} />}
    </div>
  )
}

export default memo(Layout)
