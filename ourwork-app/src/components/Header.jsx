import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import LanguageFlagMenu from '@icue/i18n/LanguageFlagMenu'
import { withLocale } from '@icue/site-routes/mainSitePaths.js'
import ThemeToggle from './ThemeToggle'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'
import { useMainSite } from '../hooks/useMainSite'
import { useScrolled } from '../hooks/useScrolled'
import './Header.css'

const SELF_HREF = import.meta.env.BASE_URL
const LOGO_MARK = `${import.meta.env.BASE_URL}favicon.png`

function Header() {
  const { t, i18n } = useTranslation()
  const { base, hashLink, peopleLink, structureLink, newsroomHref } = useMainSite()
  const scrolled = useScrolled()
  const selfHref = withLocale(SELF_HREF, i18n.resolvedLanguage || i18n.language)

  // The main site's pill nav, same six destinations in the same order. This app
  // *is* the Our Work page, so that pill is the active one and links to itself.
  const items = [
    { key: 'home', href: hashLink('Home'), label: t('nav.home') },
    { key: 'org', href: structureLink(), label: t('nav.org') },
    { key: 'work', href: selfHref, label: t('nav.work'), active: true },
    { key: 'projects', href: hashLink('pastProjects'), label: t('nav.projects') },
    { key: 'news', href: newsroomHref, label: t('nav.news') },
    { key: 'about', href: hashLink('aboutUs'), label: t('nav.about') },
  ]

  return (
    /* `is-top` is the expanded state: at scroll zero the bar runs the full width
       of the viewport and the three groups sit at the far edges. Scrolling
       contracts it back into the floating pill cluster, which then stays put —
       see Header.css for how the two states interpolate. */
    <header className={`ow-header${scrolled ? '' : ' is-top'}`}>
      <div className="ow-header__bar">
        <a href={base} className="ow-header__logo" aria-label={t('nav.mainAria')}>
          <img src={LOGO_MARK} alt="" aria-hidden="true" decoding="async" />
          <span className="ow-header__brand">ICUE</span>
          <span className="ow-header__tag">{t('brandBadge')}</span>
        </a>

        <span className="ow-header__spacer" aria-hidden="true" />

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

        <span className="ow-header__spacer" aria-hidden="true" />

        <div className="ow-header__actions">
          <ThemeToggle className="ow-header__theme" />
          <LanguageFlagMenu
            languages={SUPPORTED_LANGUAGES}
            value={i18n.resolvedLanguage || i18n.language}
            onChange={(code) => i18n.changeLanguage(code)}
            ariaLabel={t('language')}
          />
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
