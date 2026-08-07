import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'

function Header() {
  const { t } = useTranslation()
  const { base, hashLink, peopleLink, structureLink } = useMainSite()

  return (
    <header className="ow-header">
      <div className="ow-header__inner">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
          currentPage="work"
        />

        <a href={base} className="ow-header__brand" aria-label={t('nav.mainAria')}>
          <span className="ow-header__logo">ICUE</span>
          <span className="ow-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="ow-header__nav" aria-label={t('nav.mainNav')}>
          <a href={hashLink('Home')} className="ow-header__link">
            {t('nav.home')}
          </a>
          <a href={hashLink('pastProjects')} className="ow-header__link">
            {t('nav.projects')}
          </a>
          <a href={structureLink()} className="ow-header__link">
            {t('nav.org')}
          </a>
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
