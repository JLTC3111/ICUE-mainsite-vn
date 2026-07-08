import ContactSidebar from '@icue/contact-sidebar'
import { InteractiveBackgroundProvider } from '../contexts/InteractiveBackgroundContext'
import Header from './Header'
import Footer from './Footer'
import './PageShell.css'

export default function PageShell({ children }) {
  return (
    <InteractiveBackgroundProvider active={false}>
      <div className="page-shell">
        <Header />
        <main className="page-shell__main">{children}</main>
        <div className="page-shell__site-footer">
          <Footer />
        </div>
        <ContactSidebar musicIconColor="#000000" />
      </div>
    </InteractiveBackgroundProvider>
  )
}
