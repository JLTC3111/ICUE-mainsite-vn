import { memo } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

function Layout() {
  return (
    <div className="icue-app">
      <Header />
      <main className="icue-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default memo(Layout)
