import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import DrawerMenu from './DrawerMenu'
import LanguageSwitcher from './LanguageSwitcher'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'

function Header() {
  const { t } = useTranslation()
  const { base, hashLink, peopleLink } = useMainSite()

  return (
    <header className="structure-site-header">
      <div className="structure-site-header__inner icue-container">
        <DrawerMenu />

        <a href={base} className="structure-site-header__brand" aria-label={t('nav.mainAria')}>
          <span className="structure-site-header__logo">ICUE</span>
          <span className="structure-site-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="structure-site-header__nav" aria-label={t('nav.mainNav')}>
          <a href={hashLink('Home')} className="structure-site-header__link">
            {t('nav.home')}
          </a>
          <a href={peopleLink('experts')} className="structure-site-header__link">
            {t('nav.people')}
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
