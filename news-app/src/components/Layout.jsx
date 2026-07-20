import { memo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ContactSidebar from '@icue/contact-sidebar'
import Header from './Header'
import Footer from './Footer'
import MarketTicker from './MarketTicker'
import VnMarketTicker from './VnMarketTicker'

function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="icue-app">
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
