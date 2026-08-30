import { useLocation } from 'react-router-dom'
import DeferredContactSidebar from '@icue/contact-sidebar/DeferredContactSidebar'
import { InteractiveBackgroundProvider } from '../contexts/InteractiveBackgroundContext'
import Header from './Header'
import Footer from './Footer'
import './PageShell.css'

export default function PageShell({ children }) {
  const { pathname } = useLocation()

  return (
    <InteractiveBackgroundProvider active={false}>
      <div className="page-shell">
        <Header />
        <main className="page-shell__main">{children}</main>
        <div className="page-shell__site-footer">
          <Footer />
        </div>
        <DeferredContactSidebar contentKey={pathname} />
      </div>
    </InteractiveBackgroundProvider>
  )
}
