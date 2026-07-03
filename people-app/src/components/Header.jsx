import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import DrawerMenu from './DrawerMenu'
import LanguageSwitcher from './LanguageSwitcher'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'

function Header({ videoEnabled, onVideoToggle, showVideoToggle }) {
  const { t } = useTranslation()
  const { base, hashLink } = useMainSite()

  return (
    <header className="people-header">
      <div className="people-header__inner icue-container">
        <DrawerMenu />

        <a href={base} className="people-header__brand" aria-label={t('nav.mainAria')}>
          <span className="people-header__logo">ICUE</span>
          <span className="people-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="people-header__nav" aria-label={t('nav.mainNav')}>
          <a href={hashLink('Home')} className="people-header__link">{t('nav.home')}</a>
          <a href={hashLink('orgStructure')} className="people-header__link">{t('nav.org')}</a>
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
