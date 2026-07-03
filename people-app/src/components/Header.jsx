import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import DrawerMenu from './DrawerMenu'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const MAIN_SITE = '/'

function Header({ videoEnabled, onVideoToggle, showVideoToggle }) {
  const { t } = useTranslation()

  return (
    <header className="people-header">
      <div className="people-header__inner icue-container">
        <DrawerMenu />

        <a href={MAIN_SITE} className="people-header__brand" aria-label={t('nav.mainAria')}>
          <span className="people-header__logo">ICUE</span>
          <span className="people-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="people-header__nav" aria-label={t('nav.mainNav')}>
          <a href={MAIN_SITE} className="people-header__link">{t('nav.home')}</a>
          <a href={`${MAIN_SITE}#/orgStructure`} className="people-header__link">{t('nav.org')}</a>
          <LanguageSwitcher />
          {showVideoToggle && (
            <button
              type="button"
              className="people-header__video-toggle"
              onClick={onVideoToggle}
              aria-pressed={videoEnabled}
              aria-label={videoEnabled ? t('video.disableAria') : t('video.enableAria')}
            >
              {videoEnabled ? t('video.on') : t('video.off')}
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
