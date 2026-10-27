import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DeferredContactSidebar from '@icue/contact-sidebar/DeferredContactSidebar'
import { InteractiveBackgroundProvider } from '../contexts/InteractiveBackgroundContext'
import Header from './Header'
import Footer from './Footer'
import InteractiveBackground from './InteractiveBackground/InteractiveBackground'
import ShimmerButton from './ShimmerButton/ShimmerButton'
import './PageShell.css'

export default function PageShell({
  pageKey,
  children,
  showHrLink = false,
  showBackgroundToggle = false,
  backgroundEnabled = false,
  onBackgroundToggle,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || i18n.language
  const { pathname } = useLocation()
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
              {interactiveBgActive ? (
                <a
                  className="page-shell__hr-link"
                  href="https://hr.icue.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="page-shell__hr-label shimmer">{t('hrLink')}</span>
                </a>
              ) : (
                <ShimmerButton
                  href="https://hr.icue.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  borderRadius="999px"
                  background="rgba(0, 0, 0, 0.85)"
                >
                  {t('hrLink')}
                </ShimmerButton>
              )}
            </div>
          )}
        </main>

        <div className="page-shell__site-footer">
          <Footer />
        </div>

        <DeferredContactSidebar
          contentKey={pathname}
          locale={lang}
        />
      </div>
    </InteractiveBackgroundProvider>
  )
}
