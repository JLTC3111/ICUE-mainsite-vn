import { memo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ContactSidebar from '@icue/contact-sidebar'
import Header from './Header'
import Footer from './Footer'
import MarketTicker from './MarketTicker'
import VnMarketTicker from './VnMarketTicker'
import { useNewsroomTheme } from '../context/NewsroomThemeContext'

function Layout() {
  const { pathname } = useLocation()
  const { isDark } = useNewsroomTheme()
  const isNewsHome = pathname === '/'
  const isDarkNewsHome = isNewsHome && isDark

  return (
    <div
      className={`icue-app${
        isNewsHome ? ' icue-app--news-home' : ''
      }${isDarkNewsHome ? ' icue-app--news-theme-dark' : ''}`}
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
