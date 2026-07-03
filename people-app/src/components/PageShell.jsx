import { NavLink } from 'react-router-dom'
import Header from './Header'
import BackgroundVideo from './BackgroundVideo'
import './PageShell.css'

export default function PageShell({
  title,
  subtitle,
  children,
  showHrLink = false,
  showVideoToggle = false,
  videoEnabled = false,
  onVideoToggle,
  desktopVideoSrc,
  mobileVideoSrc,
}) {
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
          <nav className="page-shell__tabs" aria-label="Nhóm nhân sự">
            <NavLink
              to="/experts"
              className={({ isActive }) =>
                `page-shell__tab ${isActive ? 'page-shell__tab--active' : ''}`
              }
            >
              Chuyên Gia
            </NavLink>
            <NavLink
              to="/core-team"
              className={({ isActive }) =>
                `page-shell__tab ${isActive ? 'page-shell__tab--active' : ''}`
              }
            >
              Cán Bộ
            </NavLink>
          </nav>

          <div className="page-shell__titles">
            <h1 className="page-shell__title">{title}</h1>
            {subtitle && <p className="page-shell__subtitle">{subtitle}</p>}
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
              Truy Cập Phần Mềm Quản Lý Nhân Sự
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
