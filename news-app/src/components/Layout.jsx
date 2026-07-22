import { memo, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ContactSidebar from '@icue/contact-sidebar'
import Header from './Header'
import Footer from './Footer'
import MarketTicker from './MarketTicker'
import VnMarketTicker from './VnMarketTicker'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { isNewsroomReaderRoute, syncNewsroomDocumentTheme } from '../lib/newsroomTheme'

function Layout() {
  const { pathname } = useLocation()
  const { isDark } = useNewsroomTheme()
  const isReaderRoute = isNewsroomReaderRoute(pathname)
  const isDarkReader = isReaderRoute && isDark

  useLayoutEffect(() => {
    syncNewsroomDocumentTheme(isDarkReader)
    return () => syncNewsroomDocumentTheme(false)
  }, [isDarkReader])

  return (
    <div
      className={`icue-app${
        isReaderRoute ? ' icue-app--news-home' : ''
      }${isDarkReader ? ' icue-app--news-theme-dark' : ''}`}
    >
      <Header />
      <MarketTicker />
      <VnMarketTicker />
      <main className="icue-main">
        <Outlet />
      </main>
      <Footer />
      <ContactSidebar contentKey={pathname} />
    </div>
  )
}

export default memo(Layout)
