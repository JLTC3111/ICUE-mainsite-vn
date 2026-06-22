import { memo } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MarketTicker from './MarketTicker'

function Layout() {
  return (
    <div className="icue-app">
      <Header />
      <MarketTicker />
      <main className="icue-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default memo(Layout)
