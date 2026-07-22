import { memo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ContactSidebar from '@icue/contact-sidebar'
import Header from './Header'
import Footer from './Footer'
import MarketTicker from './MarketTicker'
import VnMarketTicker from './VnMarketTicker'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'
import { isNewsroomReaderRoute } from '../lib/newsroomTheme'

function Layout() {
  const { pathname } = useLocation()
  const { isDark } = useNewsroomTheme()
  const isReaderRoute = isNewsroomReaderRoute(pathname)
  const isDarkReader = isReaderRoute && isDark

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
