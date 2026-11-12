import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { DrawerMenu } from '@icue/drawer-menu'
import HeaderMenu from './HeaderMenu'
import { LightRays } from './magicui/LightRays'
import { useMainSite } from '../hooks/useMainSite'
import './Header.css'
import AppSwitcher from '../../../shared/app-switcher/AppSwitcher.jsx'
import RubberSegment from '../../../shared/ui/RubberSegment.jsx'

function Header({ pageTheme }) {
  const { t, i18n } = useTranslation()
  const { base, hashLink, peopleLink, structureLink } = useMainSite()

  return (
    <header className="structure-site-header">
      <LightRays
        className="structure-site-header__rays"
        count={6}
        color="rgba(54, 138, 223, 0.42)"
        blur={28}
        speed={16}
        length="120px"
      />
      <div className="structure-site-header__inner icue-container">
        <DrawerMenu
          hashLink={hashLink}
          peopleLink={peopleLink}
          orgHref={structureLink()}
          currentPage="org"
          drawerClassName="nav-drawer--fade-close"
          headerAboveDrawer
        />

        <a href={base} className="structure-site-header__brand" aria-label={t('nav.mainAria')}>
          <span className="structure-site-header__logo">ICUE</span>
          <span className="structure-site-header__tag">{t('brandBadge')}</span>
        </a>

        <nav className="structure-site-header__nav" aria-label={t('nav.mainNav')}>
          <AppSwitcher currentApp="website" locale={i18n.resolvedLanguage || i18n.language} appearance={pageTheme.isDark ? 'dark' : 'light'} compact />
          <RubberSegment className="structure-site-header__segments" role="navigation" aria-label={t('nav.mainNav')} size="sm" value={null} equalSlots={false}
            items={[{ value: 'home', label: t('nav.home'), href: hashLink('Home') }, { value: 'people', label: t('nav.people'), href: peopleLink('experts') }]} />
          <HeaderMenu pageTheme={pageTheme} />
        </nav>
      </div>
    </header>
  )
}

export default memo(Header)
