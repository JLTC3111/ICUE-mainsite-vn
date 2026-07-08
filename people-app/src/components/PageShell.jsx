import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContactSidebar from '@icue/contact-sidebar'
import { InteractiveBackgroundProvider } from '../contexts/InteractiveBackgroundContext'
import Header from './Header'
import Footer from './Footer'
import InteractiveBackground from './InteractiveBackground/InteractiveBackground'
import ShinyButton from './ShinyButton/ShinyButton'
import './PageShell.css'

export default function PageShell({
  pageKey,
  children,
  showHrLink = false,
  showBackgroundToggle = false,
  backgroundEnabled = false,
  onBackgroundToggle,
}) {
  const { t } = useTranslation()
  const interactiveBgActive = showBackgroundToggle && backgroundEnabled

  return (
    <InteractiveBackgroundProvider active={interactiveBgActive}>
      <div className={`page-shell${interactiveBgActive ? ' page-shell--interactive-bg' : ''}`}>
        {showBackgroundToggle && (
          <InteractiveBackground enabled={backgroundEnabled} />
        )}

        <Header
          backgroundEnabled={backgroundEnabled}
          onBackgroundToggle={onBackgroundToggle}
          showBackgroundToggle={showBackgroundToggle}
        />

        <main className="page-shell__main icue-container">
          <div className="page-shell__header">
            <nav className="page-shell__tabs" aria-label={t('tabs.groupAria')}>
              <NavLink
                to="/experts"
                className={({ isActive }) =>
                  `page-shell__tab ${isActive ? 'page-shell__tab--active' : ''}`
                }
              >
                {t('tabs.experts')}
              </NavLink>
              <NavLink
                to="/core-team"
                className={({ isActive }) =>
                  `page-shell__tab ${isActive ? 'page-shell__tab--active' : ''}`
                }
              >
                {t('tabs.coreTeam')}
              </NavLink>
            </nav>

            <div className="page-shell__intro">
              <div className="page-shell__titles">
                <h1 className="page-shell__title">{t(`${pageKey}.title`)}</h1>
                <p className="page-shell__subtitle">{t(`${pageKey}.subtitle`)}</p>
              </div>
            </div>
          </div>

          {children}

          {showHrLink && (
            <div className="page-shell__footer-actions">
              <ShinyButton
                href="https://hr.icue.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('hrLink')}
              </ShinyButton>
            </div>
          )}
        </main>

        <div className="page-shell__site-footer">
          <Footer />
        </div>

        <ContactSidebar musicIconColor={interactiveBgActive ? '#ffffff' : '#000000'} />
      </div>
    </InteractiveBackgroundProvider>
  )
}
