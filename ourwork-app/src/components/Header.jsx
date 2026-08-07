import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import LanguageFlagMenu from './LanguageFlagMenu'
import ThemeToggle from './ThemeToggle'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'

const SELF_HREF = import.meta.env.BASE_URL
const LOGO_MARK = `${import.meta.env.BASE_URL}favicon.png`

function Header() {
  const { t } = useTranslation()
  const { base, hashLink, peopleLink, structureLink, newsroomHref } = useMainSite()

  // The main site's pill nav, same six destinations in the same order. This app
  // *is* the Our Work page, so that pill is the active one and links to itself.
  const items = [
    { key: 'home', href: hashLink('Home'), label: t('nav.home') },
    { key: 'org', href: structureLink(), label: t('nav.org') },
    { key: 'work', href: SELF_HREF, label: t('nav.work'), active: true },
    { key: 'projects', href: hashLink('pastProjects'), label: t('nav.projects') },
    { key: 'news', href: newsroomHref, label: t('nav.news') },
    { key: 'about', href: hashLink('aboutUs'), label: t('nav.about') },
  ]

  return (
    <header className="ow-header">
      <div className="ow-header__bar">
        <a href={base} className="ow-header__logo" aria-label={t('nav.mainAria')}>
          <img src={LOGO_MARK} alt="" aria-hidden="true" decoding="async" />
          <span className="ow-header__brand">ICUE</span>
          <span className="ow-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="ow-header__nav" aria-label={t('nav.mainNav')}>
          <ul className="ow-header__list">
            {items.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className={`ow-header__link${item.active ? ' is-active' : ''}`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {/* Two stacked copies: the label slides up and the hover copy
                      slides in behind it as the accent sweep fills the pill. */}
                  <span className="ow-header__label-stack">
                    <span className="ow-header__label">{item.label}</span>
                    <span className="ow-header__label ow-header__label--hover" aria-hidden="true">
                      {item.label}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ow-header__actions">
          <ThemeToggle className="ow-header__theme" />
          <LanguageFlagMenu />
          <DrawerMenu
            hashLink={hashLink}
            peopleLink={peopleLink}
            orgHref={structureLink()}
            currentPage="work"
          />
        </div>
      </div>
    </header>
  )
}

export default memo(Header)
