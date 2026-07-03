import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import Footer from './Footer'
import BackgroundVideo from './BackgroundVideo'
import './PageShell.css'

export default function PageShell({
  pageKey,
  children,
  showHrLink = false,
  showVideoToggle = false,
  videoEnabled = false,
  onVideoToggle,
  desktopVideoSrc,
  mobileVideoSrc,
}) {
  const { t } = useTranslation()

  return (
    <div className="page-shell">
      {showVideoToggle && (
        <BackgroundVideo
          desktopSrc={desktopVideoSrc}
          mobileSrc={mobileVideoSrc}
          enabled={videoEnabled}
        />
      )}

      <Header
        videoEnabled={videoEnabled}
        onVideoToggle={onVideoToggle}
        showVideoToggle={showVideoToggle}
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

          <div className="page-shell__titles">
            <h1 className="page-shell__title">{t(`${pageKey}.title`)}</h1>
            <p className="page-shell__subtitle">{t(`${pageKey}.subtitle`)}</p>
          </div>
        </div>

        {children}

        {showHrLink && (
          <div className="page-shell__footer-actions">
            <a
              href="https://hr.icue.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent"
            >
              {t('hrLink')}
            </a>
          </div>
        )}
      </main>

      <div className="page-shell__site-footer">
        <Footer />
      </div>
    </div>
  )
}
