import { memo } from 'react'
import './Header.css'

const MAIN_SITE = 'https://icue.vn'

function Header({ videoEnabled, onVideoToggle, showVideoToggle }) {
  return (
    <header className="people-header">
      <div className="people-header__inner icue-container">
        <a href={MAIN_SITE} className="people-header__brand" aria-label="ICUE — về trang chủ">
          <span className="people-header__logo">ICUE</span>
          <span className="people-header__tag">Nhân Lực</span>
        </a>

        <nav className="people-header__nav" aria-label="Điều hướng chính">
          <a href={MAIN_SITE} className="people-header__link">Trang chủ</a>
          <a href={`${MAIN_SITE}/#/orgStructure`} className="people-header__link">Cơ cấu tổ chức</a>
          {showVideoToggle && (
            <button
              type="button"
              className="people-header__video-toggle"
              onClick={onVideoToggle}
              aria-pressed={videoEnabled}
              aria-label={videoEnabled ? 'Tắt video nền' : 'Bật video nền'}
            >
              {videoEnabled ? 'Video: Bật' : 'Video: Tắt'}
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
